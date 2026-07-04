// ランタイム空間シーン資産（実装ガイド §7）。保存形式は serialized.ts に分離。

import type { DepthMap, ModelName, OnnxBackend } from "./depth";

/** 元画像（表示用テクスチャ源）。推論用画像は Worker 内で使い捨て、資産には残さない。 */
export type SourceImageAsset = {
  imageHash: string;
  originalWidth: number;
  originalHeight: number;
  /** 表示解像度のテクスチャ源（ランタイムのみ, 保存時は Blob 化） */
  display: ImageBitmap;
  displayWidth: number;
  displayHeight: number;
  mime: string;
};

/** 2.5D メッシュ（実装ガイド §16）。z は depth（近い=+）由来。 */
export type SceneMesh = {
  positions: Float32Array; // xyz * vertexCount
  uvs: Float32Array; // uv * vertexCount
  indices: Uint32Array; // カリング後の三角形インデックス
  gridX: number;
  gridY: number;
  vertexCount: number;
  triangleCount: number;
};

/** 深度スラブ 1 枚分のレイヤー（実装ガイド §13/§14/§18） */
export type SceneLayer = {
  id: string;
  /** [far, near] の深度スラブ（[0,1]） */
  depthRange: [number, number];
  /** アルファ付き RGBA（inpaint/dilation 後） */
  texture: ImageBitmap;
  mesh?: SceneMesh;
  parallax: number;
};

export type SceneMetadata = {
  createdAt: number;
  model: ModelName;
  modelVersion: string;
  processingVersion: string;
  backend: OnnxBackend;
  /** 推論に用いた辺長 */
  depthSide: number;
  pipeline: {
    gridX: number;
    gridY: number;
    depthScale: number;
  };
  durationMs?: number;
};

/** ランタイム空間シーン資産（アーキテクチャの中心, 実装ガイド §5/§7/§26） */
export type SpatialSceneAsset = {
  version: number;
  source: SourceImageAsset;
  depthMap: DepthMap;
  layers: SceneLayer[];
  metadata: SceneMetadata;
};
