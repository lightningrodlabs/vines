import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";

import {inputBarStyleTemplate} from "../styles";

import "@ui5/webcomponents/dist/TextArea.js";
import TextArea from "@ui5/webcomponents/dist/TextArea.js";
import List from "@ui5/webcomponents/dist/List.js";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {AgentPubKeyB64} from "@holochain/client";


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

  @property({type: Object})
  profilesZvm!: ProfilesZvm;

  private _cacheInputValue: string = "";

  private _mentionFilter: string = "";

  @state() private _filteredAgents: AgentPubKeyB64[] = [];


  /** -- Gettters -- */

  get inputElem(): TextArea {
    return this.shadowRoot.getElementById("textMessageInput") as unknown as TextArea;
  }

  get suggestionListElem(): List {
    return this.shadowRoot.getElementById("agent-list") as unknown as List;
  }


  /** -- Methods -- */

  /** */
  protected async updated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow parts CSS */
    const inputBar = this.shadowRoot.getElementById('inputBar') as HTMLElement;
    if (inputBar) {
      inputBar.shadowRoot.appendChild(inputBarStyleTemplate.content.cloneNode(true));
    }

    // if (this._filteredAgents.length > 0) {
    //   console.log("Focuisng on SUGGESTION LIST")
    //   this.suggestionListElem.focus();
    // }
  }


  /** */
  handlekeydown(e) {
    //console.log("keydown", e);
    //console.log("keydown keyCode", e.keyCode);

    /** Enter: commit message */
    if (e.keyCode === 13) {
      if (e.shiftKey) {
          /* FIXME add newline to input.value */
      } else {
        if (this.inputElem.value && this.inputElem.value.length != 0) {
          e.preventDefault();
          console.log(`Inputting value "${this.inputElem.value}"`);
          this.dispatchEvent(new CustomEvent('input', {
              detail: this.inputElem.value, bubbles: true, composed: true
          }));
          this.inputElem.value = "";
          this._filteredAgents = [];
          this._cacheInputValue = "";
        }
      }
    }

    /** Undo filter if '@' has been erased */
    if (e.keyCode == 8 && this.inputElem.value.substr(this.inputElem.value.length - 1) === "@") {
      this._filteredAgents = [];
      this._cacheInputValue = "";
    }

    /** Typed ' @' */
    const canMention = (this.inputElem.value === "@" || this.inputElem.value.substr(this.inputElem.value.length - 2) === " @");
    //console.log("keydown canMention", previousIsEmpty);

    /** except backspace */
    if (canMention && e.keyCode != 8) {
      //e.preventDefault();
      this._cacheInputValue = this.inputElem.value;
      //let suggestionItems = ["toto", "titi", "bob", "joe"];
      let suggestionItems = this.profilesZvm ? Object.entries(this.profilesZvm.perspective.profiles) : [];
      /** Filter */
      const filtered = suggestionItems.filter(([_agentKey, profile]) => {
          return profile.nickname.toUpperCase().indexOf(e.key.toUpperCase()) === 0;
      });
      if (filtered.length != 0) {
          this._filteredAgents = filtered.map(([key, _nick]) => key);
          this.suggestionListElem.focus();
      }
    }
  }


  /** */
  render() {
    console.log("<threads-input-bar>.render()", this._filteredAgents, this.showHrlBtn);

    /** Render agent lists for mentions */
    const agentItems = this._filteredAgents
      .map((key) => {
        const profile = this.profilesZvm.perspective.profiles[key];
        if (!profile) return html``;
        //return html`<div>${profile.nickname}</div>`;
        return html`             
          <ui5-li 
                .image=${profile && profile.fields.avatar? profile.fields.avatar : ""}
                @click=${(e) => {
                  e.preventDefault();
                    this._filteredAgents = [];
                    // this.inputElem.value += profile.nickname
                    this.inputElem.value = this._cacheInputValue + profile.nickname + " "
                    this.inputElem.focus();
                }}>
          ${profile.nickname}
          </ui5-li>`;
      });


    /** render all */
    return html`
        <ui5-bar id="inputBar" design="FloatingFooter">
            <!-- <ui5-button slot="startContent" design="Positive" icon="add"></ui5-button> -->
            ${this.showHrlBtn? html`
            <ui5-button design="Positive" icon="add" @click=${(e) => {
                this.dispatchEvent(new CustomEvent('grab_hrl', {detail: null, bubbles: true, composed: true}));
            }}></ui5-button>` : html``}
            <ui5-button design="Positive" icon="attachment" @click=${(e) => {
                this.dispatchEvent(new CustomEvent('upload', {detail: null, bubbles: true, composed: true}));
            }}></ui5-button>
            <ui5-list id="agent-list" style="display: ${this._filteredAgents.length > 0? "block" : "none"}" autofocus=${this._filteredAgents.length > 0? "true" : "false"}>
                ${agentItems}
            </ui5-list>            
            <ui5-textarea id="textMessageInput" mode="SingleSelect"
                          placeholder="Message #${this.topic}"
                          growing
                          growing-max-lines="3"
                          rows="1"
                          maxlength="1000"
                          @keydown=${this.handlekeydown} 
            ></ui5-textarea>
            <!-- <ui5-button design="Transparent" slot="endContent" icon="delete"></ui5-button> -->
        </ui5-bar>
    `;
  }


  /** */
  static get styles() {
    return [
      css`
          #agent-list {
            position: absolute;
            z-index: 1;
            bottom: 55px;
            width: 400px;
            box-shadow: rgba(6, 24, 44, 0.4) 0px 0px 0px 2px, rgba(6, 24, 44, 0.65) 0px 4px 6px -1px, rgba(255, 255, 255, 0.08) 0px 1px 0px inset;
          }
          #inputBar {
            margin:10px;
            width: auto;
            height: auto;
          }
  
          #inputBar::part(bar) {
            /*background: #81A2D4;*/
          }
        
          #textMessageInput {
          width: 100%;
          border: none;
          padding: 0px;
        }
      `,

    ];
  }

}
