// ビューア初回表示時のドラッグ誘導ヒント（Studio Viewer / Scene.dc.html 準拠）。
// sceneHintFade で数秒後に自動フェードアウトする（keyframes は index.css）。
// 呼び出し側で asset 単位に key を付け替え、新しい画像ごとに再表示させる。

export function DragHint() {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 18,
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 14px",
        borderRadius: 999,
        background: "rgba(20,22,26,0.42)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "#fff",
        font: "500 12px/1 var(--font-sans)",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        animation: "sceneHintFade 4.5s ease forwards",
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          animation: "sceneFloat 2s ease-in-out infinite",
        }}
      >
        ⤡
      </span>
      <span>ドラッグして視点を動かす · Drag to look around</span>
    </div>
  );
}
