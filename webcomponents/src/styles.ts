import {css} from 'lit';


/** Common styles */
export const sharedStyles = css`

    .not-received {
        color: rgb(161, 147, 7)
    }

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

    /* p NEEDED because markdownit() generates <p> */
    p {
        margin: 0px;
        white-space: pre-wrap;
        overflow: auto;
        display: inline;
    }

    .chatAvatar:hover {
        border: 1px solid rgba(128, 128, 88, 0.84);
    }

    .mention {
        background: #c6ddf594;
        padding: 0px 3px 0px 2px;
        text-decoration: none;
    }

    .linky {
        color: blue;
    }

    .linky:hover {
        text-decoration: underline;
        cursor: pointer;
    }

    .subjectName {
        font-style: italic;
        background: #fbfbfb9c;
        padding: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
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
        cursor: pointer;
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
        cursor: pointer;
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
    }

    .tempBadge {
        color: #ffffff;
        background: #a8a187;
        border: none;
        min-width: 40px;
    }

    .showBtn {
        border: none;
        padding: 0px;
        display: none;
    }

    .red {
        border: 1px solid red;
    }

    .threadItem {
        display: flex;
        /*overflow: hidden;*/
        align-items: center;
        height: 36px;
        cursor: pointer;
        color: #484848;
        background: #F6FAFC;
        border-radius: 5px;
        margin-left: -2px;
        padding-left: 5px;
        margin-right: 5px;        
        transition: background 0.2s, border-color 0.2s, opacity 0.2s;        
    }

    .threadItem:hover {
        background: rgb(222, 232, 255);
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
        background: #d8e2f6;
    }
    
     .status-badge {
                    /*position: absolute;*/
                    width:fit-content; 
                    display:block;     
                    margin: auto;
                    border-radius: 10px;
                    padding: 2px 6px;
                    font-size: 10px;
                    font-weight: bold;
                    text-align: center;
                    /*top: 5px;
                    right: 8px;*/
                    color: white;
                    /*border-radius: 10px;
                    padding: 1px 9px;
                    font-size: 10px;
                    font-weight: bold;*/
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
  
  .ui5-textarea-wrapper textarea {
    /*white-space: nowrap;*/
    /*overflow: hidden;*/
    /*text-overflow: ellipsis;*/
    text-wrap: wrap;
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
