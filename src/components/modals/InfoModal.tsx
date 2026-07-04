import { useState } from "react";
import { Button } from "../ui/Button";
import { clearAllCaches } from "../../services/cache/clearCaches";

const FEATURES = [
  "1枚の画像から擬似的な空間シーンを生成（クライアント完結）",
  "Depth Anything V2 で深度推定 → 2.5D メッシュ + Three.js 描画",
  "ドラッグで視点移動（ジャイロ不使用）",
  "モデル未配置/推論失敗時は簡易表示へ自動フォールバック",
];

type ClearStatus = "idle" | "busy" | "done" | "error";

const CLEAR_LABELS: Record<ClearStatus, string> = {
  idle: "キャッシュを削除 Clear cache",
  busy: "削除中…",
  done: "削除しました ✓",
  error: "削除に失敗しました",
};

export function InfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [clearStatus, setClearStatus] = useState<ClearStatus>("idle");
  if (!open) return null;

  const close = () => {
    setClearStatus("idle");
    onClose();
  };
  const onClear = async () => {
    setClearStatus("busy");
    try {
      await clearAllCaches();
      setClearStatus("done");
    } catch {
      setClearStatus("error");
    }
  };

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,24,30,0.35)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          background: "#fff",
          borderRadius: 22,
          padding: "26px 28px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.05), 0 34px 80px -30px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: "linear-gradient(145deg,#0a84ff,#5e5ce6)",
            }}
          />
          <span style={{ font: "700 18px var(--font-display)" }}>Spatial</span>
          <span style={{ font: "500 13px var(--font-jp)", color: "#aeaeb2" }}>空間シーン</span>
        </div>
        <p style={{ font: "400 14px/1.7 var(--font-sans)", color: "#6e6e73", margin: "6px 0 14px" }}>
          アップロードした画像から深度を推定し、ドラッグで視点を動かせる空間シーンを作ります。処理はすべてブラウザ内で完結します。
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7 }}>
          {FEATURES.map((f) => (
            <li key={f} style={{ font: "400 13px/1.6 var(--font-sans)", color: "#1d1d1f" }}>
              {f}
            </li>
          ))}
        </ul>
        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <p style={{ font: "400 12px/1.6 var(--font-sans)", color: "#6e6e73", margin: 0 }}>
            保存済みシーン（IndexedDB）と深度モデル・アプリシェルのキャッシュ（Cache
            Storage）を削除します。
          </p>
          <Button
            variant="soft"
            onClick={onClear}
            disabled={clearStatus === "busy"}
            style={{ height: 34, padding: "0 14px", borderRadius: 9, fontSize: 12, flex: "none" }}
          >
            {CLEAR_LABELS[clearStatus]}
          </Button>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <Button variant="dark" onClick={close} style={{ height: 38, padding: "0 18px", borderRadius: 10 }}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}
