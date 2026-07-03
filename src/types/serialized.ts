// IndexedDB 保存用のミラー型（実装ガイド §7/§21）。ランタイム型とは分離する。
// 深度は原則 uint8/uint16 に量子化。ImageBitmap は encoded Blob に変換して保持。

import type { SceneMetadata } from "./asset";

export type SerializedDepthMap = {
  kind: "uint8" | "uint16";
  width: number;
  height: number;
  buffer: ArrayBuffer;
};

export type SerializedSourceImageAsset = {
  imageHash: string;
  originalWidth: number;
  originalHeight: number;
  displayWidth: number;
  displayHeight: number;
  mime: string;
  /** encoded 表示画像（webp/jpeg 等） */
  displayBlob: Blob;
};

export type SerializedSceneMesh = {
  positions: ArrayBuffer;
  uvs: ArrayBuffer;
  indices: ArrayBuffer;
  gridX: number;
  gridY: number;
  vertexCount: number;
  triangleCount: number;
};

export type SerializedSceneLayer = {
  id: string;
  depthRange: [number, number];
  textureBlob: Blob;
  mesh?: SerializedSceneMesh;
  parallax: number;
};

export type SerializedSpatialSceneAsset = {
  version: number;
  source: SerializedSourceImageAsset;
  depthMap: SerializedDepthMap;
  layers: SerializedSceneLayer[];
  metadata: SceneMetadata;
};
