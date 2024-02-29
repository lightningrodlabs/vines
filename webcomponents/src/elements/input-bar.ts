import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";

import Popover from "@ui5/webcomponents/dist/Popover";

import {inputBarStyleTemplate} from "../styles";

import "@ui5/webcomponents/dist/TextArea.js";
import TextArea from "@ui5/webcomponents/dist/TextArea.js";
import List from "@ui5/webcomponents/dist/List.js";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {AgentPubKeyB64} from "@holochain/client";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";


/**
 * @element
 */
@customElement("threads-input-bar")
export class InputBar extends LitElement {

  /** Properties */

  @property()
  topic: string = ''

  @property()
  showHrlBtn?: string;

  @property()
  showFileBtn?: string;

  @property({type: Object})
  profilesZvm!: ProfilesZvm;

  @state() private _cacheInputValue: string = "";

  /** -- Gettters -- */

  get inputElem(): TextArea {
    return this.shadowRoot.getElementById("textMessageInput") as unknown as TextArea;
  }

  get suggestionListElem(): List {
    return this.shadowRoot.getElementById("agent-list") as unknown as List;
  }

  get popoverElem(): Popover {
    return this.shadowRoot.getElementById("pop") as unknown as Popover;
  }


  /** -- Methods -- */

  /** */
  protected async updated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow parts CSS */
    const inputBar = this.shadowRoot.getElementById('inputBar') as HTMLElement;
    if (inputBar) {
      inputBar.shadowRoot.appendChild(inputBarStyleTemplate.content.cloneNode(true));

      const input = inputBar.querySelector("#textMessageInput")  as HTMLElement;
      //console.log("textMessageInput", input);
      input.shadowRoot.appendChild(inputBarStyleTemplate.content.cloneNode(true));
    }

    // if (this._filteredAgents.length > 0) {
    //   console.log("Focusing on SUGGESTION LIST")
    //   this.suggestionListElem.focus();
    // }
  }


  /** */
  private suggestionSelected(nickname?: string) {
    if (nickname) {
      this.inputElem.value = this._cacheInputValue + nickname + " "
    }
    this.inputElem.focus();
    if (this.popoverElem.isOpen()) {
      this.popoverElem.close();
    }

    this._cacheInputValue = "";
  }


  /** */
  private commitInput() {
    if (!this.inputElem.value || this.inputElem.value.length == 0) {
      return;
    }
    console.log(`Commit input value "${this.inputElem.value}"`);
    this.dispatchEvent(new CustomEvent('input', {detail: this.inputElem.value, bubbles: true, composed: true}));
    this.inputElem.value = "";
    this._cacheInputValue = "";
  }


  /** */
  private handleListKeydown(e) {
    //console.log("List keydown", e.target.innerText);
    //console.log("List keydown keyCode", e.keyCode);

    /** Enter: select focused item */
    if (e.keyCode === 13) {
      console.log("List keydown keyCode ENTER", e.target);
      this.suggestionSelected(e.target.innerText);
      if (this.suggestionListElem.items.length > 0) this.suggestionListElem.focusItem(this.suggestionListElem.items[0])
    }
  }


  /** */
  handleSuggestingKeydown(e) {

    /** Undo suggesting if '@' has been erased */
    if (e.keyCode == 8 && this.inputElem.value.substr(this.inputElem.value.length - 1) === "@") {
      this.suggestionSelected();
    }

    const list = this.suggestionListElem;

    /** get current selected index */
    const items = list.getItems();
    //const selected = list.getSelectedItems();

    let i = 0;
    for (const item of items) {
      if (item.selected) {
        break;
      }
      i += 1;
    }
    if (i == items.length) {
      i = 0;
      //items[i].selected = true;
    }

    // if (selected.length == 0 && items.length > 0) {
    //   items[0].selected = true;
    //   // list.onSelectionRequested(new CustomEvent('', {
    //   //   detail: {
    //   //     item: items[0],
    //   //     selectionComponentPressed: true,
    //   //     //selected?: boolean;
    //   //     //key?: string;
    //   //   },
    //   //   bubbles: true, composed: true
    //   // }))
    //
    // }

    //getEnabledItems();
    //getItems();

    /* UP */
    if (e.keyCode == 38) {
      if (i > 0) {
        items[i].selected = false;
        items[i - 1].selected = true;
      }
      e.preventDefault();
    }
    /* Down */
    if (e.keyCode == 40) {
      if (i < items.length - 1) {
        items[i].selected = false;
        items[i + 1].selected = true;
      }
      e.preventDefault();
    }

    /* Tab */
    if (e.keyCode === 9) {
      //e.preventDefault();
    }

    if (e.keyCode === 13) {
      console.log("selected item", items[i], items[i].outerText);
      this.suggestionSelected(items[i].outerText);
      //items[i].outerText
      e.preventDefault();
    }
  }


  /** */
  handleInput(e) {
    console.log("handle Input", this.inputElem.value, e);
    this.requestUpdate();
  }


  /** */
  handleKeydown(e) {
    //console.log("keydown", e);
    const isSuggesting = this.popoverElem && this.popoverElem.isOpen();
    const isTextKey = e.key.length == 1;
    console.log("Input keydown keyCode", e.keyCode, isSuggesting, isTextKey, this.inputElem.value);

    if (isSuggesting) {
      this.handleSuggestingKeydown(e);
      return;
    }

    /** Enter: commit message */
    if (e.keyCode === 13) {
      if (e.shiftKey) {
          /* FIXME add newline to input.value */
      } else {
        console.log("keydown keyCode ENTER", this.inputElem.value);
        e.preventDefault();
        this.commitInput();
      }
    }


    // /** Mentionning if " @" has been typed at the end of the input string */
    // const canMention = (this.inputElem.value === "@" || this.inputElem.value.substr(this.inputElem.value.length - 2) === " @");
    // //console.log("keydown canMention", previousIsEmpty);
    //
    // /** typed after @ except backspace: Enter suggesting mode */
    // if (canMention && e.keyCode != 8) {
    //   //e.preventDefault();
    //   this._cacheInputValue = this.inputElem.value;
    //   this.popoverElem.showAt(this.inputElem as any as HTMLElement);
    //   //this.suggestionListElem.focus();
    // }
  }


  /** */
  _dummyProfiles: Record<AgentPubKeyB64, ProfileMat> = {
    "Alex": {nickname: "Alex", fields: {}},
    "Billy": {nickname: "Billy", fields: {}},
    "Camille": {nickname: "Camille", fields: {}},
    "Dom": {nickname: "Dom", fields: {}},
    "E": {nickname: "E", fields: {}},
  };


  /** */
  splitByWordsAndPunctuation(str): string[] {
    const regex = /[@a-zA-ZÀ-ÖØ-öø-ÿ0-9']+|[^\w\s]/g;
    const res = str.match(regex);
    return res? res : [];
  }


  /** */
  render() {
    console.log("<threads-input-bar>.render()", this.showHrlBtn);

    const isSuggesting = this.popoverElem && this.popoverElem.isOpen();
    const input = this.inputElem? this.inputElem.value : "";
    const endsWithWhitespace = input.length != input.trimEnd().length;
    const words = this.splitByWordsAndPunctuation(input); //input.trim().split(/\s+/);
    const lastWord = words.length > 0 ? words[words.length - 1] : "";
    const lastWordIsMention = lastWord.length > 0 && lastWord[0] == '@' && !endsWithWhitespace;
    console.log("input words", words, lastWordIsMention);

    let agentItems = [];
    if (lastWordIsMention) {
      const filter = lastWord.slice(1);
      /** Filter suggestions */
      let suggestionItems = Object.entries(this._dummyProfiles);
      //let suggestionItems = this.profilesZvm ? Object.entries(this.profilesZvm.perspective.profiles) : [];
      let suggestionKeys = suggestionItems.map(([agentKey, _profile]) => agentKey);

      /** Filter */
      const filtered = suggestionItems
        .filter(([_agentKey, profile]) => {
          const index = profile.nickname.toUpperCase().indexOf(filter.toUpperCase());
          return index !== -1;
        })
        .map(([agentKey, _profile]) => agentKey);

      //console.log("<threads-input-bar>.render() filtered", filtered);

      if (filtered.length != 0) {
        suggestionKeys = filtered;
      }

      /** Render agent lists for mentions */
      agentItems = suggestionKeys
        .map((key) => {
          //const profile = this.profilesZvm.perspective.profiles[key];
          const profile = this._dummyProfiles[key];
          if (!profile) return html``;
          return html`             
          <ui5-li
                .image=${profile && profile.fields.avatar? profile.fields.avatar : ""}
                @click=${(e) => {
            e.preventDefault();
            this.suggestionSelected(profile.nickname);
          }}>
              ${profile.nickname}
          </ui5-li>`;
        });
      /** */
      if (this.popoverElem && !isSuggesting) {
        this.popoverElem.showAt(this.inputElem as any as HTMLElement);
        this._cacheInputValue = this.inputElem.value;
        //this.suggestionListElem.focus();
        //if (agentItems.length > 0) agentItems[0].selected = true;
      }
    }

    // FIXME: refactor when to call suggestionSelected()
    if (this.popoverElem && isSuggesting && agentItems.length == 0) {
      this.suggestionSelected();
    }


    /** render all */
    return html`
        <ui5-bar id="inputBar" design="FloatingFooter">
            <!-- <ui5-button slot="startContent" design="Positive" icon="add"></ui5-button> -->
            ${this.showHrlBtn? html`
            <ui5-button design="Transparent" icon="add" @click=${(e) => {
                this.dispatchEvent(new CustomEvent('grab_hrl', {detail: null, bubbles: true, composed: true}));
            }}></ui5-button>` : html``}
            ${this.showFileBtn? html`
            <ui5-button design="Transparent" icon="attachment" @click=${(e) => {
                this.dispatchEvent(new CustomEvent('upload', {detail: null, bubbles: true, composed: true}));
            }}></ui5-button>` : html``}
            <ui5-textarea id="textMessageInput" mode="SingleSelect"
                          placeholder="Message #${this.topic}, @ to mention"
                          growing
                          growing-max-lines="3"
                          rows="1"
                          maxlength="1000"
                          @keydown=${this.handleKeydown}
                          @input=${this.handleInput}
            ></ui5-textarea>
            <!-- <ui5-button design="Transparent" slot="endContent" icon="delete"></ui5-button> -->
        </ui5-bar>
        <ui5-popover id="pop" hide-arrow allow-target-overlap placement-type="Top" horizontal-align="Stretch" initial-focus="textMessageInput">
          <ui5-list id="agent-list" @keydown=${this.handleListKeydown} >
              ${agentItems}
          </ui5-list>
        </ui5-popover>
    `;
  }

  // header-text="Members"
  // style="display: ${this._filteredAgents.length > 0? "block" : "none"}" autofocus=${this._filteredAgents.length > 0? "true" : "false"}

  /** */
  static get styles() {
    return [
      css`
        
          #pop {
            background: #d1deea;
          }
          #agent-list {
            /*opacity: 0.5;*/
            /*position: absolute;*/
            /*z-index: 1;*/
            /*bottom: 55px;*/
            /*width: 400px;*/
            /*box-shadow: rgba(6, 24, 44, 0.4) 0px 0px 0px 2px, rgba(6, 24, 44, 0.65) 0px 4px 6px -1px, rgba(255, 255, 255, 0.08) 0px 1px 0px inset;*/
          }
          ui5-li {
            /*background: #d1deea;*/
          }
          #inputBar {
            width: auto;
            height: auto;
            box-shadow: none;
            padding: 3px;
            border-radius: 10px;
          }
  
          #inputBar::part(bar) {
            /*background: #81A2D4;*/
          }
        
          #textMessageInput {
            width: 100%;
            border: none;
            padding: 0px;
          }

          .ui5-textarea-wrapper
          ui5-textarea div div {
            /*background: red;*/
            border: 0px;
          }
      `,

    ];
  }

}
