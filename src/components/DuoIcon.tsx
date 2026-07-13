import type { CSSProperties } from "react";

// Duotone Streamline icons from /icons, inlined at build time. The two brand
// blues are swapped for grey CSS variables (--icon-soft / --icon-strong) so
// the icons keep their two-tone style but render in shades of grey.
const GLOB = import.meta.glob("../../icons/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// macOS stores filenames in NFD, so paths with «й»/«ё» won't match NFC
// string literals — normalize the glob keys before lookup.
const RAW: Record<string, string> = {};
for (const [path, svg] of Object.entries(GLOB)) {
  RAW[path.normalize("NFC")] = svg;
}

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

// Hand-drawn in the same Streamline duotone style (the set has no plain
// check); uses the same two source blues so it goes through the grey remap.
const CHECK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="14" width="14">' +
  '<circle cx="7" cy="7" r="6.5" fill="#8fbffa"/>' +
  '<path fill="#2859c5" fill-rule="evenodd" clip-rule="evenodd" d="M10.47 4.82c.31.31.31.82 0 1.13L6.7 9.72c-.31.31-.82.31-1.13 0L3.53 7.68a.8.8 0 1 1 1.13-1.13l1.47 1.47 3.21-3.2c.31-.32.82-.32 1.13 0Z"/>' +
  "</svg>";

export type DuoIconName = keyof typeof FILES | "check";

const cache = new Map<DuoIconName, string>();

function markup(name: DuoIconName): string {
  const cached = cache.get(name);
  if (cached != null) return cached;
  const source =
    name === "check" ? CHECK_SVG : RAW[`../../icons/${FILES[name]}.svg`] ?? "";
  const svg = source
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
