interface SpinnerProps {
  size?: "sm" | "md" | "lg";
}

export function Spinner({ size = "md" }: SpinnerProps) {
  const sizeStyles = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-4",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      className={`${sizeStyles[size]} border-blue-600 border-t-transparent rounded-full animate-spin`}
    />
  );
}
