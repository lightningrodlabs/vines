import {css} from 'lit';
import {vinesTokens, themeStyles} from './theme';


/**
 * Common styles. Carries the theme tokens and element rules so every component
 * that spreads `sharedStyles` into its `styles` gets them for free. Only
 * structural rules live here; colors, radii, shadows and fonts are tokens.
 */
export const sharedStyles = [
  vinesTokens,
  themeStyles,
  css`
    /* p NEEDED because markdownit() generates <p> */
    p {
        margin: 0px;
        white-space: pre-wrap;
        overflow: auto;
        display: inline;
    }

    .chatAvatar:hover {
        border: 1px solid var(--vines-accent-soft);
    }

    .subjectName {
        font-style: italic;
        background: var(--vines-surface-2);
        border-radius: var(--vines-radius-s);
        padding: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
    }

    .sideAgentName {
        font-family: var(--vines-font);
        color: var(--vines-ink);
        font-weight: 600;
    }

    .sideChatDate {
        font-size: var(--vines-text-s);
        color: var(--vines-ink-muted);
    }

    .avatarRow {
        display: flex;
        flex-direction: row;
        gap: 10px;
        padding-top: 6px;
    }

    .nameColumn {
    }

    .sideContentRow {
        padding-left: 3px;
        padding-bottom: 10px;
        padding-top: 5px;
        color: var(--vines-ink);
    }

    .sideItem {
        background: var(--vines-surface);
        display: flex;
        flex-direction: column;
        padding: 5px;
        border-bottom: 1px solid var(--vines-border);
    }

    .sideItem:hover {
        background: var(--vines-row-hover);
        cursor: pointer;
    }

    /** Lister */

    /* Dialog footers: buttons right-justified, the default action last. The UI5 footer
       root centers its slot, so the div takes the full width and aligns to the end. */
    .dialog-footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        width: 100%;
    }

    /* Section panels in the sidebar (categories, direct messages): no border or fill, muted
       header, the chevron comes from ui5-panel itself */
    ui5-panel.lister-panel {
        display: flex;
        flex-direction: column;
        border: none;
        margin-bottom: 4px;
        --_ui5_panel_header_height: 2.25rem;
        background: transparent;
    }
    ui5-panel.lister-panel::part(content) {
        padding: 0;
        padding-left: 7px;
        background: transparent;
    }
    /* UI5 keeps 1rem on the left for the collapse button it would show on a non-fixed
       panel; nothing goes there, so the chevron lines up with the channel titles instead */
    ui5-panel.lister-panel::part(header) {
        border: none;
        color: var(--vines-ink-muted);
        padding-left: 7px;
        padding-right: 5px;
    }
    /* Same hover as a channel row: a colour change alone (muted grey to dark green) is
       too close in lightness to notice */
    ui5-panel.lister-panel::part(header):hover {
        color: var(--vines-ink);
        background: var(--vines-sidebar-row-hover);
        border-radius: var(--vines-radius-s);
    }
    ui5-panel.lister-panel [slot="header"]:hover .lister-chevron {
        color: var(--vines-ink);
    }
    .lister-panel-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        overflow: hidden;
        width: 100%;
        cursor: pointer;
    }
    /* Our own chevron: the panels are \`fixed\` so a closed section can still list its
       rows with unread messages */
    .lister-chevron {
        width: 1rem;
        height: 1rem;
        margin: 0 0.5rem 0 0;
        flex-shrink: 0;
        color: var(--vines-ink-muted);
    }
    .lister-panel-title {
        flex-grow: 1;
        height: 18px;
        margin-right: 10px;
        text-overflow: ellipsis;
        overflow: hidden;
    }

    /* ui5-tag (2.x) paints background, border, text and radius on its root part */
    ui5-tag {
        min-width: 1.7rem;
        margin-top: 3px;
    }

    ui5-tag::part(root) {
        background: var(--vines-border);
        color: var(--vines-ink-muted);
        border: none;
        border-radius: var(--vines-radius-pill);
        font-family: var(--vines-font);
    }

    ui5-tag:hover {
        cursor: pointer;
    }

    .unreadBadge::part(root) {
        background: var(--vines-accent-soft);
        color: var(--vines-surface);
    }

    .notifBadge::part(root) {
        color: var(--vines-surface);
        background: var(--vines-positive);
    }

    .tempBadge {
        min-width: 40px;
    }

    .tempBadge::part(root) {
        color: var(--vines-surface);
        background: var(--vines-warning);
    }

    /* outlined tag variants */
    .tag-negative::part(root) {
        color: var(--vines-negative);
        background: var(--vines-surface);
        border: 1px solid var(--vines-negative);
    }

    .tag-muted::part(root) {
        color: var(--vines-ink-muted);
        background: var(--vines-surface);
        border: 1px solid var(--vines-border);
    }

    .tag-accent::part(root) {
        color: var(--vines-accent);
        background: var(--vines-surface);
        border: 1px solid var(--vines-accent-soft);
    }

    .tag-warning::part(root) {
        color: var(--vines-warning);
        background: var(--vines-surface-tint);
    }

    .showBtn {
        border: none;
        padding: 0px;
        display: none;
    }

    .red {
        border: 1px solid var(--vines-negative);
    }

    .threadItem {
        display: flex;
        align-items: center;
        height: 36px;
        cursor: pointer;
        color: var(--vines-ink);
        background: transparent;
        border-radius: var(--vines-radius-s);
        margin-left: -2px;
        padding-left: 5px;
        margin-right: 5px;
        transition: background 0.2s, border-color 0.2s, opacity 0.2s;
    }

    .threadItem:hover {
        background: var(--vines-sidebar-row-hover);
    }

    .threadItem:hover > ui5-avatar-group {
        display: none !important;
    }

    @media (max-width: 500px) {
        .threadItem > ui5-button {
            display: block !important;
        }
    }

    .threadItem:hover > ui5-button {
        display: block !important;
    }

    .threadItem:hover > copy-wal-button {
        display: block !important;
    }

    chat-item:hover {
        background: var(--vines-row-hover);
    }

    .status-badge {
        width: fit-content;
        display: block;
        margin: auto;
        border-radius: var(--vines-radius-pill);
        padding: 2px 6px;
        font-size: 10px;
        font-weight: bold;
        text-align: center;
        color: var(--vines-surface);
    }
  `,
];
