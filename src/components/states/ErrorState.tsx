import { resetApp, useAppStore } from "../../store/store";
import { Button } from "../ui/Button";

export function ErrorState() {
  const error = useAppStore((s) => s.error);
  return (
    <div
      style={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 26,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 34 }}>⚠️</div>
      <div style={{ font: "600 19px var(--font-jp)", color: "#1d1d1f" }}>処理に失敗しました</div>
      <div style={{ font: "400 13.5px var(--font-sans)", color: "#6e6e73", maxWidth: 420 }}>
        {error ?? "不明なエラーが発生しました"}
      </div>
      <Button
        variant="primary"
        onClick={resetApp}
        style={{ height: 42, padding: "0 24px", borderRadius: 13 }}
      >
        やり直す
      </Button>
    </div>
  );
}
