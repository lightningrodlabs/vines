import { css } from 'lit';


/* p NEEDED because markdownit() generates <p> */
export const sharedStyles = css`
  
  blockquote {
    border-left: 4px solid #d1e15d;
    padding: 0px 5px 2px 12px;
    margin: 10px 0px 0px 0px;
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
    display: inline;
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
  
  .timeHr {
    border: none; 
    border-bottom: 2px dashed #dadada; 
    flex-grow: 1; 
    height: 0px;
  }

  /** Lister */
  
  ui5-badge {
    min-width: 1.7rem;
    margin-top: 3px;
    background: rgb(183, 183, 183);
    color: rgb(232, 232, 232);
  }
  
  ui5-badge:hover {
    cursor:pointer;
  }


  .unreadBadge {
    background: #342D1F;
    color: white;
    border: none;
  }

  .notifBadge {
    color: #ffffff;
    background: #359C07;
    border: none;
    min-width: 40px;
  }
  
  .showBtn {
    border: none;
    padding: 0px;
    display: none;
  }

  .threadItem {
    display: flex;
    overflow: hidden;
    align-items: center;
    height: 36px;
    padding-left: 10px;
    cursor: pointer;
    color: #484848;
    background: #F6FAFC;
    margin-left: -7px;
  }
  .threadItem:hover {
    background: rgb(222, 232, 255);
  }

  .threadItem:hover > ui5-button {
    display: block !important;
  }

  chat-item:hover {
    background: #d8e2f6;
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
 
  ui5-button.pressed {
    box-shadow: inset 2px 2px 1px #7b7878, inset 2px 3px 5px rgba(0, 0, 0, 0.3), inset -2px -3px 5px rgba(255, 255, 255, 0.5);
  }
   
  ui5-button:hover {
    background: #e6e6e6 !important;
  }
  
</style>
`;

export const searchFieldStyleTemplate = document.createElement('template');
searchFieldStyleTemplate.innerHTML = `
<style>
  .ui5-input-root {
    background: #ECEAE9 !important;
    /*color: #003DB0 !important;*/
    color: #525150 !important;
    /*border: none !important;*/
    border-radius:10px !important;
  }
  
  input::placeholder {
    color: #B9B7B6 !important;
  } 
  
  .ui5-input-clear-icon {
    /*color:white !important;*/
    color: #B9B7B6 !important;
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
