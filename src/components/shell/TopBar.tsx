import { Button } from "../ui/Button";

type Props = {
  onInfo: () => void;
  onNew: () => void;
};

export function TopBar({ onInfo, onNew }: Props) {
  return (
    <div
      style={{
        height: 60,
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        background: "#fff",
        zIndex: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: "linear-gradient(145deg,#0a84ff,#5e5ce6)",
          }}
        />
        <span style={{ font: "700 17px var(--font-display)", letterSpacing: "-0.01em" }}>
          Spatial
        </span>
        <span style={{ font: "500 13px var(--font-jp)", color: "#aeaeb2" }}>空間シーン</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button
          variant="soft"
          onClick={onInfo}
          style={{ height: 34, padding: "0 14px", borderRadius: 9, fontSize: 13 }}
        >
          情報 Info
        </Button>
        <Button
          variant="dark"
          onClick={onNew}
          style={{ height: 34, padding: "0 16px", borderRadius: 9, fontSize: 13 }}
        >
          ＋ 新規 New
        </Button>
      </div>
    </div>
  );
}
