/**
 * Invitation theming — admin-side copy.
 *
 * This is a deliberate duplicate of wedding-client-frontend/src/lib/theme.ts.
 * The two apps deploy independently and share no package, and the alternative
 * (a workspace package) is more machinery than one file of constants is worth.
 * The contract that matters is that both sides agree on the preset ids and
 * token values — if you edit THEME_PRESETS here, edit it there too, or a
 * couple will preview one palette in the admin and their guests will see
 * another.
 *
 * The admin uses this for the preset swatches, the contrast warnings, and the
 * live invitation preview in the Style tab. It never emits the real page CSS.
 */

export interface ThemeTokens {
  /** Accent / metallic. Headings' flourishes, rules, buttons, active states. */
  primary: string;
  /** Lighter companion to primary. Hairline borders, soft fills, gradients. */
  primaryLight: string;
  /** Page background. */
  background: string;
  /** Section tint sitting on top of the page background. */
  surface: string;
  /** Solid panel/card background — the invitation card, modals, inputs. */
  card: string;
  /** Body text. */
  text: string;
  /** Secondary text and de-emphasised UI. */
  muted: string;
  headingFont: string;
  bodyFont: string;
  scriptFont: string;
}

export interface ThemePreset extends ThemeTokens {
  id: string;
  label: string;
  /** One-line description shown under the swatch in the admin panel. */
  blurb: string;
  /**
   * Wax-seal colour on the opening envelope. Preset-only — it is the one
   * decorative colour that does not read well as "primary, but darker", and
   * Classic Gold deliberately keeps the original deep red.
   */
  seal: string;
}

/**
 * Fonts that layout.tsx actually loads from Google Fonts. Anything outside
 * these lists is rejected rather than passed through — the value ends up inside
 * a generated <style> block, and an unloaded family would silently fall back to
 * a system serif anyway.
 */
export const HEADING_FONTS = ['Playfair Display', 'Cormorant Garamond', 'Lora', 'Cinzel', 'Montserrat'] as const;
export const BODY_FONTS = ['Montserrat', 'Inter', 'Lora', 'Cormorant Garamond'] as const;
export const SCRIPT_FONTS = ['Great Vibes'] as const;

/**
 * Curated palettes. Every preset is a complete theme — picking one is meant to
 * produce a finished-looking invitation with no further tuning.
 *
 * 'classic-gold' reproduces the original hard-coded design exactly and is the
 * fallback for every unset field, so an existing wedding that has never touched
 * the Style tab renders identically to before.
 */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classic-gold',
    label: 'Classic Gold',
    blurb: 'Warm ivory and antique gold — the original.',
    primary: '#D4AF37', primaryLight: '#E6D5B8',
    background: '#FDFBF7', surface: '#F8F4EC', card: '#FFFFFF',
    text: '#333230', muted: '#81705D',
    headingFont: 'Playfair Display', bodyFont: 'Montserrat', scriptFont: 'Great Vibes',
    seal: '#961111',
  },
  {
    id: 'blush-rose',
    label: 'Blush Rose',
    blurb: 'Rose gold on soft pink — romantic and light.',
    primary: '#B76E79', primaryLight: '#EBC7CB',
    background: '#FFFAF9', surface: '#FBEFF0', card: '#FFFFFF',
    text: '#3A2C2E', muted: '#886A6E',
    headingFont: 'Cormorant Garamond', bodyFont: 'Inter', scriptFont: 'Great Vibes',
    seal: '#A85560',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    blurb: 'Deep green and pale mint — botanical, formal.',
    primary: '#1F7A5C', primaryLight: '#A8D5C2',
    background: '#F8FBF9', surface: '#EAF3EE', card: '#FFFFFF',
    text: '#1E2B26', muted: '#5E776C',
    headingFont: 'Playfair Display', bodyFont: 'Montserrat', scriptFont: 'Great Vibes',
    seal: '#155C45',
  },
  {
    id: 'dusty-blue',
    label: 'Dusty Blue',
    blurb: 'Slate blue on cool white — calm and classic.',
    primary: '#4A6D8C', primaryLight: '#BCD0DE',
    background: '#F9FBFC', surface: '#EDF2F6', card: '#FFFFFF',
    text: '#24313B', muted: '#627483',
    headingFont: 'Cormorant Garamond', bodyFont: 'Inter', scriptFont: 'Great Vibes',
    seal: '#3A566F',
  },
  {
    id: 'terracotta',
    label: 'Terracotta',
    blurb: 'Burnt clay and sand — earthy and sunlit.',
    primary: '#C1663F', primaryLight: '#EFC9AF',
    background: '#FFFAF6', surface: '#F7EBE1', card: '#FFFFFF',
    text: '#3A2A21', muted: '#8F6A56',
    headingFont: 'Lora', bodyFont: 'Montserrat', scriptFont: 'Great Vibes',
    seal: '#9E4A28',
  },
  {
    id: 'sage',
    label: 'Sage',
    blurb: 'Muted olive on oat — understated and natural.',
    primary: '#6E8B5E', primaryLight: '#CBD9BE',
    background: '#FAFBF8', surface: '#EFF3EA', card: '#FFFFFF',
    text: '#2B3226', muted: '#6B7660',
    headingFont: 'Cormorant Garamond', bodyFont: 'Inter', scriptFont: 'Great Vibes',
    seal: '#55704A',
  },
  {
    id: 'plum',
    label: 'Plum',
    blurb: 'Aubergine and lilac — rich, evening-toned.',
    primary: '#6D3B6B', primaryLight: '#D4B8D2',
    background: '#FDFAFC', surface: '#F4EBF3', card: '#FFFFFF',
    text: '#2E2130', muted: '#86697F',
    headingFont: 'Playfair Display', bodyFont: 'Montserrat', scriptFont: 'Great Vibes',
    seal: '#542D52',
  },
  {
    id: 'midnight',
    label: 'Midnight & Champagne',
    blurb: 'Champagne on near-black — the only dark theme.',
    primary: '#C8A96B', primaryLight: '#E5D2AE',
    background: '#14161C', surface: '#1C1F27', card: '#232732',
    text: '#F0EDE6', muted: '#9A9384',
    headingFont: 'Cinzel', bodyFont: 'Montserrat', scriptFont: 'Great Vibes',
    seal: '#8E7440',
  },
];

export const DEFAULT_PRESET = THEME_PRESETS[0];

export function getPreset(id: string | null | undefined): ThemePreset {
  return THEME_PRESETS.find(p => p.id === id) || DEFAULT_PRESET;
}

// ─── Colour maths ────────────────────────────────────────────────────────────

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Accepts only #rgb / #rrggbb. Anything else returns null so callers fall back. */
export function normaliseHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!HEX_RE.test(v)) return null;
  if (v.length === 4) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return v.toLowerCase();
}

function toRgb(hex: string): [number, number, number] {
  const h = normaliseHex(hex) || '#000000';
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`;
}

/** Blend two colours. `amount` 0 → a, 1 → b. */
export function mix(a: string, b: string, amount: number): string {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return toHex([r1 + (r2 - r1) * amount, g1 + (g2 - g1) * amount, b1 + (b2 - b1) * amount]);
}

/** WCAG relative luminance, used to decide what text can sit on a colour. */
export function luminance(hex: string): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Text colour to place on top of `background`. Picks whichever of white or the
 * theme's own dark ink has more contrast, rather than always assuming white —
 * a pale primary with white text on it is the classic way these themes go
 * illegible.
 */
export function readableOn(background: string, darkInk = '#1a1a1a'): string {
  return contrastRatio(background, '#ffffff') >= contrastRatio(background, darkInk)
    ? '#ffffff'
    : darkInk;
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** True when the theme's page background is darker than its text. */
export function isDarkTheme(t: ThemeTokens): boolean {
  return luminance(t.background) < 0.35;
}

// ─── Resolution ──────────────────────────────────────────────────────────────

/** The subset of a wedding record that carries theme settings. */
export interface ThemeFields {
  themePreset?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  bgColor?: string | null;
  surfaceColor?: string | null;
  cardColor?: string | null;
  textColor?: string | null;
  mutedColor?: string | null;
  fontFamily?: string | null;
  bodyFont?: string | null;
}

function pickFont<T extends readonly string[]>(value: unknown, allowed: T, fallback: string): string {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? value : fallback;
}

/**
 * Turn a (possibly mostly-empty) wedding record into a complete theme.
 *
 * Each field falls back to the chosen preset, and the preset falls back to
 * Classic Gold — so a wedding created before theming existed, or one where the
 * admin only changed the accent colour, still resolves to something coherent.
 */
export function resolveTheme(wedding: ThemeFields | null | undefined): ThemeTokens {
  const preset = getPreset(wedding?.themePreset);
  const w = wedding || {};
  return {
    primary: normaliseHex(w.primaryColor) || preset.primary,
    primaryLight: normaliseHex(w.accentColor) || preset.primaryLight,
    background: normaliseHex(w.bgColor) || preset.background,
    surface: normaliseHex(w.surfaceColor) || preset.surface,
    card: normaliseHex(w.cardColor) || preset.card,
    text: normaliseHex(w.textColor) || preset.text,
    muted: normaliseHex(w.mutedColor) || preset.muted,
    headingFont: pickFont(w.fontFamily, HEADING_FONTS, preset.headingFont),
    bodyFont: pickFont(w.bodyFont, BODY_FONTS, preset.bodyFont),
    scriptFont: pickFont(preset.scriptFont, SCRIPT_FONTS, DEFAULT_PRESET.scriptFont),
  };
}

// ─── Serialisation ───────────────────────────────────────────────────────────

/**
 * Every custom property the invite site reads, as a flat map.
 *
 * Two naming schemes are emitted on purpose. `--color-*` and `--font-*` are the
 * Tailwind v4 `@theme` names, so utilities like `text-gold` and `bg-cream/50`
 * follow the theme (including their `color-mix` opacity variants). The bare
 * `--gold` / `--bg-ivory` names are what globals.css and the CSS modules were
 * already written against. Both point at the same values.
 */
export function themeVars(t: ThemeTokens, seal: string = DEFAULT_PRESET.seal): Record<string, string> {
  const dark = isDarkTheme(t);
  // On a dark theme, "deepen" has to mean lighten or the shade vanishes.
  const deepen = (hex: string, amount: number) => mix(hex, dark ? '#ffffff' : '#000000', amount);

  return {
    // Tailwind @theme tokens
    '--color-gold': t.primary,
    '--color-gold-light': t.primaryLight,
    '--color-ivory': t.background,
    '--color-cream': t.surface,
    '--color-card': t.card,
    '--color-charcoal': t.text,
    '--color-earth': t.muted,
    '--font-serif': `'${t.headingFont}', 'Playfair Display', serif`,
    '--font-script': `'${t.scriptFont}', cursive`,
    '--font-sans': `'${t.bodyFont}', 'Inter', sans-serif`,

    // Names used directly by globals.css and the CSS modules
    '--gold': t.primary,
    '--gold-light': t.primaryLight,
    '--gold-dark': deepen(t.primary, 0.28),
    '--bg-ivory': t.background,
    '--bg-cream': t.surface,
    '--card': t.card,
    '--charcoal': t.text,
    '--earth-brown': t.muted,

    // Derived helpers
    '--on-primary': readableOn(t.primary, t.text),
    '--primary-soft': rgba(t.primary, 0.12),
    '--primary-ring': rgba(t.primary, 0.28),
    '--hairline': rgba(t.text, dark ? 0.16 : 0.1),

    // Envelope paper is the light accent knocked back toward the ink, which
    // keeps it reading as aged card stock in every palette instead of turning
    // into a flat pastel.
    '--envelope-paper': mix(t.primaryLight, t.text, 0.1),
    '--envelope-paper-dark': mix(t.primaryLight, t.text, 0.22),
    '--seal': seal,
    '--seal-light': mix(seal, '#ffffff', 0.22),
    '--seal-dark': mix(seal, '#000000', 0.45),

    // Legacy aliases kept so nothing that referenced them silently breaks
    '--theme-primary': t.primary,
    '--theme-accent': t.primaryLight,
    '--theme-bg': t.background,
    '--theme-surface': t.card,
    '--theme-text-dark': t.text,
    '--theme-text-light': readableOn(t.text, t.background),
  };
}

/**
 * Serialise a theme to a `:root { … }` rule.
 *
 * The output is injected into a <style> tag, so it must not be able to escape
 * that context. Values are re-validated here rather than trusted: colours have
 * already been through `normaliseHex`, and font names are stripped of anything
 * that is not a letter, digit, space or hyphen. A malformed value would at
 * worst drop its own declaration.
 */
export function themeCss(t: ThemeTokens, seal?: string, selector = ':root'): string {
  const safe = (value: string) => value.replace(/[^#a-zA-Z0-9 ,.'()\-]/g, '');
  const body = Object.entries(themeVars(t, seal))
    .map(([name, value]) => `  ${name}: ${safe(value)};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

/**
 * Inline-style form of the same tokens, for scoped previews. Custom properties
 * are legal in React's style prop but absent from CSSProperties, so this is
 * typed as a plain record and cast at the call site.
 */
export function themeStyle(t: ThemeTokens, seal?: string): Record<string, string> {
  return themeVars(t, seal);
}

/**
 * One-call convenience for the invite page: resolve a wedding record to a theme
 * and serialise it, including the preset's wax-seal colour.
 */
export function weddingThemeCss(wedding: (ThemeFields & { themePreset?: string | null }) | null | undefined): string {
  return themeCss(resolveTheme(wedding), getPreset(wedding?.themePreset).seal);
}
