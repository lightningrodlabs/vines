import { css } from 'lit';


export const sharedStyles = css`

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
    display:flex;
    flex-direction:row;
    gap:10px;
    padding-top:6px;
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
`;


/** Styles for ui5 */
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



export const shellBarStyleTemplate = document.createElement('template');
shellBarStyleTemplate.innerHTML = `
<style>
  .ui5-shellbar-title {
    font-size:larger !important;
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


