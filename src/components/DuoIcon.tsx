import type { CSSProperties } from "react";

// Duotone Streamline icons from /icons, inlined at build time. The two brand
// blues are swapped for grey CSS variables (--icon-soft / --icon-strong) so
// the icons keep their two-tone style but render in shades of grey.
const RAW = import.meta.glob("../../icons/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const FILES = {
  dashboard: "дашборд",
  topics: "карточки в шаблонах",
  progress: "схема",
  eye: "глаз",
  trash: "урна",
  calendar: "календарь",
  sparkle: "специально",
  guide: "гайд",
  stack: "копирование",
} as const;

export type DuoIconName = keyof typeof FILES;

const cache = new Map<DuoIconName, string>();

function markup(name: DuoIconName): string {
  const cached = cache.get(name);
  if (cached != null) return cached;
  const svg = (RAW[`../../icons/${FILES[name]}.svg`] ?? "")
    .replace(/#8fbffa/gi, "var(--icon-soft)")
    .replace(/#2859c5/gi, "var(--icon-strong)");
  cache.set(name, svg);
  return svg;
}

interface Props {
  name: DuoIconName;
  size?: number;
  style?: CSSProperties;
}

export function DuoIcon({ name, size = 16, style }: Props) {
  return (
    <span
      className="duo-icon"
      style={{ width: size, height: size, ...style }}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: markup(name) }}
    />
  );
}
