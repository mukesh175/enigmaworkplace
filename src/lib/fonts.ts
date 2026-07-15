// Central registry of selectable app fonts.
// Each entry's `cssVar` must match a `variable` name set up in src/app/layout.tsx
// via next/font/google, so the whole set is preloaded once and switching is instant.
export const FONT_OPTIONS = [
  { id: "inter", label: "Inter", cssVar: "--font-inter" },
  { id: "manrope", label: "Manrope", cssVar: "--font-manrope" },
  { id: "plus-jakarta", label: "Plus Jakarta Sans", cssVar: "--font-plus-jakarta" },
  { id: "outfit", label: "Outfit", cssVar: "--font-outfit" },
  { id: "mulish", label: "Mulish", cssVar: "--font-mulish" },
  { id: "jost", label: "Jost", cssVar: "--font-jost" },
  { id: "urbanist", label: "Urbanist", cssVar: "--font-urbanist" },
  { id: "lexend", label: "Lexend", cssVar: "--font-lexend" },
  { id: "be-vietnam", label: "Be Vietnam Pro", cssVar: "--font-be-vietnam" },
  { id: "sora", label: "Sora", cssVar: "--font-sora" },
  { id: "work-sans", label: "Work Sans", cssVar: "--font-work-sans" },
  { id: "poppins", label: "Poppins", cssVar: "--font-poppins" },
] as const;

export type FontId = (typeof FONT_OPTIONS)[number]["id"];

export function fontCssVar(id: string): string {
  return FONT_OPTIONS.find((f) => f.id === id)?.cssVar ?? "--font-inter";
}

export const FONT_WEIGHT_OPTIONS = [
  { id: "light", label: "Light", value: 300 },
  { id: "regular", label: "Regular", value: 400 },
  { id: "medium", label: "Medium", value: 500 },
  { id: "semibold", label: "Semibold", value: 600 },
] as const;

export type FontWeightId = (typeof FONT_WEIGHT_OPTIONS)[number]["id"];

export function fontWeightValue(id: string): number {
  return FONT_WEIGHT_OPTIONS.find((w) => w.id === id)?.value ?? 400;
}

export const FONT_SIZE_STEPS = [0.9, 0.95, 1.0, 1.05, 1.1] as const;

export const ACCENT_SWATCHES = [
  { id: "teal", label: "Teal", hex: "#14B8A6" },
  { id: "blue", label: "Blue", hex: "#2f3192" },
  { id: "purple", label: "Purple", hex: "#A855F7" },
  { id: "pink", label: "Pink", hex: "#EC4899" },
  { id: "orange", label: "Orange", hex: "#F97316" },
  { id: "green", label: "Green", hex: "#22C55E" },
  { id: "amber", label: "Amber", hex: "#F59E0B" },
  { id: "red", label: "Red", hex: "#EF4444" },
] as const;
