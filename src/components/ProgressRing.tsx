import type { CSSProperties } from "react";

interface Props {
  learned: number;
  learning: number;
  total: number;
  size?: number;
}

export function ProgressRing({ learned, learning, total, size = 150 }: Props) {
  const pct = total ? Math.round((learned / total) * 100) : 0;
  const learnedDeg = total ? (learned / total) * 360 : 0;
  const learningDeg = total ? (learning / total) * 360 : 0;
  const bg = `conic-gradient(var(--success) 0deg ${learnedDeg}deg, var(--warning) ${learnedDeg}deg ${
    learnedDeg + learningDeg
  }deg, var(--panel-3) ${learnedDeg + learningDeg}deg 360deg)`;
  const style = { "--size": `${size}px`, background: bg } as CSSProperties;

  return (
    <div className="ring" style={style}>
      <div className="ring-inner">
        <div>
          <div className="ring-pct">
            {pct}
            <small>%</small>
          </div>
          <div className="ring-note">
            {learned} / {total}
          </div>
        </div>
      </div>
    </div>
  );
}
