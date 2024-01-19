import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";

import {inputBarStyleTemplate} from "../styles";

import "@ui5/webcomponents/dist/TextArea.js";
import TextArea from "@ui5/webcomponents/dist/TextArea.js";
//import {InputSuggestionText, SuggestionComponent} from "@ui5/webcomponents/dist/features/InputSuggestions";
import SuggestionItem from "@ui5/webcomponents/dist/SuggestionItem";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";
//import SuggestionListItem from "@ui5/webcomponents/dist/SuggestionListItem";


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


  /** -- Gettters -- */
  get inputElem(): TextArea {
    return this.shadowRoot.getElementById("textMessageInput") as unknown as TextArea;
  }


  /** -- Methods -- */

  /** */
  protected async updated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow parts CSS */
    const inputBar = this.shadowRoot.getElementById('inputBar') as HTMLElement;
    if (inputBar) {
      inputBar.shadowRoot.appendChild(inputBarStyleTemplate.content.cloneNode(true));
    }
  }


  /** */
  handlekeydown(e) {
    console.log("keydown", e);

    //console.log("keydown keyCode", e.keyCode);


    /** Enter: commit message */
    if (e.keyCode === 13) {
      if (e.shiftKey) {
          /* FIXME add newline to input.value */
      } else {
        if (this.inputElem.value && this.inputElem.value.length != 0) {
          e.preventDefault();
          this.dispatchEvent(new CustomEvent('input', {
              detail: this.inputElem.value, bubbles: true, composed: true
          }));
          this.inputElem.value = "";
        }
      }
    }

    /** Typed ' @' */
    const canMention = (this.inputElem.value === "@" || this.inputElem.value.substr(this.inputElem.value.length - 2) === " @");
    //console.log("keydown canMention", previousIsEmpty);

    /** except backspace */
    if (canMention && e.keyCode != 8) {
      //e.preventDefault();
      this._cacheInputValue = this.inputElem.value;
      //let suggestionItems = ["toto", "titi", "bob", "joe"];
      let suggestionItems = this.profilesZvm ? this.profilesZvm.getNames() : [];
      /** Filter */
      const filtered = suggestionItems.filter((item) => {
          return item.toUpperCase().indexOf(e.key.toUpperCase()) === 0;
      });
      if (filtered.length != 0) {
          suggestionItems = filtered;
      }

      suggestionItems.forEach((suggestion) => {
          const li = document.createElement("ui5-suggestion-item") as unknown as SuggestionItem;
          //li.icon = "world";
          //li.additionalText = "explore";
          //li.additionalTextState = "Success";
          //li.description = "travel the world";
          li.text = suggestion;
        this.inputElem.appendChild(li as unknown as Node);
          li
      });
    }
  }


  /** */
  render() {
    console.log("<threads-input-bar>.render()", this.profilesZvm, this.showHrlBtn);

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
            <ui5-textarea id="textMessageInput" 
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
