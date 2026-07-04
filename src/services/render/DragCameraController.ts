// ドラッグ視点操作（MD §16 / Scene.dc.html）。Pointer Events で統一、ジャイロ不使用。

import * as THREE from "three";
import { clamp } from "../../utils/clamp";

export type DragCameraOptions = {
  maxOffset: number;
  smoothing: number;
};

export class DragCameraController {
  private el: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private maxOffset: number;
  private smoothing: number;

  private target = { x: 0, y: 0 };
  private cur = { x: 0, y: 0 };
  private dragging = false;
  /** ドラッグ中のポインタ。マルチタッチの 2 本目以降は無視する */
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private baseX = 0;
  private baseY = 0;

  constructor(el: HTMLElement, camera: THREE.PerspectiveCamera, options: DragCameraOptions) {
    this.el = el;
    this.camera = camera;
    this.maxOffset = options.maxOffset;
    this.smoothing = options.smoothing;
  }

  attach(): void {
    this.el.addEventListener("pointerdown", this.onDown);
    this.el.addEventListener("pointermove", this.onMove);
    this.el.addEventListener("pointerup", this.onUp);
    this.el.addEventListener("pointercancel", this.onUp);
    this.el.style.touchAction = "none";
    this.el.style.cursor = "grab";
  }

  detach(): void {
    this.el.removeEventListener("pointerdown", this.onDown);
    this.el.removeEventListener("pointermove", this.onMove);
    this.el.removeEventListener("pointerup", this.onUp);
    this.el.removeEventListener("pointercancel", this.onUp);
  }

  setMaxOffset(v: number): void {
    this.maxOffset = v;
  }
  setSmoothing(v: number): void {
    this.smoothing = v;
  }

  /** 目標オフセットを直接設定（Reset は 0,0） */
  setTarget(x: number, y: number): void {
    this.target.x = clamp(x, -1, 1);
    this.target.y = clamp(y, -1, 1);
  }

  private onDown = (e: PointerEvent) => {
    // ドラッグ中の別ポインタ（2 本目の指）と右/中ボタンは無視する
    if (this.pointerId !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    this.pointerId = e.pointerId;
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.baseX = this.target.x;
    this.baseY = this.target.y;
    this.el.style.cursor = "grabbing";
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      // 一部環境で失敗しても致命的でない
    }
  };

  private onMove = (e: PointerEvent) => {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    this.target.x = clamp(this.baseX + (e.clientX - this.startX) / (w * 0.5), -1, 1);
    this.target.y = clamp(this.baseY + (e.clientY - this.startY) / (h * 0.5), -1, 1);
  };

  private onUp = (e: PointerEvent) => {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.dragging = false;
    this.el.style.cursor = "grab";
    // release 後は中心へイージングで戻す（MD §16）
    this.target.x = 0;
    this.target.y = 0;
  };

  /** 毎フレーム呼ぶ。カメラを平行移動し、z=0 の画像面を画面に固定する。 */
  update(): { offsetX: number; offsetY: number } {
    this.cur.x += (this.target.x - this.cur.x) * this.smoothing;
    this.cur.y += (this.target.y - this.cur.y) * this.smoothing;
    // Y は上方向を正にするため反転
    const ox = this.cur.x * this.maxOffset;
    const oy = -this.cur.y * this.maxOffset;
    this.camera.position.x = ox;
    this.camera.position.y = oy;
    this.applyOffAxisProjection(ox, oy);
    return { offsetX: this.cur.x, offsetY: this.cur.y };
  }

  // off-axis projection（head-tracked window 方式）。カメラは回転させず、
  // z=0 の窓（画像フレーム）が画面上で不動になる非対称視錐台を組む。
  // lookAt 回転による台形歪みと「絵全体が泳ぐ」印象を避け、視差を純粋な奥行きとして見せる。
  private applyOffAxisProjection(ox: number, oy: number): void {
    const cam = this.camera;
    const d = cam.position.z;
    const n = cam.near;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * d;
    const halfW = halfH * cam.aspect;
    const s = n / d;
    cam.projectionMatrix.makePerspective(
      (-halfW - ox) * s,
      (halfW - ox) * s,
      (halfH - oy) * s,
      (-halfH - oy) * s,
      n,
      cam.far
    );
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  }
}
