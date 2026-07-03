// レイヤー用マテリアル。背景は不透明、前景はアルファ付き（透過）。

import * as THREE from "three";

export function createLayerMaterial(
  texture: THREE.Texture,
  transparent: boolean
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent,
    // 前景の完全透明部（アルファ≈0）は破棄して深度書き込み・縁の滲みを避ける
    alphaTest: transparent ? 0.02 : 0,
    depthWrite: true,
  });
}
