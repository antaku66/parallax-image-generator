// グローバル状態管理

import { create } from "zustand";
import type { AppState, ProcessedImage, ProcessingStep, QualityMode } from "../types";

export const useAppStore = create<AppState>((set) => ({
  // 初期状態
  originalImage: null,
  processingStep: "idle",
  processingProgress: 0,
  error: null,
  parallaxIntensity: 0.5,
  qualityMode: "balanced",

  // アクション
  setOriginalImage: (image: ProcessedImage) =>
    set({
      originalImage: image,
      processingStep: "idle",
      processingProgress: 0,
      error: null,
    }),

  updateProcessingState: (step: ProcessingStep, progress: number) =>
    set({
      processingStep: step,
      processingProgress: progress,
    }),

  setError: (error: Error | null) =>
    set({
      error,
      processingStep: error ? "error" : "idle",
    }),

  setParallaxIntensity: (value: number) =>
    set({ parallaxIntensity: value }),

  setQualityMode: (mode: QualityMode) =>
    set({ qualityMode: mode }),

  reset: () =>
    set({
      originalImage: null,
      processingStep: "idle",
      processingProgress: 0,
      error: null,
    }),
}));
