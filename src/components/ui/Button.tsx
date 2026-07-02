import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type Variant = "primary" | "dark" | "soft" | "glass";

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: {
    background: "#0a84ff",
    color: "#fff",
    boxShadow: "0 4px 14px rgba(10,132,255,0.35)",
  },
  dark: { background: "#1d1d1f", color: "#fff" },
  soft: { background: "rgba(0,0,0,0.05)", color: "#1d1d1f" },
  glass: {
    background: "rgba(255,255,255,0.8)",
    color: "#1d1d1f",
    border: "1px solid rgba(0,0,0,0.12)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({ variant = "soft", children, style, ...rest }: Props) {
  return (
    <button
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        border: "none",
        borderRadius: 12,
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
        ...VARIANTS[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
