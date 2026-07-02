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
    if (!this.dragging) return;
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    this.target.x = clamp(this.baseX + (e.clientX - this.startX) / (w * 0.5), -1, 1);
    this.target.y = clamp(this.baseY + (e.clientY - this.startY) / (h * 0.5), -1, 1);
  };

  private onUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    this.el.style.cursor = "grab";
    // release 後は中心へイージングで戻す（MD §16）
    this.target.x = 0;
    this.target.y = 0;
  };

  /** 毎フレーム呼ぶ。カメラをオフセットさせ、中心を見続ける。 */
  update(): { offsetX: number; offsetY: number } {
    this.cur.x += (this.target.x - this.cur.x) * this.smoothing;
    this.cur.y += (this.target.y - this.cur.y) * this.smoothing;
    // Y は上方向を正にするため反転
    this.camera.position.x = this.cur.x * this.maxOffset;
    this.camera.position.y = -this.cur.y * this.maxOffset;
    this.camera.lookAt(0, 0, 0);
    return { offsetX: this.cur.x, offsetY: this.cur.y };
  }
}
