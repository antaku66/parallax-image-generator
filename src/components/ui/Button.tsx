import { type ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
}: ButtonProps) {
  const baseStyles =
    "px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-700 text-gray-200 hover:bg-gray-600",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]}`}
    >
      {children}
    </button>
  );
}
