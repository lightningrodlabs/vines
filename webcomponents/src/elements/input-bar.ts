import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";

import {inputBarStyleTemplate} from "../styles";


import Input from "@ui5/webcomponents/dist/Input";
//import {InputSuggestionText, SuggestionComponent} from "@ui5/webcomponents/dist/features/InputSuggestions";
import SuggestionItem from "@ui5/webcomponents/dist/SuggestionItem";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";
//import SuggestionListItem from "@ui5/webcomponents/dist/SuggestionListItem";


/**
 * @element
 */
@customElement("threads-input-bar")
export class InputBar extends LitElement {


  /** */
  @property() topic: string = ''

  private _cacheInputValue: string = "";

  @property({type: Object})
  profilesZvm!: ProfilesZvm;


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
  render() {
    console.log("<threads-input-bar>.render()", this.profilesZvm);

    /** render all */
    return html`
        <ui5-bar id="inputBar" design="FloatingFooter">
            <!-- <ui5-button slot="startContent" design="Positive" icon="add"></ui5-button> -->
            <ui5-input id="textMessageInput" type="Text" placeholder="Message #${this.topic}"
                       show-clear-icon show-suggestions

                       @suggestion-item-select=${(e) => {
                           //console.log("suggestion-item-select", e)
                           const input = this.shadowRoot.getElementById("textMessageInput") as Input;
                           e.preventDefault();
                           Array.from(input.children).forEach((child) => {
                               input.removeChild(child);
                           });
                           input.value = this._cacheInputValue + e.detail.item.text + " ";
                           this._cacheInputValue = "";
                           //input.setCaretPosition(input.value.length - 1);
                           //console.log("suggestion-item-select: setCaretPosition", input.getCaretPosition(), input.value.length);
                       }
                       }


                       @keydown=${(e) => {
                           const input = this.shadowRoot.getElementById("textMessageInput") as Input;
                           //console.log("keydown", e);

                           /** Remove previous suggestions */
                           Array.from(input.children).forEach((child) => {
                               input.removeChild(child);
                           });

                           /** Enter: commit message */
                           if (e.keyCode === 13) {
                               e.preventDefault();
                               if (input.value && input.value.length != 0) {
                                 this.dispatchEvent(new CustomEvent('input', {
                                   detail: input.value, bubbles: true, composed: true
                                 }));
                                 input.value = "";
                               }
                           }

                           /** Typed ' @' */
                           const canMention = (input.value === "@" || input.value.substr(input.value.length - 2) === " @");
                           //console.log("keydown canMention", previousIsEmpty);

                           /** except backspace */
                           if (canMention && e.keyCode != 8) {
                               //e.preventDefault();
                               this._cacheInputValue = input.value;
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
                                   input.appendChild(li as unknown as Node);
                                   li
                               });
                           }
                       }
                       }
            ></ui5-input>
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
