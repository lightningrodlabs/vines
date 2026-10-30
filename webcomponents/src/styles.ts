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

    ui5-tag {
        min-width: 1.7rem;
        margin-top: 3px;
        background: var(--vines-border);
        color: var(--vines-ink-muted);
        border: none;
        border-radius: var(--vines-radius-pill);
    }

    ui5-tag:hover {
        cursor: pointer;
    }

    .unreadBadge {
        background: var(--vines-accent-soft);
        color: var(--vines-surface);
        border: none;
    }

    .notifBadge {
        color: var(--vines-surface);
        background: var(--vines-positive);
        border: none;
    }

    .tempBadge {
        color: var(--vines-surface);
        background: var(--vines-warning);
        border: none;
        min-width: 40px;
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
