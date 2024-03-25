import { css } from 'lit';


/* p NEEDED because markdownit() generates <p> */
export const sharedStyles = css`
  pre code.hljs {
    display: block;
    overflow-x: auto;
    padding: 1em;
    /*background: rgb(234, 234, 234);*/
    border: 1px solid rgba(125, 125, 125, 0.64)
  }
  code.hljs {
    padding: 3px 5px
  }

  .hljs {
    color: #24292e;
    background: #ffffff
  }
  .hljs-doctag,
  .hljs-keyword,
  .hljs-meta .hljs-keyword,
  .hljs-template-tag,
  .hljs-template-variable,
  .hljs-type,
  .hljs-variable.language_ {
    /* prettylights-syntax-keyword */
    color: #d73a49
  }
  .hljs-title,
  .hljs-title.class_,
  .hljs-title.class_.inherited__,
  .hljs-title.function_ {
    /* prettylights-syntax-entity */
    color: #6f42c1
  }
  .hljs-attr,
  .hljs-attribute,
  .hljs-literal,
  .hljs-meta,
  .hljs-number,
  .hljs-operator,
  .hljs-variable,
  .hljs-selector-attr,
  .hljs-selector-class,
  .hljs-selector-id {
    /* prettylights-syntax-constant */
    color: #005cc5
  }
  .hljs-regexp,
  .hljs-string,
  .hljs-meta .hljs-string {
    /* prettylights-syntax-string */
    color: #032f62
  }
  .hljs-built_in,
  .hljs-symbol {
    /* prettylights-syntax-variable */
    color: #e36209
  }
  .hljs-comment,
  .hljs-code,
  .hljs-formula {
    /* prettylights-syntax-comment */
    color: #6a737d
  }
  .hljs-name,
  .hljs-quote,
  .hljs-selector-tag,
  .hljs-selector-pseudo {
    /* prettylights-syntax-entity-tag */
    color: #22863a
  }
  .hljs-subst {
    /* prettylights-syntax-storage-modifier-import */
    color: #24292e
  }
  .hljs-section {
    /* prettylights-syntax-markup-heading */
    color: #005cc5;
    font-weight: bold
  }
  .hljs-bullet {
    /* prettylights-syntax-markup-list */
    color: #735c0f
  }
  .hljs-emphasis {
    /* prettylights-syntax-markup-italic */
    color: #24292e;
    font-style: italic
  }
  .hljs-strong {
    /* prettylights-syntax-markup-bold */
    color: #24292e;
    font-weight: bold
  }
  .hljs-addition {
    /* prettylights-syntax-markup-inserted */
    color: #22863a;
    background-color: #f0fff4
  }
  .hljs-deletion {
    /* prettylights-syntax-markup-deleted */
    color: #b31d28;
    background-color: #ffeef0
  }
  .hljs-char.escape_,
  .hljs-link,
  .hljs-params,
  .hljs-property,
  .hljs-punctuation,
  .hljs-tag {
    /* purposely ignored */

  }
  
  mark {
    padding: 0px 2px 0px 2px;
  }
  
  code {
    background: #8080801a;
    padding: 5px;
    /*display: block;*/
  }

  pre > code {
    display: block;
  }
  
  p {
    margin: 0px;
    white-space: pre-wrap;
    overflow: auto;
    /*line-height: 18px;*/
  }

  .mention {
    background: #c6ddf594;
    padding: 0px 3px 0px 2px;
    text-decoration: none;
  }
  
  .subjectName {
    font-style: italic;
    background: #fbfbfb9c;
    padding: 4px;
  }
  
  .sideAgentName {
    font-family: "72";
    color: rgb(64, 64, 64);
    font-weight: bold;
  }

  .sideChatDate {
    font-size: smaller;
    color: #6c6c6c;
  }

  .avatarRow {
    display: flex;
    flex-direction: row;
    gap: 10px;
    padding-top: 6px;
  }

  .nameColumn {
    /*padding-top:5px; */
  }

  .sideContentRow {
    padding-left: 3px;
    padding-bottom: 10px;
    padding-top: 5px;
    color: #2f2f2f;
  }

  .sideItem {
    background: white;
    display: flex;
    flex-direction: column;
    padding: 5px;
    border-bottom: 1px solid #dbdada;
  }

  .sideItem:hover {
    background: rgba(255, 255, 255, 0.80);
    cursor:pointer;
  }

  .fail {
    background: #fdd;
  }
`;


/** -- Styles for ui5  -- *
 *
 */
export const inputBarStyleTemplate = document.createElement('template');
inputBarStyleTemplate.innerHTML = `
<style>

  .ui5-bar-root .ui5-bar-midcontent-container {
    width: 100%;
  }
  
  .ui5-textarea-wrapper {
    border: none !important;
  }
</style>
`;

export const suggestionListTemplate = document.createElement('template');
suggestionListTemplate.innerHTML = `
<style>
  .ui5-list-scroll-container {
    overflow: hidden !important;
  }
</style>
`;

export const shellBarStyleTemplate = document.createElement('template');
shellBarStyleTemplate.innerHTML = `
<style>
  .ui5-shellbar-title {
    font-size:larger !important;
    color: #464646 !important;
    padding-left:5px !important;
  }
  
  ui5-button {
    color: #464646 !important;
  }
  
  ui5-button:hover {
    background: #e6e6e6  !important;
  }
  
</style>
`;

export const searchFieldStyleTemplate = document.createElement('template');
searchFieldStyleTemplate.innerHTML = `
<style>
  .ui5-input-root {
    background: #e7f2f9 !important;
    /*color: #003DB0 !important;*/
    color: #656565 !important;
  }
  
  input::placeholder {
    color: black !important;
  } 
  
  .ui5-input-clear-icon {
    /*color:white !important;*/
    color: #656565 !important;
  }
</style>
`;


export const cardStyleTemplate = document.createElement('template');
cardStyleTemplate.innerHTML = `
<style>
  .ui5-card-root {
    padding:10px;
  }
</style>
`;


export const popoverStyleTemplate = document.createElement('template');
popoverStyleTemplate.innerHTML = `
<style>
  .ui5-popover-root {
    min-width: 10px !important;
  }
</style>
`;
