import { useAppStore } from "../../store/store";

export function ResetButton() {
  const requestRecenter = useAppStore((s) => s.requestRecenter);
  return (
    <button
      title="中心へ戻す Reset"
      onClick={requestRecenter}
      style={{
        width: 40,
        height: 40,
        flex: "none",
        border: "none",
        borderRadius: 11,
        background: "rgba(0,0,0,0.05)",
        color: "#1d1d1f",
        fontSize: 17,
        cursor: "pointer",
      }}
    >
      ⟲
    </button>
  );
}
