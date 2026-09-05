import { useEffect, useRef, useState } from 'react';

interface CountUpNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number; // ms
}

/** Animates between numeric values with requestAnimationFrame (ease-out cubic). */
export default function CountUpNumber({ value, format, duration = 600 }: CountUpNumberProps) {
  const [display, setDisplay] = useState(value);
  const previousRef = useRef(value);

  useEffect(() => {
    const from = previousRef.current;
    const to = value;
    previousRef.current = to;
    if (from === to) return undefined;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span>{format ? format(display) : Math.round(display).toLocaleString('en-US')}</span>;
}
