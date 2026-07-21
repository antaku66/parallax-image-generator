// MODNet 等の ONNX 前景セグメンタ（実装ガイド PR4）。OnnxDepthEstimator と同型。
// セッション管理・バックエンド解決・モデル取得は深度側の実装を再利用する。

import * as ort from "onnxruntime-web/webgpu";
import type {
  ForegroundMask,
  ForegroundSegmenter,
  ForegroundSegmenterLoadOptions,
  OnnxBackend,
} from "../../types";
import { SEG_MODELS, segModelUrl } from "../../constants/models";
import { createSession } from "../depth/resolveOnnxBackend";
import { fetchModelBytesFromUrl } from "../depth/modelManifest";
import { segInputToTensor, segOutputToMask } from "./segTensorIO";

export class OnnxForegroundSegmenter implements ForegroundSegmenter {
  private session: ort.InferenceSession | null = null;
  private inputSide = 512;
  private normalization = { mean: 0.5, std: 0.5 };
  backend: OnnxBackend | null = null;

  async load(options: ForegroundSegmenterLoadOptions): Promise<void> {
    const meta = SEG_MODELS[options.model];
    this.inputSide = meta.inputSide;
    this.normalization = meta.normalization;
    const bytes = await fetchModelBytesFromUrl(
      segModelUrl(options.model),
      meta.sizeBytes,
      options.onDownloadProgress
    );
    const { session, backend } = await createSession(bytes);
    this.session = session;
    this.backend = backend;
  }

  async predict(input: ImageBitmap): Promise<ForegroundMask> {
    if (!this.session) throw new Error("セグメンテーションモデルが読み込まれていません");
    const tensor = segInputToTensor(input, this.inputSide, this.normalization);
    // 単一入出力モデルのためセッションの実名を使う（ONNX 変換個体差の IO 名に依存しない）
    const feeds: Record<string, ort.Tensor> = { [this.session.inputNames[0]]: tensor };
    const results = await this.session.run(feeds);
    return segOutputToMask(results[this.session.outputNames[0]]);
  }

  dispose(): void {
    void this.session?.release();
    this.session = null;
    this.backend = null;
  }
}
