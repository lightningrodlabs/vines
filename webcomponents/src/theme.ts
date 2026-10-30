import {css, CSSResult} from "lit";

/**
 * The Vines "soft paper" theme.
 *
 * This file is the ONLY place a color is written down. Every component reads
 * colors, radii, shadows and fonts through the `--vines-*` custom properties
 * declared in `vinesTokens`; third-party widgets (UI5, Shoelace, Vaadin) are
 * bent to the same values through `frameworkTokenMap`.
 *
 * Values come from the Moss renderer so Vines looks native inside Moss.
 * See docs/superpowers/specs/2026-10-29-soft-paper-ui-design.md.
 */

/** Raw hex values, for code that cannot read CSS variables (cytoscape, css-doodle, toasts). */
export const palette = {
  pageBgTop: "#e0eed5",
  pageBgBottom: "#f5f5f3",
  surface: "#ffffff",
  surface2: "#f4f4f4",
  surfaceTint: "#e0eed5",
  sidebarRowSelected: "#ffffff",
  ink: "#151a11",
  inkMuted: "#757575",
  inkHint: "#324d47",
  link: "#4c6a39",
  accent: "#4c6a39",
  accentSoft: "#85b46e",
  accentAlt: "#7461eb",
  positive: "#85b46e",
  negative: "#c10a0a",
  warning: "#a8a187",
  border: "#e8e8e8",
} as const;

export type PaletteKey = keyof typeof palette;


/** Every `--vines-*` token, on both the component host and the document root. */
export const vinesTokens: CSSResult = css`
  :host, :root {
    /* Surfaces */
    --vines-page-bg: linear-gradient(180deg, #e0eed5 0%, #f5f5f3 55%);
    --vines-surface: #ffffff;
    --vines-surface-2: #f4f4f4;
    --vines-surface-tint: #e0eed5;
    --vines-sidebar-row-selected: #ffffff;
    --vines-sidebar-row-hover: rgba(255,255,255,0.6);
    --vines-row-hover: rgba(21,26,17,0.04);

    /* Ink */
    --vines-ink: #151a11;
    --vines-ink-muted: #757575;
    --vines-ink-hint: #324d47;
    --vines-link: #4c6a39;

    /* Accents */
    --vines-accent: #4c6a39;
    --vines-accent-soft: #85b46e;
    --vines-accent-alt: #7461eb;
    --vines-positive: #85b46e;
    --vines-negative: #c10a0a;
    --vines-warning: #a8a187;

    /* Shape and depth */
    --vines-radius-s: 8px;
    --vines-radius-m: 10px;
    --vines-radius-l: 12px;
    --vines-radius-pill: 999px;
    --vines-shadow-card: 0 1px 3px rgba(21,26,17,0.06);
    --vines-shadow-row: 0 1px 2px rgba(21,26,17,0.08);
    --vines-shadow-pop: 0 2px 8px rgba(0,0,0,0.12);
    --vines-border: #e8e8e8;

    /* Type */
    --vines-font: 'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    --vines-font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    --vines-text-s: 12px;
    --vines-text-m: 14px;
    --vines-text-l: 16px;
  }
`;


/**
 * Third-party token sets, derived from the vines tokens.
 * `html:root` outranks the frameworks' own `:root` declarations.
 */
export const frameworkTokenMap: CSSResult = css`
  html:root {
    /* ---- UI5 Web Components (Horizon parameter names) ---- */
    --sapFontFamily: var(--vines-font);
    --sapFontSize: var(--vines-text-m);
    --sapBrandColor: var(--vines-accent);
    --sapHighlightColor: var(--vines-accent);
    --sapSelectedColor: var(--vines-accent);
    --sapActiveColor: var(--vines-surface-tint);
    --sapTextColor: var(--vines-ink);
    --sapLinkColor: var(--vines-link);
    --sapContent_LabelColor: var(--vines-ink-muted);
    --sapContent_FocusColor: var(--vines-accent);
    --sapBackgroundColor: var(--vines-surface);
    --sapBaseColor: var(--vines-surface);
    --sapShell_Background: var(--vines-surface);
    --sapGroup_ContentBackground: var(--vines-surface);
    --sapGroup_ContentBorderColor: var(--vines-border);
    --sapList_Background: var(--vines-surface);
    --sapList_BorderColor: var(--vines-border);
    --sapList_Hover_Background: var(--vines-row-hover);
    --sapList_SelectionBackgroundColor: var(--vines-surface-tint);
    --sapButton_Background: var(--vines-surface);
    --sapButton_BorderColor: var(--vines-border);
    --sapButton_TextColor: var(--vines-ink);
    --sapButton_Hover_Background: var(--vines-surface-2);
    --sapButton_Lite_TextColor: var(--vines-ink);
    --sapButton_Lite_Hover_Background: var(--vines-row-hover);
    --sapButton_Emphasized_Background: var(--vines-accent);
    --sapButton_Emphasized_BorderColor: var(--vines-accent);
    --sapButton_Emphasized_TextColor: var(--vines-surface);
    --sapButton_BorderCornerRadius: var(--vines-radius-s);
    --sapElement_BorderCornerRadius: var(--vines-radius-l);
    --sapField_BorderCornerRadius: var(--vines-radius-m);
    --sapPopover_BorderCornerRadius: var(--vines-radius-l);
    --sapTile_BorderCornerRadius: var(--vines-radius-l);
    --sapField_Background: var(--vines-surface-2);
    --sapField_BorderColor: var(--vines-border);
    --sapField_Hover_Background: var(--vines-surface-2);
    --sapField_Focus_BorderColor: var(--vines-accent);
    --sapField_PlaceholderTextColor: var(--vines-ink-muted);
    --sapPositiveColor: var(--vines-positive);
    --sapNegativeColor: var(--vines-negative);
    --sapCriticalColor: var(--vines-warning);
    --sapInformativeColor: var(--vines-accent);
    --sapContent_BadgeBackground: var(--vines-accent-soft);
    --sapContent_BadgeTextColor: var(--vines-surface);
    --sapScrollBar_FaceColor: var(--vines-border);
    --sapScrollBar_TrackColor: transparent;

    /* ---- Shoelace ---- */
    --sl-font-sans: var(--vines-font);
    --sl-font-mono: var(--vines-font-mono);
    --sl-color-primary-50: color-mix(in srgb, var(--vines-accent) 8%, white);
    --sl-color-primary-100: color-mix(in srgb, var(--vines-accent) 16%, white);
    --sl-color-primary-200: color-mix(in srgb, var(--vines-accent) 32%, white);
    --sl-color-primary-300: color-mix(in srgb, var(--vines-accent) 48%, white);
    --sl-color-primary-400: color-mix(in srgb, var(--vines-accent) 72%, white);
    --sl-color-primary-500: var(--vines-accent);
    --sl-color-primary-600: color-mix(in srgb, var(--vines-accent) 88%, black);
    --sl-color-primary-700: color-mix(in srgb, var(--vines-accent) 76%, black);
    --sl-color-primary-800: color-mix(in srgb, var(--vines-accent) 64%, black);
    --sl-color-primary-900: color-mix(in srgb, var(--vines-accent) 52%, black);
    --sl-color-neutral-0: var(--vines-surface);
    --sl-color-neutral-50: var(--vines-surface-2);
    --sl-color-neutral-100: var(--vines-surface-2);
    --sl-color-neutral-200: var(--vines-border);
    --sl-color-neutral-300: var(--vines-border);
    --sl-color-neutral-400: var(--vines-ink-muted);
    --sl-color-neutral-500: var(--vines-ink-muted);
    --sl-color-neutral-600: var(--vines-ink-muted);
    --sl-color-neutral-700: var(--vines-ink);
    --sl-color-neutral-800: var(--vines-ink);
    --sl-color-neutral-900: var(--vines-ink);
    --sl-color-neutral-950: var(--vines-ink);
    --sl-color-neutral-1000: var(--vines-ink);
    --sl-border-radius-small: var(--vines-radius-s);
    --sl-border-radius-medium: var(--vines-radius-m);
    --sl-border-radius-large: var(--vines-radius-l);
    --sl-border-radius-x-large: var(--vines-radius-l);
    --sl-input-border-radius-medium: var(--vines-radius-m);
    --sl-input-background-color: var(--vines-surface-2);
    --sl-input-border-color: var(--vines-border);
    --sl-input-focus-ring-color: color-mix(in srgb, var(--vines-accent) 30%, transparent);
    --sl-shadow-small: var(--vines-shadow-row);
    --sl-shadow-medium: var(--vines-shadow-card);
    --sl-shadow-large: var(--vines-shadow-pop);

    /* ---- Vaadin Lumo (the files table) ---- */
    --lumo-font-family: var(--vines-font);
    --lumo-primary-color: var(--vines-accent);
    --lumo-primary-text-color: var(--vines-accent);
    --lumo-base-color: var(--vines-surface);
    --lumo-body-text-color: var(--vines-ink);
    --lumo-secondary-text-color: var(--vines-ink-muted);
    --lumo-contrast-5pct: var(--vines-row-hover);
    --lumo-contrast-10pct: var(--vines-surface-2);
    --lumo-contrast-20pct: var(--vines-border);
    --lumo-border-radius-s: var(--vines-radius-s);
    --lumo-border-radius-m: var(--vines-radius-m);
    --lumo-border-radius-l: var(--vines-radius-l);
    --lumo-error-color: var(--vines-negative);
    --lumo-success-color: var(--vines-positive);
  }
`;


/** Token-based element rules shared by every component (and the document). */
export const themeStyles: CSSResult = css`
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--vines-border) transparent;
  }

  a, .linky {
    color: var(--vines-link);
    text-decoration: none;
  }
  a:hover, .linky:hover {
    text-decoration: underline;
    cursor: pointer;
  }

  blockquote {
    border-left: 4px solid var(--vines-accent-soft);
    padding: 0px 5px 2px 12px;
    margin: 10px 0px 0px 0px;
  }

  mark {
    padding: 0px 2px 0px 2px;
  }

  code {
    background: var(--vines-surface-2);
    font-family: var(--vines-font-mono);
    padding: 5px;
  }

  pre > code {
    display: block;
  }

  .mention {
    background: var(--vines-surface-tint);
    color: var(--vines-ink-hint);
    padding: 0px 3px 0px 2px;
    border-radius: var(--vines-radius-s);
    text-decoration: none;
  }

  .not-received {
    color: var(--vines-warning);
  }

  .fail {
    background: color-mix(in srgb, var(--vines-negative) 12%, transparent);
  }

  .timeHr {
    border: none;
    border-bottom: 2px dashed var(--vines-border);
    flex-grow: 1;
    height: 0px;
  }
`;


const DOCUMENT_STYLE_ID = "vines-theme";

/**
 * Apply the theme at document level: a `<style>` in `<head>` plus, when the
 * platform supports it, an adopted stylesheet, so the `html:root` overrides
 * win against frameworks that inject their own theme parameters either way.
 * Safe to call more than once.
 */
export function installDocumentTheme(doc: Document = document): void {
  if (doc.head.querySelector(`#${DOCUMENT_STYLE_ID}`)) {
    return;
  }
  const text = vinesTokens.cssText + "\n" + frameworkTokenMap.cssText + "\n" + themeStyles.cssText;
  const style = doc.createElement("style");
  style.id = DOCUMENT_STYLE_ID;
  style.textContent = text;
  doc.head.appendChild(style);
  if (typeof CSSStyleSheet !== "undefined" && "adoptedStyleSheets" in doc) {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
    } catch {
      /* constructable stylesheets unsupported: the <style> tag carries the theme alone */
    }
  }
}
