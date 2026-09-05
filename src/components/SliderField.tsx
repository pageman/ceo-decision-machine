export function SliderField({
  id,
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  format,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        <span className="mono" style={{ float: 'right', color: 'var(--text)' }}>
          {format ? format(value) : value}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
