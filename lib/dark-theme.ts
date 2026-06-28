import type { CSSProperties } from 'react';

/**
 * Scoped dark palette for the dashboard, applied as inline CSS custom
 * properties on a wrapper element. We set these inline (rather than via a
 * `.theme-dark` class in globals.css) because Tailwind v4 / Lightning CSS
 * strips rules that redefine `@theme` color variables inside a regular
 * selector. Inline custom properties cascade to all descendants and override
 * the `:root` token values for this subtree only — reliable in dev and prod.
 */
export const darkThemeVars = {
  // Core surfaces
  '--color-background': 'oklch(0.1850 0.0220 292)',
  '--color-foreground': 'oklch(0.9280 0.0150 300)',
  '--color-card': 'oklch(0.2320 0.0235 293)',
  '--color-card-foreground': 'oklch(0.9280 0.0150 300)',

  // Brand
  '--color-primary': 'oklch(0.7250 0.0860 300)',
  '--color-primary-deep': 'oklch(0.8150 0.0780 300)',
  '--color-primary-foreground': 'oklch(0.1700 0.0200 292)',
  '--color-secondary': 'oklch(0.3250 0.0360 298)',
  '--color-secondary-foreground': 'oklch(0.9280 0.0150 300)',
  '--color-accent': 'oklch(0.7889 0.0802 359.9375)',
  '--color-accent-foreground': 'oklch(0.1700 0.0200 292)',

  // Neutrals
  '--color-muted': 'oklch(0.2780 0.0220 293)',
  '--color-muted-foreground': 'oklch(0.6950 0.0230 295)',
  '--color-border': 'oklch(0.3180 0.0240 293)',
  '--color-border-strong': 'oklch(0.3950 0.0285 293)',
  '--color-input': 'oklch(0.2780 0.0220 293)',
  '--color-ring': 'oklch(0.7250 0.0860 300)',
  '--color-destructive': 'oklch(0.6800 0.1520 23)',
  '--color-destructive-foreground': 'oklch(0.9700 0.0100 300)',

  // Domain families tuned for dark surfaces
  '--color-academic': 'oklch(0.7050 0.1000 258)',
  '--color-academic-soft': 'oklch(0.2950 0.0470 258)',
  '--color-academic-line': 'oklch(0.3950 0.0560 258)',
  '--color-academic-deep': 'oklch(0.8250 0.0920 258)',

  '--color-extracurricular': 'oklch(0.7889 0.0802 359.9375)',
  '--color-extracurricular-soft': 'oklch(0.3050 0.0520 2)',
  '--color-extracurricular-line': 'oklch(0.4050 0.0620 4)',
  '--color-extracurricular-deep': 'oklch(0.8450 0.0860 4)',

  '--color-body': 'oklch(0.7321 0.0749 169.867)',
  '--color-body-soft': 'oklch(0.2850 0.0470 170)',
  '--color-body-line': 'oklch(0.3850 0.0560 170)',
  '--color-body-deep': 'oklch(0.8350 0.0860 170)',

  '--color-reflection': 'oklch(0.854 0.0882 76.8292)',
  '--color-reflection-soft': 'oklch(0.3050 0.0420 77)',
  '--color-reflection-line': 'oklch(0.4050 0.0520 77)',
  '--color-reflection-deep': 'oklch(0.8650 0.0880 80)',

  // Semantic status
  '--color-success': 'oklch(0.7321 0.0749 169.867)',
  '--color-success-soft': 'oklch(0.2850 0.0470 170)',
  '--color-success-line': 'oklch(0.3850 0.0560 170)',
  '--color-success-deep': 'oklch(0.8350 0.0860 170)',

  '--color-warning': 'oklch(0.80 0.12 75)',
  '--color-warning-soft': 'oklch(0.3050 0.0420 77)',
  '--color-warning-line': 'oklch(0.4050 0.0520 77)',
  '--color-warning-deep': 'oklch(0.8650 0.0900 80)',

  '--color-danger': 'oklch(0.6800 0.1520 23)',
  '--color-danger-soft': 'oklch(0.3050 0.0620 23)',
  '--color-danger-line': 'oklch(0.4050 0.0820 23)',
  '--color-danger-deep': 'oklch(0.8250 0.1100 23)',

  '--color-info': 'oklch(0.7050 0.1000 258)',
  '--color-info-soft': 'oklch(0.2950 0.0470 258)',
  '--color-info-line': 'oklch(0.3950 0.0560 258)',
  '--color-info-deep': 'oklch(0.8250 0.0920 258)',

  // Shadows (deeper for dark)
  '--shadow-card': '0 1px 2px oklch(0 0 0 / 0.30), 0 2px 8px -2px oklch(0 0 0 / 0.40)',
  '--shadow-lift': '0 2px 4px oklch(0 0 0 / 0.35), 0 16px 30px -12px oklch(0 0 0 / 0.60)',
  '--shadow-glow': '0 8px 32px -8px oklch(0.7250 0.0860 300 / 0.40)',
  '--shadow-modal': '0 8px 16px oklch(0 0 0 / 0.45), 0 32px 64px -16px oklch(0 0 0 / 0.65)',

  // Surface paint for the wrapper itself
  color: 'var(--color-foreground)',
  background:
    'radial-gradient(1100px 600px at 86% -12%, oklch(0.32 0.055 300 / 0.55), transparent 60%), radial-gradient(950px 560px at -10% 112%, oklch(0.30 0.055 350 / 0.40), transparent 58%), oklch(0.1850 0.0220 292)',
  backgroundAttachment: 'fixed',
  minHeight: '100vh',
} as CSSProperties;
