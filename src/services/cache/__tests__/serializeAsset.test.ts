import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SpatialSceneAsset } from "../../../types";

// serialize/deserialize の画像経路は OffscreenCanvas / createImageBitmap を要し
// node 環境では動かないため、DOM 依存部分だけをモックし、layer mesh・depth・source の
// 数値往復（実装ガイド §25 の serialize / deserialize テスト）を検証する。
vi.mock("../../image/canvas", () => ({
  encodeBitmap: vi.fn(async () => new Blob(["webp"], { type: "image/webp" })),
}));

import { serializeAsset } from "../serializeAsset";
import { deserializeAsset } from "../deserializeAsset";

beforeEach(() => {
  // deserializeAsset 内の createImageBitmap(displayBlob / textureBlob) をスタブ
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(
      async () =>
        ({ width: 8, height: 8, close() {} }) as unknown as ImageBitmap
    )
  );
});

function makeAsset(): SpatialSceneAsset {
  const display = { width: 8, height: 8, close() {} } as unknown as ImageBitmap;
  return {
    version: 2,
    source: {
      imageHash: "hash-abc",
      originalWidth: 1600,
      originalHeight: 1200,
      display,
      displayWidth: 800,
      displayHeight: 600,
      mime: "image/webp",
    },
    // 0=far / 1=near の向きが往復後も保たれることを確認する値
    depthMap: {
      kind: "float32",
      width: 2,
      height: 2,
      data: Float32Array.from([0, 0.25, 0.5, 1]),
    },
    layers: [
      {
        id: "bg",
        depthRange: [0, 0.5],
        texture: display,
        mesh: {
          positions: Float32Array.from([0, 0, 0, 1, 0, 0.5, 0.5, 0.5, 0.25]),
          uvs: Float32Array.from([0, 0, 1, 0, 0.5, 1]),
          indices: Uint32Array.from([0, 1, 2]),
          gridX: 2,
          gridY: 2,
          vertexCount: 3,
          triangleCount: 1,
        },
        parallax: 1,
      },
    ],
    metadata: {
      createdAt: 0,
      model: "depth-anything-v2-base",
      modelVersion: "v2-base-q",
      processingVersion: "v1",
      backend: "wasm",
      depthSide: 512,
      pipeline: {
        gridX: 2,
        gridY: 2,
        depthScale: 0.16,
      },
    },
  };
}

describe("serialize / deserialize (実装ガイド §25)", () => {
  it("保存形式は深度を uint16 に量子化し、layer mesh は ArrayBuffer で保持する", async () => {
    const s = await serializeAsset(makeAsset());
    expect(s.depthMap.kind).toBe("uint16");
    expect(s.depthMap.buffer).toBeInstanceOf(ArrayBuffer);
    expect(s.layers[0].mesh?.positions).toBeInstanceOf(ArrayBuffer);
    expect(s.layers[0].mesh?.indices).toBeInstanceOf(ArrayBuffer);
  });

  it("serialize → deserialize で depth が向きを保ったまま往復する", async () => {
    const asset = makeAsset();
    const round = await deserializeAsset(await serializeAsset(asset));

    expect(round.depthMap.kind).toBe("float32");
    expect(round.depthMap.width).toBe(2);
    expect(round.depthMap.height).toBe(2);
    for (let i = 0; i < asset.depthMap.data.length; i++) {
      expect(round.depthMap.data[i]).toBeCloseTo(asset.depthMap.data[i], 3);
    }
  });

  it("serialize → deserialize で layer mesh の頂点/UV/index が値保持で復元する", async () => {
    const asset = makeAsset();
    const round = await deserializeAsset(await serializeAsset(asset));

    const srcMesh = asset.layers[0].mesh!;
    const roundMesh = round.layers[0].mesh!;
    expect(roundMesh.positions).toBeInstanceOf(Float32Array);
    expect(roundMesh.indices).toBeInstanceOf(Uint32Array);
    expect(Array.from(roundMesh.positions)).toEqual(Array.from(srcMesh.positions));
    expect(Array.from(roundMesh.uvs)).toEqual(Array.from(srcMesh.uvs));
    expect(Array.from(roundMesh.indices)).toEqual(Array.from(srcMesh.indices));
    expect(roundMesh.vertexCount).toBe(3);
    expect(roundMesh.triangleCount).toBe(1);
  });

  it("serialize → deserialize で source メタと version/metadata が保持される", async () => {
    const asset = makeAsset();
    const round = await deserializeAsset(await serializeAsset(asset));

    expect(round.version).toBe(2);
    expect(round.source.imageHash).toBe("hash-abc");
    expect(round.source.originalWidth).toBe(1600);
    expect(round.source.originalHeight).toBe(1200);
    expect(round.source.displayWidth).toBe(800);
    expect(round.source.displayHeight).toBe(600);
    expect(round.source.mime).toBe("image/webp");
    expect(round.metadata.model).toBe("depth-anything-v2-base");
    expect(round.metadata.backend).toBe("wasm");
  });
});
