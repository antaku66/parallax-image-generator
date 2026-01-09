interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function Slider({ value, onChange, min = 0, max = 100 }: SliderProps) {
  return (
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      className="w-full"
    />
  );
}
