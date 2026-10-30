import {test} from "node:test";
import assert from "node:assert/strict";
import {palette, vinesTokens, frameworkTokenMap, themeStyles, installDocumentTheme} from "./theme.ts";

const SPEC_TOKENS = [
  "--vines-page-bg", "--vines-surface", "--vines-surface-2", "--vines-surface-tint",
  "--vines-sidebar-row-selected", "--vines-sidebar-row-hover", "--vines-row-hover",
  "--vines-ink", "--vines-ink-muted", "--vines-ink-hint", "--vines-link",
  "--vines-accent", "--vines-accent-soft", "--vines-accent-alt",
  "--vines-positive", "--vines-negative", "--vines-warning",
  "--vines-radius-s", "--vines-radius-m", "--vines-radius-l", "--vines-radius-pill",
  "--vines-shadow-card", "--vines-shadow-row", "--vines-shadow-pop", "--vines-border",
  "--vines-font", "--vines-font-mono", "--vines-text-s", "--vines-text-m", "--vines-text-l",
];

test("palette carries the spec's hex values", () => {
  assert.equal(palette.ink, "#151a11");
  assert.equal(palette.accent, "#4c6a39");
  assert.equal(palette.accentAlt, "#7461eb");
  assert.equal(palette.pageBgTop, "#e0eed5");
  assert.equal(palette.pageBgBottom, "#f5f5f3");
  assert.equal(palette.negative, "#c10a0a");
});

test("vinesTokens declares every spec token", () => {
  const text = vinesTokens.cssText;
  for (const name of SPEC_TOKENS) {
    assert.ok(text.includes(`${name}:`), `missing ${name}`);
  }
});

test("vinesTokens uses the spec values", () => {
  const text = vinesTokens.cssText.replace(/\s+/g, " ");
  assert.ok(text.includes("--vines-page-bg: linear-gradient(180deg, #e0eed5 0%, #f5f5f3 55%)"));
  assert.ok(text.includes("--vines-radius-l: 12px"));
  assert.ok(text.includes("--vines-shadow-card: 0 1px 3px rgba(21,26,17,0.06)"));
  assert.ok(text.includes("--vines-font: 'Inter Variable'"));
});

test("frameworkTokenMap derives third-party tokens from vines tokens", () => {
  const text = frameworkTokenMap.cssText.replace(/\s+/g, " ");
  assert.ok(text.includes("html:root"));
  assert.ok(text.includes("--sapFontFamily: var(--vines-font)"));
  assert.ok(text.includes("--sapBrandColor: var(--vines-accent)"));
  assert.ok(text.includes("--sl-font-sans: var(--vines-font)"));
  assert.ok(text.includes("--lumo-font-family: var(--vines-font)"));
  assert.doesNotMatch(text, /#[0-9a-fA-F]{3,8}\b/, "no raw hex in the framework map");
});

test("frameworkTokenMap covers every UI5 font family parameter", () => {
  const text = frameworkTokenMap.cssText.replace(/\s+/g, " ");
  for (const p of ["--sapFontBoldFamily", "--sapFontSemiboldFamily", "--sapFontSemiboldDuplexFamily",
                   "--sapFontHeaderFamily", "--sapFontLightFamily", "--sapFontBlackFamily",
                   "--sapButton_FontFamily", "--sapButton_Emphasized_FontFamily",
                   "--_ui5_switch_text_with_label_font_family"]) {
    assert.ok(text.includes(`${p}: var(--vines-font)`), `missing ${p}`);
  }
  assert.ok(text.includes("--sapContent_MonospaceFontFamily: var(--vines-font-mono)"));
});

test("frameworkTokenMap neutralises Horizon's blue hover, selected and field styles", () => {
  const text = frameworkTokenMap.cssText.replace(/\s+/g, " ");
  for (const p of ["--sapButton_Lite_Hover_TextColor", "--sapButton_Emphasized_Hover_Background",
                   "--sapButton_Emphasized_Hover_BorderColor", "--sapButton_IconColor",
                   "--sapButton_Selected_Background", "--sapButton_Selected_BorderColor",
                   "--sapButton_Selected_TextColor", "--sapButton_Track_Selected_Background",
                   "--sapButton_Track_Selected_BorderColor", "--sapContent_BusyColor",
                   "--sapField_Hover_BorderColor", "--sapField_Active_BorderColor",
                   "--sapList_SelectionBorderColor", "--sapList_Active_Background", "--sapLink_Hover_Color",
                   "--sapButton_Active_BorderColor", "--sapButton_Active_TextColor"]) {
    assert.match(text, new RegExp(`${p}: [^;]*var\\(--vines-`), `missing ${p}`);
  }
  assert.ok(text.includes("--sapField_BackgroundStyle: none"));
  assert.ok(text.includes("--sapField_Hover_BackgroundStyle: none"));
  assert.ok(text.includes("--sapField_Shadow: none"));
  assert.ok(text.includes("--sapField_Hover_Shadow: none"));
});

test("frameworkTokenMap gives popups the spec radius and shadow", () => {
  const text = frameworkTokenMap.cssText.replace(/\s+/g, " ");
  assert.ok(text.includes("--_ui5_popup_border_radius: var(--vines-radius-l)"));
  for (const p of ["--sapContent_Shadow0", "--sapContent_Shadow1", "--sapContent_Shadow2", "--sapContent_Shadow3"]) {
    assert.ok(text.includes(`${p}: var(--vines-shadow-pop)`), `missing ${p}`);
  }
});

test("frameworkTokenMap rounds the field focus ring to the field corner", () => {
  const text = frameworkTokenMap.cssText.replace(/\s+/g, " ");
  assert.ok(text.includes("--_ui5_input_focus_border_radius: calc(var(--vines-radius-m) - var(--sapField_BorderWidth))"));
});

test("themeStyles has no raw colors", () => {
  assert.doesNotMatch(themeStyles.cssText, /#[0-9a-fA-F]{3,8}\b/);
});

test("installDocumentTheme appends one style tag and is idempotent", () => {
  const appended: any[] = [];
  const doc: any = {
    head: {
      querySelector: (sel: string) => appended.find(e => `#${e.id}` === sel) ?? null,
      appendChild: (el: any) => { appended.push(el); return el; },
    },
    createElement: (_tag: string) => ({id: "", textContent: ""}),
    adoptedStyleSheets: [],
  };
  installDocumentTheme(doc);
  installDocumentTheme(doc);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].id, "vines-theme");
  assert.ok(appended[0].textContent.includes("--vines-ink:"));
  assert.ok(appended[0].textContent.includes("--sapFontFamily:"));
});
