// マスク付き push-pull インペイント（Gortler らの pull-push 法）。
// 未知画素（known=0）を既知周辺の重み付き補間で滑らかに埋める。
// 前景を取り除いた背景の穴埋めに使用。channels 指定で色(3/4)・深度(1)兼用。

type Level = { w: number; h: number; col: Float32Array; a: Float32Array };

// coarse を実数座標 (fx,fy) で双線形サンプルして out に書く
function bilinearAt(
  col: Float32Array,
  w: number,
  h: number,
  ch: number,
  fx: number,
  fy: number,
  out: Float32Array
): void {
  const x = Math.min(w - 1, Math.max(0, fx));
  const y = Math.min(h - 1, Math.max(0, fy));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  for (let c = 0; c < ch; c++) {
    const a = col[(y0 * w + x0) * ch + c];
    const b = col[(y0 * w + x1) * ch + c];
    const cc = col[(y1 * w + x0) * ch + c];
    const d = col[(y1 * w + x1) * ch + c];
    const top = a + (b - a) * tx;
    const bot = cc + (d - cc) * tx;
    out[c] = top + (bot - top) * ty;
  }
}

export function pushPullInpaint(
  data: Float32Array,
  known: Float32Array, // 1=既知, 0=穴（要素数 = width*height）
  width: number,
  height: number,
  channels: number
): Float32Array {
  const levels: Level[] = [];

  // level 0: 既知画素のみ色を持たせ、a を被覆率(0/1)とする
  {
    const col = new Float32Array(data.length);
    const a = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      a[i] = known[i] > 0.5 ? 1 : 0;
      if (a[i]) for (let c = 0; c < channels; c++) col[i * channels + c] = data[i * channels + c];
    }
    levels.push({ w: width, h: height, col, a });
  }

  // pull: 2x2 平均で縮小し、被覆率 a と正規化色を積み上げる
  const acc = new Float32Array(channels);
  while (levels[levels.length - 1].w > 1 || levels[levels.length - 1].h > 1) {
    const f = levels[levels.length - 1];
    const w = Math.max(1, Math.ceil(f.w / 2));
    const h = Math.max(1, Math.ceil(f.h / 2));
    const col = new Float32Array(w * h * channels);
    const a = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        acc.fill(0);
        let wsum = 0;
        let cnt = 0;
        for (let dy = 0; dy < 2; dy++) {
          const fy = y * 2 + dy;
          if (fy >= f.h) continue;
          for (let dx = 0; dx < 2; dx++) {
            const fx = x * 2 + dx;
            if (fx >= f.w) continue;
            const fi = fy * f.w + fx;
            cnt++;
            const wa = f.a[fi];
            if (wa > 0) {
              wsum += wa;
              for (let c = 0; c < channels; c++) acc[c] += wa * f.col[fi * channels + c];
            }
          }
        }
        const ci = y * w + x;
        a[ci] = cnt > 0 ? wsum / cnt : 0;
        if (wsum > 0) for (let c = 0; c < channels; c++) col[ci * channels + c] = acc[c] / wsum;
      }
    }
    levels.push({ w, h, col, a });
  }

  // push: 粗→細で、未知/部分被覆の画素を粗レベルの色で補完する
  const tmp = new Float32Array(channels);
  for (let l = levels.length - 2; l >= 0; l--) {
    const fine = levels[l];
    const coarse = levels[l + 1];
    for (let y = 0; y < fine.h; y++) {
      for (let x = 0; x < fine.w; x++) {
        const i = y * fine.w + x;
        const af = fine.a[i];
        if (af >= 1) continue; // 完全既知はそのまま残す
        bilinearAt(coarse.col, coarse.w, coarse.h, channels, x / 2, y / 2, tmp);
        for (let c = 0; c < channels; c++) {
          fine.col[i * channels + c] = af * fine.col[i * channels + c] + (1 - af) * tmp[c];
        }
        fine.a[i] = 1;
      }
    }
  }

  return levels[0].col;
}
