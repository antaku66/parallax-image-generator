// Layered レンダラー（実装ガイド §18）: 深度メッシュを複数層で描画する。
//   背景層 = 前景を除去しインペイント済みの不透明メッシュ（外周ガターはメッシュ位置に焼き込み済み）
//   前景層 = 被写体の切り抜き（アルファ付き）
// 背景が完全なため、前景がずれても遮蔽の穴が出ない。視差は Z 差から自然に生じる。

import * as THREE from "three";
import type {
  CameraState,
  RendererParameters,
  SpatialSceneAsset,
  SpatialSceneRenderer,
} from "../../types";
import { CAMERA_DEFAULTS } from "../../constants/camera";
import { MAX_DPR_DESKTOP, MAX_DPR_MOBILE } from "../../constants/layout";
import { isMobileUA } from "../device/webgpuDetection";
import { createLayerMaterial } from "./materials/layerMaterial";
import { DragCameraController } from "./DragCameraController";
import { disposeMesh, geometryFromSceneMesh, textureFromBitmap } from "./threeResources";

const FOV = 35;
const DEPTH_BASELINE = 0.55;
const PARALLAX_BASELINE = 0.6;

type LayerMesh = { mesh: THREE.Mesh; parallax: number };

export class LayeredRenderer implements SpatialSceneRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);
  private controller: DragCameraController | null = null;
  private layers: LayerMesh[] = [];
  private rafId = 0;
  private imageAspect = 1;
  private params: RendererParameters = {
    depthScale: DEPTH_BASELINE,
    parallaxStrength: PARALLAX_BASELINE,
    edgeCutThreshold: 0.18,
  };

  private get camZ(): number {
    return 0.5 / Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
  }

  private dpr(): number {
    const cap = isMobileUA() ? MAX_DPR_MOBILE : MAX_DPR_DESKTOP;
    return Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, cap);
  }

  mount(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(this.dpr());
    // カメラは回転させない（視差は DragCameraController の off-axis 射影で表現）
    this.camera.position.set(0, 0, this.camZ);
    this.controller = new DragCameraController(canvas, this.camera, {
      maxOffset: CAMERA_DEFAULTS.maxOffset,
      smoothing: CAMERA_DEFAULTS.smoothing,
    });
    this.controller.attach();
    this.loop();
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
  };

  private loop = () => {
    try {
      this.controller?.update();
      this.renderer?.render(this.scene, this.camera);
    } catch {
      // 一時的な描画失敗（コンテキスト消失等）は無視して次フレームへ
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  async setAsset(asset: SpatialSceneAsset): Promise<void> {
    this.disposeContents();
    const layers = asset.layers;
    if (!layers.length) return;

    this.imageAspect = asset.source.displayWidth / asset.source.displayHeight;
    const anisotropy = this.renderer
      ? Math.min(8, this.renderer.capabilities.getMaxAnisotropy())
      : 1;
    layers.forEach((layer, i) => {
      if (!layer.mesh) return;
      const geometry = geometryFromSceneMesh(layer.mesh);
      const texture = textureFromBitmap(layer.texture, anisotropy);
      // 先頭（背景）は不透明、以降（前景）はアルファ付き
      const mesh = new THREE.Mesh(geometry, createLayerMaterial(texture, i > 0));
      mesh.renderOrder = i;
      this.scene.add(mesh);
      this.layers.push({ mesh, parallax: layer.parallax });
    });

    this.layout();
    this.applyParams();
  }

  private layout(): void {
    for (const { mesh } of this.layers) {
      mesh.scale.x = this.imageAspect;
      mesh.scale.y = 1;
    }
  }

  private applyParams(): void {
    for (const { mesh, parallax } of this.layers) {
      mesh.scale.z = (this.params.depthScale / DEPTH_BASELINE) * parallax;
    }
    this.controller?.setMaxOffset(
      CAMERA_DEFAULTS.maxOffset * (this.params.parallaxStrength / PARALLAX_BASELINE)
    );
  }

  setParameters(params: RendererParameters): void {
    this.params = params;
    this.applyParams();
  }

  setCamera(camera: CameraState): void {
    this.controller?.setTarget(camera.offsetX, camera.offsetY);
  }

  resize(width: number, height: number): void {
    if (!this.renderer) return;
    this.renderer.setPixelRatio(this.dpr());
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer?.render(this.scene, this.camera);
  }

  private disposeContents(): void {
    for (const { mesh } of this.layers) disposeMesh(mesh);
    this.layers = [];
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.controller?.detach();
    this.controller = null;
    this.disposeContents();
    if (this.renderer) {
      this.renderer.domElement.removeEventListener("webglcontextlost", this.onContextLost);
      // canvas は React が所有・再利用するため forceContextLoss しない（コンテキストは残す）
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
