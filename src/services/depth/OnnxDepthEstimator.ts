// Depth Anything V2 の ONNX 実装（MD §9）

import * as ort from "onnxruntime-web/webgpu";
import type {
  DepthEstimator,
  DepthEstimatorLoadOptions,
  FloatDepthMap,
  OnnxBackend,
} from "../../types";
import { DEPTH_MODEL_IO, MODELS } from "../../constants/models";
import { createSession } from "./resolveOnnxBackend";
import { fetchModelBytes } from "./modelManifest";
import { inputToTensor, outputToDepthMap, snapToPatch } from "./tensorIO";

export class OnnxDepthEstimator implements DepthEstimator {
  private session: ort.InferenceSession | null = null;
  /** 推論長辺の上限。実寸法は入力のアスペクト比を保って tensorIO 側で決まる。 */
  private inputSide = 518;
  backend: OnnxBackend | null = null;

  async load(options: DepthEstimatorLoadOptions): Promise<void> {
    this.inputSide = snapToPatch(options.inputSide ?? MODELS[options.model].inputSide);
    const bytes = await fetchModelBytes(options.model, options.onDownloadProgress);
    const { session, backend } = await createSession(bytes);
    this.session = session;
    this.backend = backend;
  }

  async predict(input: ImageBitmap | ImageData): Promise<FloatDepthMap> {
    if (!this.session) throw new Error("モデルが読み込まれていません");
    const tensor = await inputToTensor(input, this.inputSide);
    const feeds: Record<string, ort.Tensor> = {
      [DEPTH_MODEL_IO.inputName]: tensor,
    };
    const results = await this.session.run(feeds);
    const output =
      results[DEPTH_MODEL_IO.outputName] ?? results[Object.keys(results)[0]];
    return outputToDepthMap(output);
  }

  dispose(): void {
    void this.session?.release();
    this.session = null;
    this.backend = null;
  }
}
