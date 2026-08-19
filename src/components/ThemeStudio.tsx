'use client';

import { useMemo } from 'react';
import { RotateCcw, AlertTriangle, Check } from 'lucide-react';
import {
  THEME_PRESETS,
  HEADING_FONTS,
  BODY_FONTS,
  getPreset,
  resolveTheme,
  themeStyle,
  contrastRatio,
  isDarkTheme,
  type ThemeFields,
  type ThemeTokens,
} from '@/lib/theme';

/**
 * The Style tab.
 *
 * Two ideas hold this together. First, a theme is a *complete* palette, not two
 * accent colours — the preset cards below set all six tokens plus the type
 * pairing at once, which is why picking one visibly changes the whole
 * invitation rather than recolouring a few rules. Second, every override is
 * nullable: clearing a field falls back to the preset, so "customised" and
 * "not customised" stay distinguishable and a couple can always get back to a
 * clean starting point without retyping hex codes.
 *
 * The preview is driven by exactly the same `themeStyle()` tokens the invite
 * site consumes, so what it shows is what guests get — if you add a token to
 * src/lib/theme.ts, the preview picks it up for free.
 */

export interface ThemeFormState {
  themePreset: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  cardColor: string;
  textColor: string;
  mutedColor: string;
  fontFamily: string;
  bodyFont: string;
}

interface ThemeStudioProps {
  value: ThemeFormState;
  onChange: (patch: Partial<ThemeFormState>) => void;
  brideName: string;
  groomName: string;
  /** yyyy-mm-dd, as held by the Basics tab. */
  weddingDate: string;
  venueName: string;
}

/** Which form fields are colour overrides, and what each one actually controls. */
const COLOR_FIELDS: Array<{
  key: keyof ThemeFormState;
  presetKey: keyof ThemeTokens;
  label: string;
  hint: string;
}> = [
  { key: 'primaryColor', presetKey: 'primary', label: 'Accent', hint: 'Names, rules, buttons, the monogram' },
  { key: 'accentColor', presetKey: 'primaryLight', label: 'Accent light', hint: 'Hairline borders and soft fills' },
  { key: 'bgColor', presetKey: 'background', label: 'Page background', hint: 'Behind everything' },
  { key: 'surfaceColor', presetKey: 'surface', label: 'Section tint', hint: 'The banded section backgrounds' },
  { key: 'cardColor', presetKey: 'card', label: 'Card', hint: 'Invitation card, modals, inputs' },
  { key: 'textColor', presetKey: 'text', label: 'Text', hint: 'Body copy and headings' },
  { key: 'mutedColor', presetKey: 'muted', label: 'Muted', hint: 'Secondary and de-emphasised text' },
];

/** Empty string is the form's representation of "no override — use the preset". */
const isSet = (v: string | null | undefined) => !!v && v.trim() !== '';

function formToFields(v: ThemeFormState): ThemeFields {
  return {
    themePreset: v.themePreset || null,
    primaryColor: isSet(v.primaryColor) ? v.primaryColor : null,
    accentColor: isSet(v.accentColor) ? v.accentColor : null,
    bgColor: isSet(v.bgColor) ? v.bgColor : null,
    surfaceColor: isSet(v.surfaceColor) ? v.surfaceColor : null,
    cardColor: isSet(v.cardColor) ? v.cardColor : null,
    textColor: isSet(v.textColor) ? v.textColor : null,
    mutedColor: isSet(v.mutedColor) ? v.mutedColor : null,
    fontFamily: isSet(v.fontFamily) ? v.fontFamily : null,
    bodyFont: isSet(v.bodyFont) ? v.bodyFont : null,
  };
}

// ─── Contrast ────────────────────────────────────────────────────────────────

interface ContrastCheck { label: string; ratio: number; min: number; }

/**
 * Readability checks. The three text rows use the WCAG AA threshold of 4.5:1,
 * which is the bar that actually matters for guests reading on a phone.
 *
 * The accent gets a much lower floor on purpose. It is only ever used for
 * display-size script, hairline rules and the monogram — never body copy — and
 * classic wedding gold on white is about 2.1:1 by nature. Holding it to AA
 * would put a permanent warning on the default theme, which trains people to
 * ignore the panel entirely. 1.8:1 catches the real failure: an accent so close
 * to the card colour that the rules and monogram disappear.
 *
 * All of these are warnings, not blocks. A couple choosing a low-contrast
 * palette should be told, not overruled.
 */
function contrastChecks(t: ThemeTokens): ContrastCheck[] {
  return [
    { label: 'Body text on page', ratio: contrastRatio(t.text, t.background), min: 4.5 },
    { label: 'Body text on card', ratio: contrastRatio(t.text, t.card), min: 4.5 },
    { label: 'Muted text on page', ratio: contrastRatio(t.muted, t.background), min: 4.5 },
    { label: 'Accent visible on cards', ratio: contrastRatio(t.primary, t.card), min: 1.8 },
  ];
}

export default function ThemeStudio({ value, onChange, brideName, groomName, weddingDate, venueName }: ThemeStudioProps) {
  const preset = getPreset(value.themePreset);
  const tokens = useMemo(() => resolveTheme(formToFields(value)), [value]);
  const previewVars = useMemo(
    () => themeStyle(tokens, preset.seal) as React.CSSProperties,
    [tokens, preset.seal]
  );
  const checks = contrastChecks(tokens);
  const failing = checks.filter(c => c.ratio < c.min);

  /**
   * Applying a preset clears every override. Layering a half-set of old custom
   * colours over a new palette is how you get a muddy in-between theme that
   * looks like neither — one click should mean one coherent result.
   */
  function applyPreset(id: string) {
    const p = getPreset(id);
    onChange({
      themePreset: p.id,
      primaryColor: '', accentColor: '', bgColor: '', surfaceColor: '',
      cardColor: '', textColor: '', mutedColor: '', fontFamily: '', bodyFont: '',
    });
  }

  const dateText = weddingDate
    ? new Date(`${weddingDate}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'The Wedding Day';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gap: '20px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Theme</h2>
          <p style={{ margin: '3px 0 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Sets the colours and typography of the entire invitation — envelope, hero, card, timeline and buttons.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
            {THEME_PRESETS.map(p => {
              const active = p.id === preset.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  title={p.blurb}
                  style={{
                    textAlign: 'left', cursor: 'pointer', padding: '10px', borderRadius: '10px',
                    background: active ? 'var(--color-surface-2)' : 'transparent',
                    border: active ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border-2)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', height: '34px', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                    <span style={{ flex: 2, background: p.background }} />
                    <span style={{ flex: 1, background: p.surface }} />
                    <span style={{ flex: 1.4, background: p.primary }} />
                    <span style={{ flex: 1, background: p.primaryLight }} />
                    <span style={{ flex: 0.7, background: p.text }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 600 }}>
                    {active && <Check size={12} />}{p.label}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)', lineHeight: 1.35, marginTop: '2px' }}>
                    {p.blurb}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Typography</h2>
          <p style={{ margin: '3px 0 14px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Overrides the preset&apos;s pairing. The script face used for the couple&apos;s names stays Great Vibes.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <FontPicker
              label="Headings" options={HEADING_FONTS} presetValue={preset.headingFont}
              value={value.fontFamily} onChange={v => onChange({ fontFamily: v })}
            />
            <FontPicker
              label="Body text" options={BODY_FONTS} presetValue={preset.bodyFont}
              value={value.bodyFont} onChange={v => onChange({ bodyFont: v })}
            />
          </div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Fine-tune colours</h2>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Optional. Anything you don&apos;t touch follows {preset.label}.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '2px', marginTop: '14px' }}>
            {COLOR_FIELDS.map(field => {
              const overridden = isSet(value[field.key] as string);
              const current = (overridden ? value[field.key] : preset[field.presetKey]) as string;
              return (
                <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--color-border-2)' }}>
                  <input
                    type="color"
                    value={current}
                    onChange={e => onChange({ [field.key]: e.target.value } as Partial<ThemeFormState>)}
                    style={{ width: '36px', height: '36px', flexShrink: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                    aria-label={field.label}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{field.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{field.hint}</div>
                  </div>
                  <code style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{current}</code>
                  <button
                    type="button"
                    onClick={() => onChange({ [field.key]: '' } as Partial<ThemeFormState>)}
                    disabled={!overridden}
                    title={overridden ? `Reset to ${preset.label}` : 'Following the preset'}
                    className="btn btn-ghost btn-sm btn-icon"
                    style={{ opacity: overridden ? 1 : 0.25 }}
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Readability. Shown only when something actually fails, so it reads
              as a real warning rather than permanent decoration. */}
          {failing.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px 14px', borderRadius: '8px', background: 'var(--color-surface-2)', border: '1px solid var(--color-warning, #d9a441)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                <AlertTriangle size={14} /> Hard to read
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                {failing.map(c => (
                  <li key={c.label}>
                    {c.label}: {c.ratio.toFixed(1)}:1 — needs {c.min}:1
                  </li>
                ))}
              </ul>
              <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Guests will read this on a phone, often outdoors. You can still save it.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Live preview ─────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: '20px' }}>
        <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
          Live preview
        </p>
        <InvitationPreview
          vars={previewVars}
          tokens={tokens}
          brideName={brideName || 'Sandali'}
          groomName={groomName || 'Heshan'}
          dateText={dateText}
          venueName={venueName || 'Colombo, Sri Lanka'}
        />
        <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          A miniature of the real invitation, drawn with the same theme variables the guest site uses.
          Photos, gallery and music are not shown here.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FontPicker({ label, options, presetValue, value, onChange }: {
  label: string;
  options: readonly string[];
  presetValue: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="input-label">{label}</label>
      <select
        className="input"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{ fontFamily: value || presetValue }}
      >
        <option value="">From theme — {presetValue}</option>
        {options.map(f => (
          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
        ))}
      </select>
    </div>
  );
}

/**
 * Miniature of the invitation. Deliberately structural rather than pixel-exact:
 * it shows the four places the palette does the most work — the hero band, the
 * bordered invitation card, a timeline entry and the RSVP button — because
 * those are what change character between presets.
 */
function InvitationPreview({ vars, tokens, brideName, groomName, dateText, venueName }: {
  vars: React.CSSProperties;
  tokens: ThemeTokens;
  brideName: string;
  groomName: string;
  dateText: string;
  venueName: string;
}) {
  const dark = isDarkTheme(tokens);
  return (
    <div
      style={{
        ...vars,
        borderRadius: '18px',
        overflow: 'hidden',
        border: '1px solid var(--color-border-2)',
        boxShadow: '0 12px 34px rgba(0,0,0,0.22)',
        background: 'var(--bg-ivory)',
        color: 'var(--charcoal)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Hero band — stands in for the cover photo with its dark scrim */}
      <div
        style={{
          padding: '30px 18px 26px',
          textAlign: 'center',
          background: `linear-gradient(160deg, var(--bg-cream) 0%, var(--bg-ivory) 55%, var(--bg-cream) 100%)`,
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-script)', fontSize: '34px', lineHeight: 1.1, color: 'var(--gold)' }}>
          {brideName} &amp; {groomName}
        </div>
        <div style={{ width: '38px', height: '1px', background: 'var(--gold)', opacity: 0.7, margin: '12px auto' }} />
        <div style={{ fontSize: '9.5px', letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--earth-brown)' }}>
          {dateText}
        </div>
        <div style={{ fontSize: '9.5px', letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--earth-brown)', marginTop: '4px' }}>
          {venueName}
        </div>
      </div>

      {/* Invitation card */}
      <div style={{ padding: '22px 16px', background: 'var(--bg-cream)' }}>
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--gold-light)',
            padding: '18px 14px',
            textAlign: 'center',
            boxShadow: '0 10px 22px rgba(0,0,0,0.06)',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', inset: '6px', border: '1px solid var(--gold)', pointerEvents: 'none' }} />
          <div style={{ fontFamily: 'var(--font-script)', fontSize: '34px', color: 'var(--gold)', lineHeight: 1, position: 'relative' }}>
            {brideName[0]}{groomName[0]}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '8px', letterSpacing: '1.6px', textTransform: 'uppercase', margin: '12px 0 8px', color: 'var(--charcoal)', position: 'relative' }}>
            Request the honour of your presence
          </div>
          <div
            style={{
              fontFamily: 'var(--font-serif)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase',
              padding: '7px 0', borderTop: '1px solid var(--gold-light)', borderBottom: '1px solid var(--gold-light)',
              color: 'var(--charcoal)', position: 'relative',
            }}
          >
            Mr. Heshan Dissanayake
          </div>
        </div>
      </div>

      {/* Timeline entry */}
      <div style={{ padding: '18px 18px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3px' }}>
          <span style={{ width: '11px', height: '11px', borderRadius: '50%', border: '2px solid var(--gold)', display: 'block' }} />
          <span style={{ width: '1px', flex: 1, minHeight: '26px', background: 'var(--gold-light)' }} />
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: 'var(--gold)' }}>4:00 PM</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--charcoal)', margin: '2px 0 3px' }}>The Ceremony</div>
          <div style={{ fontSize: '10.5px', color: 'var(--earth-brown)', lineHeight: 1.5 }}>
            Followed by dinner and dancing.
          </div>
        </div>
      </div>

      {/* Floating nav / RSVP */}
      <div style={{ padding: '0 16px 18px' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            padding: '7px 8px 7px 16px', borderRadius: '999px',
            background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
            border: '1px solid var(--hairline)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <span style={{ fontSize: '10.5px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--earth-brown)' }}>
            Gallery · Venue
          </span>
          <span
            style={{
              padding: '7px 16px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 600,
              letterSpacing: '1px', textTransform: 'uppercase',
              background: 'linear-gradient(135deg, var(--gold-light), var(--gold))',
              color: 'var(--on-primary)',
            }}
          >
            RSVP
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: 'var(--charcoal)', padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '8.5px', letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--theme-text-light)', opacity: 0.6 }}>
          Made with love for
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--gold)', marginTop: '5px' }}>
          {brideName} &amp; {groomName}
        </div>
      </div>
    </div>
  );
}
