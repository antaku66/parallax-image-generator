// 円形プログレスリング（Studio Viewer 準拠）

type Props = {
  percent: number; // 0..1
  size?: number;
};

export function ProgressRing({ percent, size = 84 }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, percent)) * 100);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "4px solid rgba(10,132,255,0.16)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: "4px solid transparent",
          borderTopColor: "#0a84ff",
          animation: "ringSpin 0.9s linear infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          font: `600 ${Math.round(size * 0.22)}px var(--font-mono)`,
          color: "#1d1d1f",
        }}
      >
        {pct}%
      </div>
    </div>
  );
}
