// Three.js リソースのユーティリティと破棄ヘルパ（MD §5, §23.11）
// GPU リソースは GC されないため、差し替え・破棄時に必ず dispose する。

import * as THREE from "three";
import type { SceneMesh } from "../../types";

/**
 * ImageBitmap から sRGB テクスチャを生成（uv 原点は左上に合わせ flipY=false）。
 * 縮小表示時のシャギー/モアレを防ぐためミップマップ + 異方性フィルタを有効化する
 * （WebGL2 なので NPOT でもミップ生成可）。
 */
export function textureFromBitmap(bitmap: ImageBitmap, anisotropy = 1): THREE.Texture {
  const texture = new THREE.Texture(bitmap);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** SceneMesh から BufferGeometry を構築（Uint32 index は WebGL2 で有効） */
export function geometryFromSceneMesh(mesh: SceneMesh): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(mesh.uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

/** メッシュ（geometry + material + texture）を破棄する */
export function disposeMesh(mesh: THREE.Mesh | null): void {
  if (!mesh) return;
  mesh.geometry.dispose();
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) {
    const map = (material as THREE.MeshBasicMaterial).map;
    if (map) map.dispose();
    material.dispose();
  }
  mesh.parent?.remove(mesh);
}
