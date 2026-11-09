// Slipscanner image logic: find the slip's corners, straighten it, clean it up, and write a PDF. No libraries.
// Pure functions on plain arrays, so _build/test_logic.js can test them in Node.
(function (root) {
  'use strict';

  // RGBA -> grey (0-255), 3x3 box blur to kill text and paper grain before thresholding.
  function grey(rgba, w, h) {
    const g = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = 0.299 * rgba[4 * i] + 0.587 * rgba[4 * i + 1] + 0.114 * rgba[4 * i + 2];
    const b = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx; if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue; s += g[yy * w + xx]; n++;
      }
      b[y * w + x] = s / n;
    }
    return b;
  }

  function otsu(g) {
    const hist = new Float64Array(256); for (const v of g) hist[Math.min(255, v | 0)]++;
    const n = g.length; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sB = 0, wB = 0, best = 0, t = 128;
    for (let i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue; const wF = n - wB; if (!wF) break;
      sB += i * hist[i]; const d = sB / wB - (sum - sB) / wF, v = wB * wF * d * d;
      if (v > best) { best = v; t = i; }
    }
    return t;
  }

  // Largest 4-connected region of mask; returns its pixel indices.
  function largest(mask, w, h) {
    const seen = new Uint8Array(w * h), q = new Int32Array(w * h); let best = null;
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || seen[s]) continue;
      let head = 0, tail = 0; q[tail++] = s; seen[s] = 1;
      while (head < tail) {
        const p = q[head++], x = p % w;
        const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w];
        for (const k of nb) if (k >= 0 && k < w * h && mask[k] && !seen[k]) { seen[k] = 1; q[tail++] = k; }
      }
      if (!best || tail > best.length) best = q.slice(0, tail);
    }
    return best || new Int32Array(0);
  }

  // Corners [TL, TR, BR, BL] of the slip in a (small) RGBA image, or null if nothing slip-like stands out.
  // Paper is usually brighter than the table; if not, the darker region is tried.
  function detectQuad(rgba, w, h) {
    const g = grey(rgba, w, h), t = otsu(g);
    for (const bright of [true, false]) {
      const mask = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) mask[i] = bright ? g[i] > t : g[i] <= t;
      const reg = largest(mask, w, h), frac = reg.length / (w * h);
      if (frac < 0.08 || frac > 0.95) continue;
      let tl, tr, br, bl, a = Infinity, b = -Infinity, c = -Infinity, d = Infinity;
      for (const p of reg) {
        const x = p % w, y = (p / w) | 0;
        if (x + y < a) { a = x + y; tl = [x, y]; }
        if (x + y > b) { b = x + y; br = [x, y]; }
        if (x - y > c) { c = x - y; tr = [x, y]; }
        if (x - y < d) { d = x - y; bl = [x, y]; }
      }
      const quad = [tl, tr, br, bl];
      const ar = area(quad);
      if (ar < 0.06 * w * h || ar > 0.9 * w * h) continue;   // a sliver, or the table around the slip
      return quad;
    }
    return null;
  }

  function area(q) { let s = 0; for (let i = 0; i < 4; i++) { const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % 4]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  // Output size for a quad: the longer of each pair of opposite edges, scaled so the long side is at most maxLong.
  function outSize(q, maxLong) {
    let W = Math.max(dist(q[0], q[1]), dist(q[3], q[2])), H = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
    const k = Math.min(1, maxLong / Math.max(W, H)); return [Math.max(1, Math.round(W * k)), Math.max(1, Math.round(H * k))];
  }

  // 3x3 homography (row-major, h33 = 1) taking each from[i] to to[i].
  function homography(from, to) {
    const A = [], B = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = from[i], [u, v] = to[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
    }
    for (let c = 0; c < 8; c++) {                     // Gaussian elimination, partial pivoting
      let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
      if (Math.abs(A[c][c]) < 1e-12) throw new Error('corners are in a line');
      for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; }
    }
    return B.map((b, i) => b / A[i][i]).concat(1);
  }

  // Straighten: sample the source quad into a W x H image (bilinear).
  function warp(src, sw, sh, quad, W, H) {
    const m = homography([[0, 0], [W - 1, 0], [W - 1, H - 1], [0, H - 1]], quad), out = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const z = m[6] * x + m[7] * y + m[8], u = (m[0] * x + m[1] * y + m[2]) / z, v = (m[3] * x + m[4] * y + m[5]) / z;
      const x0 = Math.max(0, Math.min(sw - 2, Math.floor(u))), y0 = Math.max(0, Math.min(sh - 2, Math.floor(v)));
      const fx = Math.max(0, Math.min(1, u - x0)), fy = Math.max(0, Math.min(1, v - y0)), o = 4 * (y * W + x);
      for (let c = 0; c < 3; c++) {
        const i = 4 * (y0 * sw + x0) + c;
        out[o + c] = (src[i] * (1 - fx) + src[i + 4] * fx) * (1 - fy) + (src[i + 4 * sw] * (1 - fx) + src[i + 4 * sw + 4] * fx) * fy;
      }
      out[o + 3] = 255;
    }
    return out;
  }

  // Clean-up in place. 'bw': grey with the 2nd-98th percentile stretched to full range (faded till slips come back).
  // 'colour': the same stretch per channel, gentler.
  function enhance(px, mode) {
    const n = px.length / 4, hist = new Uint32Array(256), g = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) { g[i] = 0.299 * px[4 * i] + 0.587 * px[4 * i + 1] + 0.114 * px[4 * i + 2]; hist[g[i]]++; }
    const pct = f => { let s = 0; for (let i = 0; i < 256; i++) { s += hist[i]; if (s >= f * n) return i; } return 255; };
    const lo = pct(mode === 'bw' ? 0.02 : 0.01), hi = Math.max(lo + 1, pct(mode === 'bw' ? 0.6 : 0.99)); // bw: paper (most pixels) goes white
    const k = 255 / (hi - lo);
    for (let i = 0; i < n; i++) {
      if (mode === 'bw') { const v = (g[i] - lo) * k; px[4 * i] = px[4 * i + 1] = px[4 * i + 2] = v; }
      else for (let c = 0; c < 3; c++) px[4 * i + c] = (px[4 * i + c] - lo) * k;
    }
    return px;
  }

  // Minimal PDF: one JPEG per page, page width A4 (595 pt), height to the image's proportion.
  function makePdf(pages) {
    const enc = s => new TextEncoder().encode(s), parts = [], offs = [];
    let len = 0; const add = b => { parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; add(enc(n + ' 0 obj\n')); body.forEach(add); add(enc('\nendobj\n')); };
    add(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    const kids = pages.map((_, i) => (3 + 3 * i) + ' 0 R').join(' ');
    obj(1, [enc('<< /Type /Catalog /Pages 2 0 R >>')]);
    obj(2, [enc(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`)]);
    pages.forEach((p, i) => {
      const n = 3 + 3 * i, W = 595.28, H = +(W * p.h / p.w).toFixed(2);
      const cs = `q ${W} 0 0 ${H} 0 0 cm /Im Do Q`;
      obj(n, [enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`)]);
      obj(n + 1, [enc(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`)]);
      obj(n + 2, [enc(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`), p.jpeg, enc('\nendstream')]);
    });
    const count = 3 + 3 * pages.length, xref = len;
    let x = `xref\n0 ${count}\n0000000000 65535 f \n`;
    for (let i = 1; i < count; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
    add(enc(x + `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
    const out = new Uint8Array(len); let o = 0; for (const b of parts) { out.set(b, o); o += b.length; }
    return out;
  }

  const api = { grey, otsu, detectQuad, outSize, homography, warp, enhance, makePdf, area };
  if (typeof module !== 'undefined') module.exports = api; else root.Scan = api;
})(this);
