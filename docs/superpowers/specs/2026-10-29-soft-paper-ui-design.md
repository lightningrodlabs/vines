# Vines "soft paper" UI refresh

Date: 2026-10-29
Status: draft, awaiting approval
Branch: `hdk-7.0`

## Intent

Vines is a Holochain threaded-chat app that mostly runs as a tool inside Moss. Its UI is a Lit 3 web-components app built on SAP UI5 Web Components 1.13 (mid-2023, pinned) with the UI5 default `sap_fiori_3` theme, the SAP "72" font, a secondary sprinkling of Shoelace 2.20, and about 320 hand-placed hex colors spread across 48 component style blocks. It looks like a 2019 enterprise app and does not look like it belongs inside Moss.

The owner wants Vines to adopt the "soft" look of the Moss home screen: rounded corners, gentle gradients, Moss's greens, Inter. Of three mocked directions (translucent "Moss glass", flat "soft paper", and a lightly tinted UI5 Horizon baseline) the owner chose **soft paper**.

This is a skin change. Layout, features, data flow and the view-model layer do not change.

## Goals

1. Vines looks like a Moss-native tool: soft paper surfaces, Moss greens, Inter, 8 to 12 px corners.
2. One token layer. Every color, radius, shadow and font in the UI comes from a named CSS custom property defined in one place. No hex, rgb or named color literals in component styles.
3. UI5 Web Components upgraded from 1.13.3 to the current 2.x line, on the Horizon theme, so component chrome (buttons, inputs, dialogs, lists, menus) is modern and so the codebase stops being pinned to a two-year-old major.
4. No more reaching into UI5 shadow roots. The six `<style>` templates in `webcomponents/src/styles.ts` that get appended inside UI5 components' shadow roots are removed, replaced by UI5 CSS variables and `::part()` where needed.
5. The same look ships in every runtime: inside Moss (we-applet), the standalone Tauri desktop build, and the Android build.

## Non-goals

- A dark theme. Tokens are structured so dark is a second value set later, but no dark values ship in this round.
- Replacing Shoelace with UI5 or vice versa. Shoelace stays for the elements that already use it (tooltip, radio, color picker, a few dialogs and inputs). Moss uses the same Shoelace major.
- Layout, navigation, or interaction changes. Nothing moves.
- Inheriting live theme values from the Moss host. Vines runs in an iframe inside Moss; CSS custom properties do not cross that boundary. Token names mirror Moss's so a bridge could be added later, but this round hardcodes the values in Vines.
- Touching the Rust zomes, the DNA, or the view models.

## Anti-goals (what would make this a failure even if it "works")

- Text sitting on a gradient or on translucent panels. Message text and sidebar rows always sit on a flat surface. This is why glass was rejected.
- A half-migration where some components are on UI5 2.x look and others still carry Fiori 3 colors.
- New hardcoded colors creeping in. A build-time check must fail on color literals outside the token file.
- A regressed input bar, mention suggestions, or emoji picker. These are the most hacked-on UI5 elements and the most used; they must work as before.
- Breaking the Moss integration (we-applet entry, Weave API, WAL links) or the Android build.

## Constraints

- Lit 3.3, TypeScript, Vite 7, `lit-localize`. Keep all of them.
- Holochain 0.7.1 / HDK 7.0 branch. No conductor or zome changes.
- Moss 0.16 host, Weave API as pinned in `we-applet`.
- No end-to-end UI tests exist. Jest is set up for unit tests of non-UI code. Verification is `tsc` + Vite build + a manual run via `npm run devtest` (standalone) and `npm run devtest:we` (inside Moss).
- Fonts must ship in the bundle. The app runs offline and inside an iframe; no CDN font loading (the current "72" font is loaded from `sdk.openui5.org`, which is itself a defect).

## The visual specification (decided)

Values below come from the chosen mockup and from Moss's renderer (`moss/src/renderer/src/**`). They are the initial token values. The builder may nudge a value by a few percent for contrast but must not change the character.

### Surfaces

| Token | Value | Used for |
|---|---|---|
| `--vines-page-bg` | `linear-gradient(180deg, #e0eed5 0%, #f5f5f3 55%)` | the page behind everything |
| `--vines-surface` | `#ffffff` | message area card, comment panel card, dialogs, popovers |
| `--vines-surface-2` | `#f4f4f4` | input bar, message bubbles in the comment panel, search field hover |
| `--vines-surface-tint` | `#e0eed5` | subtle green fills: comment pill, selected tabs |
| `--vines-sidebar-row-selected` | `#ffffff` | selected channel row (sits on the gradient) |
| `--vines-sidebar-row-hover` | `rgba(255,255,255,0.6)` | hover on channel rows |
| `--vines-row-hover` | `rgba(21,26,17,0.04)` | hover on messages and list rows inside a white card |

### Ink

| Token | Value | Used for |
|---|---|---|
| `--vines-ink` | `#151a11` | body text, headings |
| `--vines-ink-muted` | `#757575` | timestamps, secondary labels, placeholders |
| `--vines-ink-hint` | `#324d47` | text on green tint, e.g. inside the comment pill |
| `--vines-link` | `#4c6a39` | links and mentions |

### Accents

| Token | Value | Used for |
|---|---|---|
| `--vines-accent` | `#4c6a39` | primary buttons (send), focus rings, active icons |
| `--vines-accent-soft` | `#85b46e` | unread badges, "new" indicators |
| `--vines-accent-alt` | `#7461eb` | the comments pill only, so threads stand out |
| `--vines-positive` | `#85b46e` | success states |
| `--vines-negative` | `#c10a0a` | errors, failed-to-publish |
| `--vines-warning` | `#a8a187` | pending / not-yet-validated |

### Shape and depth

| Token | Value | Used for |
|---|---|---|
| `--vines-radius-s` | `8px` | buttons, sidebar rows, chips |
| `--vines-radius-m` | `10px` | inputs, text areas, bubbles |
| `--vines-radius-l` | `12px` | cards, dialogs, popovers, panels |
| `--vines-radius-pill` | `999px` | badges, search field |
| `--vines-shadow-card` | `0 1px 3px rgba(21,26,17,0.06)` | white cards on the gradient |
| `--vines-shadow-row` | `0 1px 2px rgba(21,26,17,0.08)` | selected sidebar row |
| `--vines-shadow-pop` | `0 2px 8px rgba(0,0,0,0.12)` | dialogs, popovers, menus |
| `--vines-border` | `#e8e8e8` | hairlines where a border is unavoidable |

### Type

| Token | Value |
|---|---|
| `--vines-font` | `'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| `--vines-font-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |
| `--vines-text-s` | `12px` |
| `--vines-text-m` | `14px` |
| `--vines-text-l` | `16px` |

Inter is bundled via `@fontsource-variable/inter` (latin subset at minimum), imported once in the app entry, not fetched from a CDN. The "72" `@font-face` in `webapp/index.html` is removed.

### Layout regions, as they appear

- **Page**: `--vines-page-bg`. The `#F6FAFC` host background in `vines-page.ts` goes away.
- **Top bar**: transparent on the gradient. Title in `--vines-ink`, 600 weight. Search field is white, pill-shaped, hairline border.
- **Left sidebar** (channels, DMs, favorites, files): transparent on the gradient. Section headers are small uppercase muted labels. Rows are `--vines-radius-s`, selected row is white with `--vines-shadow-row`, hover is `--vines-sidebar-row-hover`. Badges use `--vines-accent-soft` on white text and are pill-shaped.
- **Center** (message list + input bar): one white card with `--vines-radius-l` and `--vines-shadow-card`, inset from the page by the existing gutter. Messages have no bubbles; hover is `--vines-row-hover`. Input bar inside the card uses `--vines-surface-2`, `--vines-radius-m`, no border; send button is `--vines-accent`.
- **Right panel** (comment thread): same card treatment as center. Comment bubbles use `--vines-surface-2` and `--vines-radius-m`.
- **Dialogs, popovers, menus**: white, `--vines-radius-l`, `--vines-shadow-pop`, no hairline.
- **Admin page** (`vines-admin.ts`) and migration/export dialogs: same tokens, no special treatment.

## How it gets made (decided)

### 1. Token layer

- New file `webcomponents/src/theme.ts` exporting a Lit `css` block (`vinesTokens`) that declares every `--vines-*` token on `:host` and `:root`, plus a `themeStyles` block with the shared element rules that replace most of today's `sharedStyles`.
- The webapp entry applies the same tokens at `:root` so light-DOM pieces (the emoji picker, Shoelace overlays, UI5 static areas) see them.
- All 48 component style blocks are rewritten to reference tokens. `sharedStyles` in `styles.ts` keeps only structural rules (flex, padding, ellipsis); everything color/radius/shadow/font moves to tokens.
- `webapp/public/global.css` is deleted. It is not linked from any HTML today, so this is housekeeping only.
- Inline `style="..."` attributes inside `html` templates are in scope too. There are about 51 such lines (for example the busy-indicator color in `vines-index.ts` and many in `vines-page.ts` and `vines-admin.ts`). Each is either rewritten to `var(--vines-*)` or moved into the component's style block with a class.
- Colors used from plain TypeScript (the cytoscape palette in `graph.ts`, the `doodles.ts` palettes) come from a small exported JS object in `theme.ts` whose values are the same hex strings as the tokens, so the token file remains the single place a color is written down. `css-doodle` pattern strings that need literal colors read from that object too.
- A check script, `scripts/check-no-color-literals.sh` (or an ESLint rule if one fits), fails the build when a `.ts` file under `webcomponents/src` or `webapp/src` other than `theme.ts` contains a hex, `rgb(`, `rgba(`, `hsl(` literal or a CSS named color anywhere: inside `css` templates, inside `style=` attributes in `html` templates, or as a plain string. It is wired into `npm run build:webapp`. `generated/` is exempt.

### 2. UI5 2.x on Horizon

- `@ui5/webcomponents`, `-fiori`, `-icons` bump from `=1.13.3` to the current 2.x (2.28.x at time of writing), pinned exact as today.
- `setTheme("sap_horizon")` is called once in the app entry before any UI5 element renders. (2.x defaults to Horizon, but set it explicitly so it is not implicit.)
- UI5's own look is bent toward the tokens by overriding its theme parameters at `:root` after the theme loads: at minimum `--sapFontFamily`, `--sapBrandColor`, `--sapButton_BorderCornerRadius`, `--sapElement_BorderCornerRadius`, `--sapField_BorderCornerRadius`, `--sapBackgroundColor`, `--sapGroup_ContentBackground`, `--sapButton_Background`, `--sapList_SelectionBackgroundColor`, `--sapList_Hover_Background`, `--sapContent_LabelColor`, `--sapTextColor`, `--sapLinkColor`, `--sapField_Background`, `--sapField_BorderColor`, `--sapPopover_BorderCornerRadius` (names to be confirmed against the 2.x Horizon parameter bundle). These are set from the `--vines-*` tokens so there is one source of truth.
- Shoelace's `--sl-*` tokens that matter (`--sl-font-sans`, `--sl-color-primary-*`, `--sl-border-radius-*`, `--sl-input-*`) are likewise mapped to `--vines-*` at `:root`.
- The six shadow-root injection templates (`inputBarStyleTemplate`, `suggestionListTemplate`, `shellBarStyleTemplate`, `searchFieldStyleTemplate`, `cardStyleTemplate`, `popoverStyleTemplate`) and their 9 call sites are removed. Each is replaced by theme-parameter overrides or `::part()` selectors. If a specific behavior (for example the borderless textarea in the input bar) cannot be achieved that way in 2.x, the builder documents it in the plan and proposes the least invasive alternative.
- The migration follows the official UI5 Web Components 2.0 migration guide. Known hits in this codebase that the builder must handle (verify each against the guide; this list is from memory and may be incomplete):
  - `ui5-badge` is renamed `ui5-tag` (34 uses).
  - `ui5-li` / `ui5-li-custom` / group headers: `StandardListItem` → `ListItemStandard`, `CustomListItem` → `ListItemCustom`, `ui5-li-groupheader` → `ui5-li-group`.
  - Dialog, Popover, Menu: `show()` / `close()` methods are replaced by the `open` property and `opener`; `placement-type` → `placement`; `after-open`/`after-close` events → `open`/`close`.
  - Toast: `show()` → `open = true`.
  - Input suggestions: event and item attribute renames.
  - `ui5-label` `wrap` → `wrapping-type`.
  - Segmented button item `pressed` → `selected`.
  - Icon import paths and `ui5-icon` `name` attribute: check the 52 distinct icon names still exist.
  - TypeScript types moved; `ValueState` and friends import from new paths.
- Shoelace stays at 2.20.1.
- **`@ddd-qc/path-explorer` pins UI5 1.13.3.** Vines only uses its `PathExplorerZvm` (in `threads.dvm.ts`) and a type from `dist/utils`; the `<anchor-tree>` element use in `vines-page.ts` is commented out. The bare `import "@ddd-qc/path-explorer"` in `vines-page.ts` is removed and the view model is deep-imported from `@ddd-qc/path-explorer/dist/viewModels/path-explorer.zvm.js`, which pulls no UI5 code. The nested 1.13.3 copy npm leaves under `node_modules/@ddd-qc/path-explorer/node_modules` is dead weight and is not loaded. No other dependency in `node_modules` declares UI5. Upgrading path-explorer itself is out of scope.
- **Third-party elements on Vines surfaces.** The Files view's center area is `<file-table>` from `@ddd-qc/files` (built on Vaadin Grid with the Lumo theme); `edit-profile` / `profile-panel` come from `@holochain-open-dev/profiles` and `wal-embed` from `@theweave/elements`, both Shoelace-based. The `:root` layer therefore carries three mapping blocks: `--sap*` (UI5), `--sl-*` (Shoelace), and `--lumo-*` (Vaadin: at least `--lumo-font-family`, `--lumo-primary-color`, `--lumo-base-color`, `--lumo-contrast-*`, `--lumo-border-radius-*`), all derived from `--vines-*`. The `files` submodule is not modified in this round; whatever Lumo does not expose stays as is and is accepted at sign-off.
- **Shoelace `light.css` loads twice in the we-applet build**: once bundled through `vines-page.ts` and once as the linked `styles.css` copied by `we-applet/vite.config.ts`. The `:root` overrides must be ordered after both; the builder either removes one of the loads or injects the override block last.

### 3. Order of work

The token layer lands before the UI5 bump, so the visual target is in place while components are being migrated, and so the UI5 migration PR is about API changes, not colors. Both land on `hdk-7.0`. The builder decides the finer slicing but each step must leave the app building and running.

### 4. Verification

- `npm run build:webapp` passes, including the color-literal check.
- `npm run devtest` (standalone, mem network) shows: gradient page, white center card, soft sidebar, Inter rendering, working input bar with mention suggestions and emoji picker, working search popover, dialogs for new channel / new DM / edit profile, admin page.
- `npm run devtest:we` shows the same inside Moss dev mode with two agents.
- `npm run build:android` succeeds (no need to run on device for this round).
- The owner does the final visual sign-off.

## Left to the builder

- Exact slicing of the UI5 migration across the 136 side-effect imports in `vines-page.ts` and the handful elsewhere.
- Whether `sharedStyles` survives as a thin structural sheet or is folded into `theme.ts`.
- Which `--sap*` parameters are actually needed once Horizon is on; prune the list above to what has visible effect.
- The check script's exact form (shell, Node, or ESLint rule).
- Any spacing tightening that falls out naturally while touching a component's styles, as long as the layout does not move.
- Names of the Inter subsets to bundle (latin is required; others optional).

## Calls made without asking

- Accent for buttons and badges is Moss green, not Moss purple; purple is reserved for the comments pill.
- Shoelace stays rather than being folded into UI5.
- Standalone and Android builds get the identical look; there is no "outside Moss" variant.
- The Svelte-style reset in `global.css` is deleted rather than ported.
- Tokens are hardcoded in Vines rather than bridged from Moss, since the iframe boundary blocks CSS inheritance.
- `@ddd-qc/path-explorer` is deep-imported for its view model rather than upgraded to UI5 2.x; its stale UI5 1.x copy stays in `node_modules` unused.
- The Vaadin-based files table gets a `--lumo-*` token mapping from Vines' side; the `files` submodule itself is not touched.
- Inline `style=` attributes and colors used from TypeScript are in the cleanup, not just `css` templates.
