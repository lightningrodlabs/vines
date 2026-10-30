# Soft Paper UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin Vines to the Moss "soft paper" look on one token layer, move UI5 Web Components from 1.13.3 to 2.x on the Horizon theme, and remove every hardcoded color, font and shadow-root style hack.

**Architecture:** A single `theme.ts` in `webcomponents` owns every color, radius, shadow and font as `--vines-*` CSS custom properties, plus a derived map onto the three third-party token sets in play (`--sap*` for UI5, `--sl-*` for Shoelace, `--lumo-*` for the Vaadin files table). It is applied once at document level by `vines-page.ts` (which both the standalone webapp and the we-applet import) and reused by every Lit component through `vinesTokens`. A Node script enforces "no color literals outside the theme file" in the build. The UI5 2.x migration is an API rename pass over known call sites, done after the tokens exist so it is not mixed with color work.

**Tech Stack:** Lit 3.3, TypeScript, Vite 7, UI5 Web Components 2.28.1, Shoelace 2.20.1, `@fontsource-variable/inter` 5.3.0, Node 22 (`node:test`, `fs.globSync`).

**Spec:** `docs/superpowers/specs/2026-10-29-soft-paper-ui-design.md`

## Global Constraints

- Lit, TypeScript, Vite 7, `lit-localize` stay as they are. No zome, DNA, conductor or view-model changes.
- UI5 packages are pinned exact: `@ui5/webcomponents`, `@ui5/webcomponents-fiori`, `@ui5/webcomponents-icons`, and (new, since it is imported directly) `@ui5/webcomponents-base`, all `=2.28.1`.
- Shoelace stays at `2.20.1`. `@ddd-qc/path-explorer` is not upgraded; it is deep-imported for its view model only.
- No fonts from a CDN. Inter is bundled from `@fontsource-variable/inter`; UI5's default font loading is disabled.
- Token values are the spec's, verbatim (tables under "The visual specification"). Token names are `--vines-*` exactly as the spec lists them.
- No color literal (hex, `rgb()`, `rgba()`, `hsl()`, or a CSS named color used as a property value) anywhere under `webcomponents/src` or `webapp/src` except `webcomponents/src/theme.ts` and `webcomponents/src/markdown/code-css.ts` (the highlight.js syntax palette, exempt by builder decision) and `generated/`. Inline `style="..."` attributes and plain TS strings count.
- The same look ships standalone (Tauri), on Android, and inside Moss. Light theme only.
- Every task leaves `npm run build:webapp` green. Commit messages carry no `Co-Authored-By` or generator trailer.
- Work happens on branch `hdk-7.0`. The working tree already has uncommitted edits in `webapp/src/vines-page.ts`, `webcomponents/src/features/chat-thread/chat-header.ts`, `webcomponents/src/features/chat-thread/comment-thread-view.ts`, `webcomponents/src/utils.ts`; commit or stash those before Task 1 and do not fold them into this plan's commits.

## Review Focus

1. **Theme override order vs. UI5 2.x.** UI5 injects its theme parameters at boot; if it uses `document.adoptedStyleSheets`, a plain `<style>` with `:root` loses the cascade and `--sapFontFamily` stays "72". Expected: computed `--sapFontFamily` on `<html>` starts with `Inter`. Pinned in Task 2 step 9 and Task 3 step 10.
2. **Shoelace `light.css` loads twice in the we-applet** (bundled via `vines-page.ts` and linked as `styles.css`). Expected: computed `--sl-font-sans` is Inter inside Moss too. Pinned in Task 4 step 6.
3. **Popovers after the static-area removal.** The mention-suggestion popover in the input bar and the search popover open relative to their `opener`; with 2.x they render inside the component shadow DOM via the popover API. Expected: both open anchored to the field, on top of everything, and close on outside click. Pinned in Task 3 step 10.
4. **Offline startup.** Expected: no request to `jsdelivr.net`, `sdk.openui5.org` or any other host for fonts or assets at startup. Pinned in Task 2 step 8 (grep of `dist/`) and Task 9 step 3.
5. **Selectors that silently stop matching after the rename.** `ui5-badge { }` rules in `styles.ts` and component styles match nothing once the tag is `ui5-tag`. Expected: zero `ui5-badge` occurrences in source after Task 3. Pinned in Task 3 step 6.

---

### Task 1: Color-literal checker

**Files:**
- Create: `scripts/color-literals.mjs`
- Create: `scripts/color-literals.test.mjs`
- Modify: `package.json` (root `scripts`)

**Interfaces:**
- Produces: `findColorLiterals(source: string): Array<{line: number, match: string}>` (1-based lines) and `checkFiles(paths: string[]): Array<{file: string, line: number, match: string}>`, both exported from `scripts/color-literals.mjs`. CLI: `node scripts/color-literals.mjs [--count]` scans the default globs, prints `file:line: match` per finding (or only the total with `--count`), exits 1 when any finding exists.
- Detection rules, exactly:
  - hex: `#` followed by 3, 4, 6 or 8 hex digits, not preceded by `[A-Za-z0-9_-]` and not followed by `[A-Za-z0-9_-]`.
  - functions: `rgb(`, `rgba(`, `hsl(`, `hsla(` (case-insensitive).
  - named colors: one of `white black red blue green gray grey yellow orange purple pink silver navy teal lime maroon olive aqua fuchsia brown cyan magenta gold violet indigo crimson salmon coral tomato lightgray lightgrey darkgray darkgrey dimgray dimgrey lightblue lightgreen darkgreen darkblue darkred whitesmoke` immediately after `:` and optional spaces, followed by optional spaces and one of `; " ' ! ) }` or end of line (so `color: blue;` and `background:white"` match, `msg("green")` does not).
  - a line containing `color-ok` in a comment is skipped.
- Default globs: `webcomponents/src/**/*.ts`, `webapp/src/**/*.ts`; excluded: any path containing `/generated/`, `webcomponents/src/theme.ts`, `webcomponents/src/markdown/code-css.ts`.

- [ ] **Step 1: Write the failing tests** in `scripts/color-literals.test.mjs` using `node:test` and `node:assert/strict`:

```js
import {test} from "node:test";
import assert from "node:assert/strict";
import {findColorLiterals} from "./color-literals.mjs";

test("finds hex of lengths 3, 4, 6, 8", () => {
  const src = "a{color:#fff}\nb{color:#ffff}\nc{color:#F6FAFC}\nd{color:#c6ddf594}";
  assert.deepEqual(findColorLiterals(src).map(f => f.line), [1, 2, 3, 4]);
});
test("ignores css ids and html entities", () => {
  assert.deepEqual(findColorLiterals("#topBar{}\n#leftSide {}\n&#123;"), []);
});
test("finds rgb/rgba/hsl", () => {
  const src = "x: rgb(1,2,3);\ny: RGBA(0,0,0,.5);\nz: hsl(1 2 3)";
  assert.equal(findColorLiterals(src).length, 3);
});
test("finds named colors only as property values", () => {
  const src = 'color: blue;\nbackground:white"\nmsg("green")\nconst x = "red"';
  assert.deepEqual(findColorLiterals(src).map(f => f.line), [1, 2]);
});
test("skips lines marked color-ok", () => {
  assert.deepEqual(findColorLiterals("x: #fff; /* color-ok */"), []);
});
test("reports 1-based line and the matched text", () => {
  assert.deepEqual(findColorLiterals("\n\nq: #abc;"), [{line: 3, match: "#abc"}]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/`
Expected: FAIL, module `./color-literals.mjs` not found.

- [ ] **Step 3: Implement `scripts/color-literals.mjs`**

Exports `findColorLiterals`, `checkFiles` and runs the CLI when `import.meta.url` matches `process.argv[1]`. Use `fs.globSync` (Node 22) for the default globs.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/`
Expected: 6 passing.

- [ ] **Step 5: Add root scripts and run the CLI against the current tree**

In root `package.json` add `"check:colors": "node scripts/color-literals.mjs"` and `"test:scripts": "node --test scripts/"`.
Run: `npm run check:colors -- --count`
Expected: a number in the low hundreds and exit code 1. Record the number in the commit message; later tasks drive it to 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/color-literals.mjs scripts/color-literals.test.mjs package.json
git commit -m "scripts: color-literal checker for the UI token migration"
```

---

### Task 2: Token layer, Inter font, document-level theme

**Files:**
- Create: `webcomponents/src/theme.ts`
- Modify: `webapp/src/vines-page.ts:170-280` (module-level imports and `setBasePath`)
- Modify: `webapp/index.html:16-25` (remove the `data-ui5-font-face` block, keep the scrollbar rule by moving it to `theme.ts`)
- Delete: `webapp/public/global.css`
- Modify: `webcomponents/package.json` (add `@fontsource-variable/inter`)

**Interfaces:**
- Produces, from `webcomponents/src/theme.ts`:
  - `export const palette: Readonly<Record<PaletteKey, string>>` with keys `pageBgTop, pageBgBottom, surface, surface2, surfaceTint, sidebarRowSelected, ink, inkMuted, inkHint, link, accent, accentSoft, accentAlt, positive, negative, warning, border` and the spec's hex values. This is the only place a color hex is written.
  - `export const vinesTokens: CSSResult` — a `css` block declaring every `--vines-*` token from the spec on `:host, :root`. The `rgba()` tokens (`--vines-sidebar-row-hover`, `--vines-row-hover`, the three shadows) are written here as literals; the file is exempt from the checker.
  - `theme.ts` is re-exported from `webcomponents/src/index.ts` (add `export * from './theme';` next to the existing `export * from './styles';`), so consumers import from `@vines/elements` like the rest of `vines-page.ts` does.
  - `export const frameworkTokenMap: CSSResult` — declarations on `html:root` mapping third-party tokens to `--vines-*`: `--sapFontFamily, --sapFontSize, --sapBrandColor, --sapHighlightColor, --sapSelectedColor, --sapActiveColor, --sapTextColor, --sapLinkColor, --sapContent_LabelColor, --sapContent_FocusColor, --sapBackgroundColor, --sapBaseColor, --sapShell_Background, --sapGroup_ContentBackground, --sapGroup_ContentBorderColor, --sapList_Background, --sapList_BorderColor, --sapList_Hover_Background, --sapList_SelectionBackgroundColor, --sapButton_Background, --sapButton_BorderColor, --sapButton_TextColor, --sapButton_Hover_Background, --sapButton_Lite_TextColor, --sapButton_Lite_Hover_Background, --sapButton_Emphasized_Background, --sapButton_Emphasized_BorderColor, --sapButton_Emphasized_TextColor, --sapButton_BorderCornerRadius, --sapElement_BorderCornerRadius, --sapField_BorderCornerRadius, --sapPopover_BorderCornerRadius, --sapTile_BorderCornerRadius, --sapField_Background, --sapField_BorderColor, --sapField_Hover_Background, --sapField_Focus_BorderColor, --sapField_PlaceholderTextColor, --sapPositiveColor, --sapNegativeColor, --sapCriticalColor, --sapInformativeColor, --sapContent_BadgeBackground, --sapContent_BadgeTextColor, --sapScrollBar_FaceColor, --sapScrollBar_TrackColor`; `--sl-font-sans, --sl-color-primary-50/100/.../900` (derive the scale from `--vines-accent` with `color-mix(in srgb, var(--vines-accent) N%, white)` for 50..400 and `..., black)` for 600..900), `--sl-color-neutral-0/50/100/.../1000`, `--sl-border-radius-small/medium/large/x-large`, `--sl-input-border-radius-medium`, `--sl-input-background-color`, `--sl-input-border-color`, `--sl-input-focus-ring-color`, `--sl-shadow-small/medium/large`; `--lumo-font-family, --lumo-primary-color, --lumo-primary-text-color, --lumo-base-color, --lumo-body-text-color, --lumo-secondary-text-color, --lumo-contrast-5pct/10pct/20pct, --lumo-border-radius-s/m/l, --lumo-error-color, --lumo-success-color`.
  - `export const themeStyles: CSSResult` — the token-based element rules that today live in `sharedStyles` (`blockquote`, `code`, `pre > code`, `mark`, `.mention`, `.linky`, `.not-received`, `.fail`, `.timeHr`), rewritten to tokens; plus the global thin-scrollbar rule from `index.html` as `* { scrollbar-width: thin; scrollbar-color: ... }` using `--vines-border` and `transparent`.
  - `export function installDocumentTheme(): void` — idempotent; appends `<style id="vines-theme">` to `document.head` containing `vinesTokens.cssText + frameworkTokenMap.cssText + themeStyles.cssText`, and also pushes the same text as a `CSSStyleSheet` onto `document.adoptedStyleSheets` (both, so the override wins regardless of how the frameworks inject theirs).
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Add the font package**

Run: `npm install -w webcomponents @fontsource-variable/inter@5.3.0 --save-exact`
Expected: `webcomponents/package.json` lists `"@fontsource-variable/inter": "5.3.0"`.

- [ ] **Step 2: Write `webcomponents/src/theme.ts`** with the exports above. Every `--vines-*` value is copied from the spec tables.

- [ ] **Step 3: Verify the checker exempts it and the type-checks pass**

Run: `npm run check:colors -- --count && npm run build -w webcomponents`
Expected: count unchanged from Task 1 (theme.ts is exempt); tsc succeeds.

- [ ] **Step 4: Wire the document theme and font in `webapp/src/vines-page.ts`**

At the top of the module, before any `@ui5/...` side-effect import, add in this order:
```ts
import "@fontsource-variable/inter";
import {setDefaultFontLoading} from "@ui5/webcomponents-base/dist/config/Fonts.js";
setDefaultFontLoading(false);
import {installDocumentTheme} from "@vines/elements";
installDocumentTheme();
```
(ES imports hoist; keep the two calls as the first statements and the UI5 imports after them. If `setDefaultFontLoading` is not exported by the installed 1.13.3 base, guard it until Task 3 with a dynamic import; remove the guard in Task 3.)

- [ ] **Step 5: Remove the CDN font from `webapp/index.html`**

Delete the whole `<style type="text/css" data-ui5-font-face>` block (lines 16-25). Nothing else in the file changes.

- [ ] **Step 6: Delete `webapp/public/global.css`**

Run: `git rm webapp/public/global.css && grep -rn "global.css" webapp we-applet --include=*.html --include=*.ts --include=*.json`
Expected: grep prints nothing.

- [ ] **Step 7: Build**

Run: `npm run build:webapp`
Expected: success; `webapp/dist/assets/` contains `inter-latin-wght-normal-*.woff2`.

- [ ] **Step 8: Verify no CDN font references in the build**

Run: `grep -rlE "jsdelivr|openui5.org" webapp/dist | wc -l`
Expected: `0`.

- [ ] **Step 9: Manual check, standalone**

Run: `npm run devtest` and open the app. In devtools console:
```js
getComputedStyle(document.documentElement).getPropertyValue("--vines-ink").trim()
getComputedStyle(document.documentElement).getPropertyValue("--sapFontFamily").trim()
```
Expected: `#151a11` and a value starting with `'Inter Variable'`. Body text is still "72"-shaped at this point for UI5 content (1.13 reads its own bundle), which is fine; the point is that the override is visible on `<html>`.

- [ ] **Step 10: Commit**

```bash
git add webcomponents/src/theme.ts webcomponents/package.json package-lock.json webapp/src/vines-page.ts webapp/index.html webapp/public/global.css
git commit -m "UI: token layer, bundled Inter, document-level theme"
```

---

### Task 3: UI5 2.28.1 on Horizon

**Files:**
- Modify: `webcomponents/package.json` (UI5 versions, add `@ui5/webcomponents-base`)
- Modify: `webapp/src/vines-page.ts` (136 side-effect imports at lines 17-160; call sites listed below)
- Modify: `webcomponents/src/elements/input-bar.ts`, `webcomponents/src/features/chat-thread/chat-item.ts`, `webcomponents/src/elements/listers/topics-lister.ts`, `webcomponents/src/elements/panels/confirm-dialog.ts`, `webcomponents/src/elements/panels/view-embed-dialog.ts`, `webcomponents/src/features/migration/export-files-dialog.ts`, `webcomponents/src/features/migration/export-summary-dialog.ts`, `webcomponents/src/features/migration/import-summary-dialog.ts`, `webcomponents/src/toast.ts`, `webcomponents/src/elements/panels/notification-list.ts`, `webcomponents/src/elements/panels/edit-profile.ts`, `webcomponents/src/features/rules/rules-edit.ts`, `webcomponents/src/features/favorites/favorites-view.ts`, `webcomponents/src/styles.ts`
- Modify: `webcomponents/src/viewModels/threads.dvm.ts:41` (path-explorer deep import)

**Interfaces:**
- Consumes: `installDocumentTheme()` from Task 2 (already called in `vines-page.ts`).
- Produces: a tree that compiles against UI5 2.28.1 with `setTheme("sap_horizon")` called at boot. Later tasks assume tag names `ui5-tag`, `ui5-li-group`, `ui5-menu-separator` and the `open`/`opener` property API.

- [ ] **Step 1: Bump packages**

In `webcomponents/package.json` set `@ui5/webcomponents`, `@ui5/webcomponents-fiori`, `@ui5/webcomponents-icons` to `"=2.28.1"` and add `"@ui5/webcomponents-base": "=2.28.1"`.
Run: `npm install && npm ls @ui5/webcomponents`
Expected: root resolves `2.28.1`; `@ddd-qc/path-explorer` shows a nested `1.13.3` (expected, unused after step 2).

- [ ] **Step 2: Detach path-explorer's UI5 1.x**

In `webapp/src/vines-page.ts` delete line 17 `import "@ddd-qc/path-explorer";`. In `webcomponents/src/viewModels/threads.dvm.ts:41` change the import to `import {PathExplorerZvm} from "@ddd-qc/path-explorer/dist/viewModels/path-explorer.zvm.js";`.
Run: `grep -rn "@ddd-qc/path-explorer\"" webcomponents/src webapp/src we-applet/src`
Expected: no bare package imports remain (the `dist/utils` type import in `authorship.perspective.ts` is fine).

- [ ] **Step 3: Set the theme at boot**

In `webapp/src/vines-page.ts`, next to `setDefaultFontLoading(false)` from Task 2, add `import {setTheme} from "@ui5/webcomponents-base/dist/config/Theme.js"; setTheme("sap_horizon");`. Remove any Task 2 dynamic-import guard.

- [ ] **Step 4: Rename moved modules in the side-effect imports** (`vines-page.ts` lines 17-160 and the few in `favorites-view.ts`, `comment-thread-view.ts`, `edit-profile.ts`, `tool-lister.ts`, `search-result-panel.ts`, `input-bar.ts`):

| 1.13 import | 2.28 import |
|---|---|
| `@ui5/webcomponents/dist/Badge.js` | `@ui5/webcomponents/dist/Tag.js` |
| `@ui5/webcomponents/dist/StandardListItem.js` | `@ui5/webcomponents/dist/ListItemStandard.js` |
| `@ui5/webcomponents/dist/CustomListItem.js` | `@ui5/webcomponents/dist/ListItemCustom.js` |
| `@ui5/webcomponents/dist/GroupHeaderListItem.js` | `@ui5/webcomponents/dist/ListItemGroup.js` |
| `@ui5/webcomponents-fiori/dist/Bar.js` | `@ui5/webcomponents/dist/Bar.js` |
| `@ui5/webcomponents-fiori/dist/NotificationAction.js` | removed; add `@ui5/webcomponents/dist/Menu.js` + `MenuItem.js` if not already imported |
| (new) | `@ui5/webcomponents/dist/MenuSeparator.js` |

Run: `npm run build -w webcomponents 2>&1 | grep -c "error TS"` to get the remaining error count; it drives steps 5-8.

- [ ] **Step 5: Rename tags and attributes in templates**

Apply across `webcomponents/src` and `webapp/src` (not `generated/`):
- `<ui5-badge` → `<ui5-tag` and `</ui5-badge>` → `</ui5-tag>` (34 sites). Any `design="Set3"` on them is dropped.
- `vines-page.ts:2746-2748`: `<ui5-list mode="None">` → `selection-mode="None"`; wrap the search options in `<ui5-li-group header-text=${msg("Search Options")}>…</ui5-li-group>` instead of the `ui5-li-groupheader` item.
- `placement-type="X"` → `placement="X"` (7 sites); `horizontal-align="Left"` → `"Start"`, `"Right"` → `"End"` (vines-page.ts, 2 sites).
- `starts-section` on `ui5-menu-item` (12 sites in `input-bar.ts` and `vines-page.ts`) → remove the attribute and insert `<ui5-menu-separator></ui5-menu-separator>` before that item.
- `<ui5-busy-indicator size="Small|Medium|Large">` → `"S|M|L"` (33 sites).
- `input-bar.ts:680` `growing-max-lines="10"` → `growing-max-rows="10"`.
- `busy` / `busy-delay` attributes on `ui5-list`, `ui5-menu`, `ui5-li-notification` → `loading` / `loading-delay`. `active` on `ui5-busy-indicator` is unchanged.
- `@after-open` → `@open`, `@after-close` → `@close` (4 sites).
- `notification-list.ts:86-96`: replace `<ui5-notification-action text="Jump" slot="actions" @click=…>` with `<ui5-menu slot="menu"><ui5-menu-item text="Jump"></ui5-menu-item></ui5-menu>` and move the handler to `@item-click` on the menu. `show-close` and `@close` on `ui5-li-notification` are unchanged.
- `vines-page.ts:1197` `topicsBtn.pressed = true` → `.selected = true` if `topicsBtn` is a `SegmentedButtonItem`; leave if it is a `ui5-button` with the Vines `.pressed` CSS class.
- `ValueState.Error/Warning/Success` → `ValueState.Negative/Critical/Positive` in `vines-page.ts`, `edit-profile.ts`, `rules-edit.ts`.

- [ ] **Step 6: Verify no stale selectors or tags remain**

Run: `grep -rnE "ui5-badge|ui5-li-groupheader|ui5-notification-action|placement-type|starts-section|after-open|after-close|growing-max-lines" webcomponents/src webapp/src --include=*.ts | grep -v generated | wc -l`
Expected: `0`. (This includes the `ui5-badge {` selectors in `styles.ts`, which must become `ui5-tag {`.)

- [ ] **Step 7: Replace the removed popup methods**

Sites: `vines-page.ts` (74), `input-bar.ts` (10), `chat-item.ts` (4), `export-files-dialog.ts` (3), `import-summary-dialog.ts` (2), `export-summary-dialog.ts` (2), `confirm-dialog.ts` (2), `toast.ts` (1), `view-embed-dialog.ts` (1), `topics-lister.ts` (1).
- `x.showAt(opener)` → `x.opener = opener; x.open = true;`
- `x.showAt(opener, true)` (the two search-popover sites, `vines-page.ts:2678,2693`) → also `x.preventInitialFocus = true;`
- `dialog.show()` → `dialog.open = true;`
- `x.close()` on a Dialog, Popover, Menu → `x.open = false;`
- `x.isOpen()` → `x.open`
- `toast.ts:37` `return toastElem.show();` → `toastElem.open = true;` and drop the `return` (no caller uses the return value; verified at planning time with a grep for `= toasty(`, `await toasty(`, `return toasty(`, which found nothing).
Add a small helper to avoid 90 near-identical edits: in `webcomponents/src/utils.ts` export `openAt(popup: {opener?: HTMLElement, open: boolean, preventInitialFocus?: boolean}, opener: HTMLElement, preventInitialFocus = false): void`.

- [ ] **Step 8: Build until clean**

Run: `npm run build:webapp`
Expected: success. Any remaining `error TS` is one of the migration guide's renames (`busy→loading`, `mode→selectionMode`, `iconEnd→endIcon`, `cardHeader status→additionalText`); fix it from the guide at `docs/09-migration-guides/01-to-version-2.md` in the UI5/webcomponents repo.

- [ ] **Step 9: Run the checker to confirm this task added no literals**

Run: `npm run check:colors -- --count`
Expected: the Task 1 number or lower.

- [ ] **Step 10: Manual check, standalone**

Run: `npm run devtest`. Verify, in this order:
1. Console: `getComputedStyle(document.documentElement).getPropertyValue("--sapFontFamily")` starts with `'Inter Variable'`, and a `ui5-button`'s label renders in Inter (inspect, computed `font-family`). If it still renders "72", the `html:root` block lost the cascade; make `installDocumentTheme()` re-run `document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]` after `setTheme()` resolves (`await setTheme(...)` then install), and re-check.
2. Horizon look is visible: rounded buttons, blue focus rings replaced by the green accent.
3. Input bar: type `@` and see the mention-suggestion popover anchored to the field; pick a name; type `:` for emoji; open the settings menu with separators.
4. Search field: type and see the search popover anchored below it; outside click closes it.
5. New channel dialog, new DM dialog, edit-profile dialog open and close; toast appears on sending a message.
6. Notification panel: the "Jump" menu item opens the thread.

- [ ] **Step 11: Commit**

```bash
git add -A webcomponents/src webapp/src webcomponents/package.json package-lock.json
git commit -m "UI: UI5 Web Components 2.28.1 on Horizon; path-explorer deep import"
```

---

### Task 4: Remove shadow-root style injections

**Files:**
- Modify: `webcomponents/src/styles.ts:181-280` (the six `*StyleTemplate` exports)
- Modify: `webcomponents/src/elements/input-bar.ts:175-192`, `webapp/src/vines-page.ts:1200-1206`, `webapp/src/vines-app.ts:365-370` (the 9 `shadowRoot!.appendChild(...)` sites)
- Modify: `webcomponents/src/theme.ts` (`frameworkTokenMap` additions)
- Modify: `we-applet/vite.config.ts:44-48` and `we-applet/index.html:10` (drop the second Shoelace `light.css`)

**Interfaces:**
- Consumes: `frameworkTokenMap` from Task 2.
- Produces: `styles.ts` no longer exports any `*Template`; `input-bar.ts` exposes nothing new.

- [ ] **Step 1: Replace each template with parts or variables**

| Template | Replacement |
|---|---|
| `inputBarStyleTemplate` (borderless textarea, full-width bar mid content) | on `ui5-textarea`: `::part(textarea)` border none; on `ui5-bar`: `::part(content)`/layout via its documented parts in 2.x, else `--sapField_BorderColor: transparent` scoped to the input bar host |
| `suggestionListTemplate` (`overflow: hidden` on list scroll container) | `ui5-list::part(…)` if exposed; otherwise set `max-height`/`overflow` on the `ui5-list` host |
| `shellBarStyleTemplate` (title size, button color, pressed shadow) | `ui5-button` host rules in `vines-page.ts` styles using `--sapButton_*` already mapped; `.pressed` stays a Vines class |
| `searchFieldStyleTemplate` (grey rounded input, placeholder color) | `--sapField_Background`, `--sapField_BorderCornerRadius: var(--vines-radius-pill)`, `--sapField_PlaceholderTextColor` set on `#search-field` host |
| `cardStyleTemplate` (card padding) | `ui5-card::part(root)` padding if exposed, else inner wrapper div |
| `popoverStyleTemplate` (`min-width: 10px`) | `ui5-popover::part(content)` or host `--_ui5_popover_min_width`; if neither works, drop (Horizon popovers already size to content) |

Delete the six exports and the 9 `appendChild` call sites.

- [ ] **Step 2: Verify none remain**

Run: `grep -rnE "StyleTemplate|suggestionListTemplate|shadowRoot!?\.appendChild" webcomponents/src webapp/src --include=*.ts | wc -l`
Expected: `0`.

- [ ] **Step 3: Remove the duplicate Shoelace stylesheet in the we-applet**

In `we-applet/vite.config.ts` delete the `viteStaticCopy` target that renames `light.css` to `styles.css`; in `we-applet/index.html` delete `<link href="styles.css" rel="stylesheet"/>`. Keep the `assets` copy target (icons).

- [ ] **Step 4: Build both targets**

Run: `npm run build:webapp && npm run package`
Expected: both succeed; `we-applet/dist` has no `styles.css`.

- [ ] **Step 5: Manual check, standalone**

Run: `npm run devtest`. Verify the input bar textarea has no border, the mention suggestion list does not show a double scrollbar, the search field is pill-shaped and grey, and the profile card dialog has padding.

- [ ] **Step 6: Manual check, inside Moss**

Run: `npm run devtest:we`. In the applet frame console: `getComputedStyle(document.documentElement).getPropertyValue("--sl-font-sans")` starts with `'Inter Variable'`; an `sl-tooltip` renders in Inter; the files table header (Vaadin) renders in Inter.

- [ ] **Step 7: Commit**

```bash
git add -A webcomponents/src webapp/src we-applet/vite.config.ts we-applet/index.html
git commit -m "UI: replace shadow-root style injections with parts and theme variables"
```

---

### Literal-to-token mapping (used by Tasks 5-8)

Apply these substitutions when rewriting a component. Anything not listed maps to the nearest token by role (text, surface, border, accent), never by closest hue.

| Today | Token |
|---|---|
| `#fff`, `#ffffff`, `white` as a surface | `--vines-surface` |
| `#F6FAFC`, `#FBFCFD`, `#F4F9FC`, `#f7f7f7`, `#f5f5f5`, `#fdfdfd`, `#ECEAE9` as a panel/host background | `--vines-surface` for cards; `--vines-page-bg` only on the `vines-page` host |
| `#f4f4f4`-like input/bubble fills, `#8080801a` code background | `--vines-surface-2` |
| `#c6ddf594` mention, `#fbfbfb9c` subject name | `--vines-surface-tint` |
| `#464646`, `#484848`, `#2f2f2f`, `#444`, `#32363a`, `#24292e`, `#202020`, `rgb(64,64,64)` | `--vines-ink` |
| `#6c6c6c`, `#6a6d70`, `#939393`, `#8a8f98`, `#525150`, `#B9B7B6`, `#ccc` as text | `--vines-ink-muted` |
| `blue`, `#0087ff`, `#588AD7`, `#4684FD`, `rgb(0,100,200)`, `#5804A8` links/accents | `--vines-link` for links, `--vines-accent` for controls |
| `#33A000`, `#359C07`, `#05b92f`, `rgb(178,200,90)` | `--vines-positive` (status) or `--vines-accent-soft` (badges, indicators) |
| `#c10a0a`, `red`, `#fdd` | `--vines-negative` (use `color-mix(in srgb, var(--vines-negative) 12%, transparent)` for the fill) |
| `#a8a187`, `rgb(161,147,7)` | `--vines-warning` |
| `#342D1F` unread badge | `--vines-accent-soft` |
| `#d1e15d` blockquote bar | `--vines-accent-soft` |
| `#d9d9d9`, `#dbdada`, `#dadada`, `#ececec`, `#e6e6e6`, `#ccc` as border | `--vines-border` |
| `rgb(222,232,255)`, `#d8e2f6`, `#e8f3ff` hover | `--vines-row-hover` |
| `rgba(255,255,255,.8)` sidebar hover | `--vines-sidebar-row-hover` |
| `border-radius` 2-6px | `--vines-radius-s`; 8-10px → `--vines-radius-m`; 12px+ → `--vines-radius-l`; 50%/999px pills → `--vines-radius-pill` |
| `font-family: "72"`, `'72-Light'`, `arial`, system stacks | `--vines-font`; monospace stacks → `--vines-font-mono` |
| `font-size: smaller`/`10px`/`12px` | `--vines-text-s`; `14px` → `--vines-text-m`; `16px`/`larger` → `--vines-text-l` |
| `box-shadow` literals | `--vines-shadow-card`, `--vines-shadow-row`, or `--vines-shadow-pop` by role |

For an inline `style="color:#464646"` either replace the literal with `var(--vines-ink)` in place, or, when the same inline style repeats, add a class to the component's style block. For colors used from TypeScript (cytoscape, css-doodle, the toast background), import `palette` from `theme.ts`.

---

### Task 5: Rewrite page shell and shared styles

**Files:**
- Modify: `webcomponents/src/styles.ts` (what remains after Task 4)
- Modify: `webapp/src/vines-page.ts:3352-3782` (style block) and its 107 inline `style=` attributes
- Modify: `webapp/src/vines-index.ts`, `webapp/src/vines-app.ts`
- Modify: `webcomponents/src/toast.ts:19`, `webcomponents/src/render.ts:260`, `webcomponents/src/utils.ts`

**Interfaces:**
- Consumes: `vinesTokens`, `themeStyles`, `palette` from Task 2.
- Produces: `sharedStyles` in `styles.ts` keeps only structural rules (flex, padding, ellipsis, `.threadItem`/`.sideItem` layout) and includes `vinesTokens` and `themeStyles` via `[vinesTokens, themeStyles, css\`…\`]` so every component that already spreads `sharedStyles` gets tokens for free.

- [ ] **Step 1: Record the baseline**

Run: `node scripts/color-literals.mjs | grep -E "styles.ts|vines-page.ts|vines-index.ts|vines-app.ts|toast.ts|render.ts|utils.ts" | wc -l`
Expected: a number; it must reach 0 in step 4.

- [ ] **Step 2: Rewrite `styles.ts`** per the mapping. Make `sharedStyles` an array `[vinesTokens, themeStyles, css\`…\`]` (Lit accepts nested arrays in `styles`). Delete rules that only duplicated what `themeStyles` now holds.

- [ ] **Step 3: Rewrite `vines-page.ts`**

Host: `background: var(--vines-page-bg)`. `#topBar`: transparent. `#leftSide`: transparent, rows per spec (`.threadItem` → `--vines-radius-s`, selected `--vines-sidebar-row-selected` + `--vines-shadow-row`, hover `--vines-sidebar-row-hover`). `#centerSide` and `#rightSide`: `background: var(--vines-surface); border-radius: var(--vines-radius-l); box-shadow: var(--vines-shadow-card)`. Rewrite the 107 inline styles. `vines-index.ts:91` busy background → `var(--vines-surface)`; `vines-admin.ts` is Task 8.

- [ ] **Step 4: Rewrite the TS color strings**

`toast.ts:19` → `` style: `background:${palette.positive};` ``. `render.ts:260` → `var(--vines-accent-alt)` and `var(--vines-font)`. `utils.ts` sites: per mapping.

- [ ] **Step 5: Verify**

Run: `node scripts/color-literals.mjs | grep -E "styles.ts|vines-page.ts|vines-index.ts|vines-app.ts|toast.ts|render.ts|utils.ts" | wc -l && npm run build:webapp`
Expected: `0`, then a green build.

- [ ] **Step 6: Manual check**

Run: `npm run devtest`. Verify the soft-paper frame: gradient page, transparent sidebar with white selected row, white rounded center card and comment card, Inter everywhere outside third-party widgets. Resize to under 500px wide: the layout still collapses the sidebar as before.

- [ ] **Step 7: Commit**

```bash
git add -A webcomponents/src webapp/src
git commit -m "UI: page shell and shared styles on tokens"
```

---

### Task 6: Rewrite the chat-thread feature

**Files:**
- Modify (all under `webcomponents/src/features/chat-thread/`): `chat-item.ts` (16 literals, 39 inline), `chat-thread-view.ts` (9, 15), `comment-thread-view.ts` (8, 15), `side-item.ts` (8, 9), `chat-file.ts` (9, 11), `chat-attachment.ts` (6, 4), `chat-header.ts` (6, 3), `chat-thread-multi-view.ts` (5, 10), `chat-wal.ts` (3, 3), `chat-text.ts` (0, 2), `chat-text-edit.ts` (0, 2), `audio-panel.ts` (0, 7)
- Modify: `webcomponents/src/elements/emoji-bar.ts`, `webcomponents/src/elements/copy-wal-button.ts`, `webcomponents/src/elements/wurl-link.ts`

**Interfaces:**
- Consumes: `sharedStyles` (now token-bearing) from Task 5. Components that do not already include `sharedStyles` add `vinesTokens` to their `styles` array.

- [ ] **Step 1: Baseline**

Run: `node scripts/color-literals.mjs | grep -E "features/chat-thread|emoji-bar|copy-wal-button|wurl-link" | wc -l`
Expected: a number; must reach 0.

- [ ] **Step 2: Rewrite per the mapping.** Message rows: no bubbles, hover `--vines-row-hover`. The comments pill (`chat-item.ts` comment count) uses `--vines-accent-alt` on white text. Comment bubbles in `comment-thread-view.ts` use `--vines-surface-2` and `--vines-radius-m`. Validation/"not received" states use `--vines-warning`, failure `--vines-negative`.

- [ ] **Step 3: Verify**

Run: `node scripts/color-literals.mjs | grep -E "features/chat-thread|emoji-bar|copy-wal-button|wurl-link" | wc -l && npm run build:webapp`
Expected: `0`, green build.

- [ ] **Step 4: Manual check**

Run: `npm run devtest`. Open a channel with messages, files and a comment thread; hover a message (toolbar appears, row tints); open an image attachment; edit a message; react with an emoji; reply.

- [ ] **Step 5: Commit**

```bash
git add -A webcomponents/src
git commit -m "UI: chat thread components on tokens"
```

---

### Task 7: Rewrite listers, input bar, panels

**Files:**
- Modify (`webcomponents/src/elements/`): `input-bar.ts` (12, 11), `listers/topics-lister.ts` (11, 17), `listers/my-threads-lister.ts` (10, 25), `listers/history-lister.ts` (9, 11), `listers/tool-lister.ts` (5, 14), `listers/dm-lister.ts` (1, 7), `listers/dm-multi-lister.ts` (1, 6), `panels/network-health-panel.ts` (16, 6), `panels/profile-panel.ts` (4, 14), `panels/edit-profile.ts` (2, 15), `panels/presence-panel.ts` (2, 5), `panels/create-thread-panel.ts` (0, 4), `panels/confirm-dialog.ts`, `panels/view-embed-dialog.ts`, `panels/search-result-panel.ts`, `panels/notification-list.ts`, `peer-list.ts` (4, 12), `peer-status-badge.ts` (3, 1)
- Modify: `webcomponents/src/features/favorites/favorites-item.ts` (5, 3), `favorites-view.ts` (1, 4), `webcomponents/src/features/timezone/timezone-picker.ts` (4, 0)

- [ ] **Step 1: Baseline**

Run: `node scripts/color-literals.mjs | grep -E "elements/(input-bar|listers|panels|peer-)|features/(favorites|timezone)" | wc -l`

- [ ] **Step 2: Rewrite per the mapping.** Sidebar listers: section headers `--vines-text-s`, uppercase, `--vines-ink-muted`; badges `ui5-tag` with `--vines-accent-soft` background and `--vines-radius-pill`. Input bar: `--vines-surface-2`, `--vines-radius-m`, no border; send button `--vines-accent`. Network-health status colors: positive/warning/negative tokens.

- [ ] **Step 3: Verify**

Run the step 1 command again and `npm run build:webapp`.
Expected: `0`, green build.

- [ ] **Step 4: Manual check**

Run: `npm run devtest`. Collapse and expand sidebar sections; create a channel and a DM; favorite a message and open Favorites; open the network health panel; open edit-profile and change the avatar color (Shoelace color picker renders).

- [ ] **Step 5: Commit**

```bash
git add -A webcomponents/src
git commit -m "UI: listers, input bar and panels on tokens"
```

---

### Task 8: Rewrite admin, migration, rules, graphs

**Files:**
- Modify: `webapp/src/vines-admin.ts` (55, 60), `webapp/src/qr-scanner.ts` (13, 0)
- Modify (`webcomponents/src/features/`): `migration/import-summary.ts` (11, 7), `migration/export-summary-dialog.ts` (11, 6), `migration/export-files-dialog.ts` (6, 6), `migration/import-panel.ts` (1, 9), `migration/import-summary-dialog.ts`, `rules/rules-view.ts` (6, 5), `rules/rules-edit.ts` (6, 16)
- Modify: `webcomponents/src/elements/graph.ts` (7 cytoscape color strings), `webcomponents/src/doodles.ts` (css-doodle palettes)

- [ ] **Step 1: Baseline**

Run: `node scripts/color-literals.mjs | grep -E "vines-admin|qr-scanner|features/(migration|rules)|graph.ts|doodles.ts" | wc -l`

- [ ] **Step 2: Rewrite per the mapping.** `graph.ts` and `doodles.ts` read from `palette` (import from `../theme` / `./theme`). Admin tables use `--vines-surface`, `--vines-border` hairlines, `--vines-radius-l` containers.

- [ ] **Step 3: Verify the whole tree is clean**

Run: `npm run check:colors`
Expected: no output, exit code 0.

- [ ] **Step 4: Build and manual check**

Run: `npm run build:webapp && npm run devtest`. Open the admin page (the route or toggle `vines-admin.ts` is mounted from); run an export summary; open rules edit; view the relationship graph; scan-QR panel renders.

- [ ] **Step 5: Commit**

```bash
git add -A webcomponents/src webapp/src
git commit -m "UI: admin, migration, rules and graph on tokens"
```

---

### Task 9: Enforce the check in the build and verify all targets

**Files:**
- Modify: `package.json` (root `build:webapp`)
- Modify: `docs/superpowers/specs/2026-10-29-soft-paper-ui-design.md` (status line)

- [ ] **Step 1: Wire the checker into the build**

Change root `build:webapp` to `node scripts/generate-version.js && npm run check:colors && npm run build:localize && npm run build -w webcomponents && npm run build -w webapp`.

- [ ] **Step 2: Prove it bites**

Add `color: #123456;` to any `css` block in `webcomponents/src/elements/peer-list.ts`, run `npm run build:webapp`.
Expected: fails naming `peer-list.ts` and the line. Revert the edit; run again.
Expected: success.

- [ ] **Step 3: Offline and third-party checks on the built standalone app**

Run: `grep -rlE "jsdelivr|openui5.org|fonts.googleapis" webapp/dist | wc -l`
Expected: `0`.
Run: `grep -rn "ui5-badge\|StyleTemplate" webapp/dist/assets/*.js | wc -l`
Expected: `0`.

- [ ] **Step 4: Inside Moss, two agents**

Run: `npm run devtest:we`. With two agents: send messages both ways, mention the other agent, attach a file and confirm the files table renders in Inter on a white card, open a WAL embed from the other agent. In the applet console confirm `--sl-font-sans` and `--lumo-font-family` both resolve to Inter.

- [ ] **Step 5: Android build**

Run: `npm run build:android`
Expected: `artifacts/vines-<version>.apk` is produced. (No device run required.)

- [ ] **Step 6: Test suites still pass**

Run: `npm run test:scripts && npm test -w webcomponents`
Expected: both pass (the webcomponents suite may report no tests; that is unchanged from before).

- [ ] **Step 7: Mark the spec as implemented and commit**

Change the spec's `Status:` line to `implemented 2026-xx-xx (plan: docs/superpowers/plans/2026-10-29-soft-paper-ui.md)` with today's date.

```bash
git add package.json docs/superpowers/specs/2026-10-29-soft-paper-ui-design.md
git commit -m "build: fail on color literals outside the theme; soft paper UI complete"
```

- [ ] **Step 8: Hand over for visual sign-off**

The owner does the final look-and-feel pass standalone and inside Moss. Anything they want nudged is a follow-up edit to `theme.ts` values only.
