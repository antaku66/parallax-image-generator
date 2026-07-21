// マスク/単一チャンネルマップのユーティリティ（インペイント前処理用）。

/** 双線形で単一チャンネル [0,1] マップを (dw,dh) へ拡大縮小する */
export function upsampleBilinear(
  src: Float32Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number
): Float32Array {
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const fy = dh > 1 ? (y * (sh - 1)) / (dh - 1) : 0;
    const y0 = Math.floor(fy);
    const y1 = Math.min(sh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = dw > 1 ? (x * (sw - 1)) / (dw - 1) : 0;
      const x0 = Math.floor(fx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const tx = fx - x0;
      const a = src[y0 * sw + x0];
      const b = src[y0 * sw + x1];
      const c = src[y1 * sw + x0];
      const d = src[y1 * sw + x1];
      const top = a + (b - a) * tx;
      const bot = c + (d - c) * tx;
      out[y * dw + x] = top + (bot - top) * ty;
    }
  }
  return out;
}

/**
 * 最大値プーリングで 2 値マスクを (dw,dh) へ縮小する。
 * src 側の 1 画素でも掛かる出力画素は必ず 1 になる（縮小してもマスク領域を取りこぼさない被覆保証）。
 */
export function downsampleMax(
  src: Float32Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number
): Float32Array {
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < sh; y++) {
    const dy = Math.min(dh - 1, Math.floor((y * dh) / sh));
    for (let x = 0; x < sw; x++) {
      if (src[y * sw + x] > 0.5) {
        const dx = Math.min(dw - 1, Math.floor((x * dw) / sw));
        out[dy * dw + dx] = 1;
      }
    }
  }
  return out;
}

/** 最小値フィルタ（収縮）。半径 r の分離型。境界はクランプ。前景アルファのチョークに使う。 */
export function erodeMin(mask: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return mask;
  const tmp = new Float32Array(mask.length);
  const out = new Float32Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 1;
      for (let k = -r; k <= r; k++) {
        const sx = Math.min(w - 1, Math.max(0, x + k));
        const v = mask[y * w + sx];
        if (v < m) m = v;
      }
      tmp[y * w + x] = m;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 1;
      for (let k = -r; k <= r; k++) {
        const sy = Math.min(h - 1, Math.max(0, y + k));
        const v = tmp[sy * w + x];
        if (v < m) m = v;
      }
      out[y * w + x] = m;
    }
  }
  return out;
}

/** 最大値フィルタ（膨張）。半径 r の分離型。境界はクランプ。前景マスクの拡張に使う。 */
export function dilateMax(mask: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return mask;
  const tmp = new Float32Array(mask.length);
  const out = new Float32Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = -r; k <= r; k++) {
        const sx = Math.min(w - 1, Math.max(0, x + k));
        const v = mask[y * w + sx];
        if (v > m) m = v;
      }
      tmp[y * w + x] = m;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 0;
      for (let k = -r; k <= r; k++) {
        const sy = Math.min(h - 1, Math.max(0, y + k));
        const v = tmp[sy * w + x];
        if (v > m) m = v;
      }
      out[y * w + x] = m;
    }
  }
  return out;
}
