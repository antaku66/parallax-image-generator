import { useEffect, useRef, type RefObject } from "react";
import { LayeredRenderer } from "../services/render/LayeredRenderer";
import { useAppStore } from "../store/store";
import type { SpatialSceneRenderer } from "../types";

/**
 * canvas にレンダラーをマウントし、asset/params/recenter をレンダラーへ橋渡しする。
 * アンマウント時に dispose して GPU リソースを解放（実装ガイド §5/§26.13）。
 * WebGL 生成や setAsset が失敗した場合は onError を呼び、呼び出し側が CSS フォールバックへ切替える。
 */
export function useRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onError?: () => void
): void {
  const asset = useAppStore((s) => s.asset);
  const params = useAppStore((s) => s.params);
  const recenterToken = useAppStore((s) => s.recenterToken);
  const rendererRef = useRef<SpatialSceneRenderer | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: SpatialSceneRenderer | null = null;
    let ro: ResizeObserver | null = null;
    try {
      renderer = new LayeredRenderer();
      renderer.mount(canvas);
      rendererRef.current = renderer;
      const resize = () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w && h) renderer!.resize(w, h);
      };
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
      resize();
    } catch {
      ro?.disconnect();
      renderer?.dispose();
      rendererRef.current = null;
      onErrorRef.current?.();
      return;
    }
    return () => {
      ro?.disconnect();
      renderer?.dispose();
      rendererRef.current = null;
    };
  }, [canvasRef]);

  useEffect(() => {
    if (rendererRef.current && asset?.layers?.length) {
      rendererRef.current.setAsset(asset).catch(() => onErrorRef.current?.());
    }
  }, [asset]);

  useEffect(() => {
    rendererRef.current?.setParameters(params);
  }, [params]);

  useEffect(() => {
    rendererRef.current?.setCamera({ offsetX: 0, offsetY: 0 });
  }, [recenterToken]);
}
