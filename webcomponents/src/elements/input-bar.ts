import {css, html, LitElement, PropertyValues, TemplateResult} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {consume} from "@lit/context";

import Popover from "@ui5/webcomponents/dist/Popover";

import {inputBarStyleTemplate, suggestionListTemplate} from "../styles";

import "@ui5/webcomponents/dist/TextArea.js";
import TextArea from "@ui5/webcomponents/dist/TextArea.js";
import List from "@ui5/webcomponents/dist/List.js";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {renderAvatar} from "../render";
import {ProfilesAltZvm} from "@ddd-qc/profiles-dvm/dist/profilesAlt.zvm";
import {msg} from "@lit/localize";
import {AgentId} from "@ddd-qc/lit-happ";
import {VinesInputEvent} from "../events";
import {weClientContext} from "../contexts";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {WAL, weaveUrlFromWal} from "@lightningrodlabs/we-applet";


/**
 * @element
 */
@customElement("vines-input-bar")
export class InputBar extends LitElement {

  /** Properties */

  @property() topic: string = '';
  @property() cachedInput: string = '';
  @property() showHrlBtn?: string;
  @property() background?: string;
  @property() showFileBtn?: string;
  @property({type: Object}) profilesZvm!: ProfilesAltZvm;

  @state() private _cacheInputValue: string = "";
  @state() private _file: File | undefined = undefined;
  @state() private _wal: WAL | undefined = undefined;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;


  /** -- Getters -- */

  get inputElem(): TextArea {
    return this.shadowRoot!.getElementById("textMessageInput") as unknown as TextArea;
  }

  get suggestionListElem(): List {
    return this.shadowRoot!.getElementById("agent-list") as unknown as List;
  }

  get popoverElem(): Popover {
    return this.shadowRoot!.getElementById("pop") as unknown as Popover;
  }


  get value(): string {
    //console.log("<vines-input-var>.value()", this.inputElem? this.inputElem.value : "<no elem>");
    if (this.inputElem) {
      return this.inputElem.value;
    }
    return "";
  }
  setValue(v: string): void {
    if (this.inputElem) {
      this.inputElem.value = v;
      //console.log("<vines-input-var> (jump) setValue to", v);
    }
  }


  /** -- Methods -- */

  /** */
  protected override async firstUpdated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow parts CSS */
    const inputBar = this.shadowRoot!.getElementById('inputBar') as HTMLElement;
    if (inputBar) {
      inputBar.shadowRoot!.appendChild(inputBarStyleTemplate.content.cloneNode(true));

      const input = inputBar.querySelector("#textMessageInput")  as HTMLElement;
      //console.log("textMessageInput", input);
      input.shadowRoot!.appendChild(inputBarStyleTemplate.content.cloneNode(true));

      const pop = this.shadowRoot!.getElementById('pop') as HTMLElement;
      const list = pop.querySelector("#agent-list") as HTMLElement;
      console.log("#agent-list", pop, list);
      list.shadowRoot!.appendChild(suggestionListTemplate.content.cloneNode(true));
    }
  }


  /** */
  override updated() {
    if (this.inputElem && this.inputElem.value == "" && this.cachedInput != "") {
      this.inputElem.value = this.cachedInput;
      //console.log("<vines-input-var> (jump) updated to", this.cachedInput);
      //this.requestUpdate();
    }
    if (this.background) {
      const elem = this.shadowRoot!.getElementById('inputBar') as HTMLElement;
      elem.style.background = this.background;
      elem.style.borderRadius = "20px";
    }
  }

  /** */
  private suggestionSelected(nickname?: string) {
    if (nickname) {
      if (nickname[0] == '@') {
        nickname = nickname.slice(1);
      }
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
    console.log(`Commit input value "${this.inputElem.value}"`);
    this.dispatchEvent(new CustomEvent<VinesInputEvent>('input', {detail: {text: this.inputElem.value!, file: this._file!, wal: this._wal!}, bubbles: true, composed: true}));
    this.inputElem.value = "";
    this._cacheInputValue = "";
    this._file = undefined;
    this._wal = undefined;
  }



  /** */
  handleSuggestingKeydown(e:any) {
    //console.log("Keydown keyCode", e.keyCode);
    /** Undo suggesting if '@' has been erased */
    if (e.keyCode == 8 && this.inputElem.value.substr(this.inputElem.value.length - 1) === "@") {
      this.suggestionSelected();
    }

    /** get currently selected item index */
    const items = this.suggestionListElem.getItems();
    let i = 0;
    for (const item of items) {
      if (item.selected) {
        break;
      }
      i += 1;
    }
    // console.log("selected first item?", i, items.length);
    // /** select first if none */
    // if (i == items.length) {
    //   i = 0;
    //   items[0].selected = true;
    // }

    /* UP: select previous */
    if (e.keyCode == 38) {
      if (i > 0) {
        items[i]!.selected = false;
        items[i - 1]!.selected = true;
      }
      e.preventDefault();
    }
    /* Down: select next */
    if (e.keyCode == 40) {
      if (i < items.length - 1) {
        items[i]!.selected = false;
        items[i + 1]!.selected = true;
      }
      e.preventDefault();
    }
    /* Home: select fist */
    if (e.keyCode == 33) {
      items[i]!.selected = false;
      items[0]!.selected = true;
      e.preventDefault();
    }
    /* End: select fist */
    if (e.keyCode == 34) {
      items[i]!.selected = false;
      items[items.length - 1]!.selected = true;
      e.preventDefault();
    }
    /* Enter or Tab: select current */
    if (e.keyCode === 9 || e.keyCode === 13) {
      console.log("selected item", items[i], items[i]!.outerText);
      this.suggestionSelected(items[i]!.outerText);
      e.preventDefault();
    }
  }


  /** */
  handleKeydown(e:any) {
    //console.log("keydown", e);
    const isSuggesting = this.popoverElem && this.popoverElem.isOpen();
    //console.log("Input keydown keyCode", e.keyCode, isSuggesting, this.inputElem.value);
    if (isSuggesting) {
      this.handleSuggestingKeydown(e);
      return;
    }
    /** Enter: commit message */
    if (e.keyCode === 13) {
      if (e.shiftKey) {
          /* add newline to input.value?? */
      } else {
        console.log("keydown keyCode ENTER", this.inputElem.value);
        e.preventDefault();
        this.commitInput();
      }
    }
  }


  /** */
  _specialProfiles: Record<string, ProfileMat> = {
    "__all": {nickname: "all", fields: {}},
  }

  //
  // /** */
  // _dummyProfiles: AgentIdMap<ProfileMat> = {
  //   "Alex": {nickname: "Alex", fields: {}},
  //   "Billy": {nickname: "Billy", fields: {}},
  //   "Camille": {nickname: "Camille", fields: {}},
  //   "Dom": {nickname: "Dom", fields: {}},
  //   "E": {nickname: "E", fields: {}},
  //   "F": {nickname: "F", fields: {}},
  // };


  /** */
  splitByWordsAndPunctuation(str: string): string[] {
    const regex = /[@a-zA-ZÀ-ÖØ-öø-ÿ0-9']+|[^\w\s]/g;
    const res = str.match(regex);
    return res? res : [];
  }


  /** */
  override render() {
    console.log("<vines-input-bar>.override render()", this.cachedInput, this._wal, this.profilesZvm);

    /** check & enable suggestion popover */
    const isSuggesting = this.popoverElem && this.popoverElem.isOpen();
    const input = this.inputElem? this.inputElem.value : "";
    const endsWithWhitespace = input.length != input.trimEnd().length;
    const words = this.splitByWordsAndPunctuation(input); //input.trim().split(/\s+/);
    const lastWord = words.length > 0 ? words[words.length - 1]! : "";
    const lastWordIsMention = lastWord.length > 0 && lastWord[0] == '@' && !endsWithWhitespace;
    //console.log("input words", words, lastWordIsMention);
    let agentItems: TemplateResult<1>[] = [];
    if (lastWordIsMention) {
      const filter = lastWord.slice(1);
      /** Filter suggestions */
      let suggestionItems = Object.entries(this._specialProfiles);
      if (this.profilesZvm) {
        for (const agent of this.profilesZvm.perspective.agents) {
          const profile = this.profilesZvm.perspective.getProfile(agent);
          if (profile) {
            suggestionItems.push([agent.b64, profile])
          }
        }
      }
      let suggestionKeys = suggestionItems.map(([agentKey, _profile]) => agentKey);

      /** Filter */
      const filtered = suggestionItems
        .filter(([_agentKey, profile]) => {
          const index = profile.nickname.toUpperCase().indexOf(filter.toUpperCase());
          return index !== -1;
        })
        .map(([agentKey, _profile]) => agentKey);
      //console.log("<vines-input-bar>.override render() filtered", filtered);
      if (filtered.length != 0) {
        suggestionKeys = filtered;
      }

      /** Detect previous selected has been filtered out */
      let lostSelected = false;
      let selectedId = "";
      if (this.suggestionListElem && this.suggestionListElem.getSelectedItems().length > 0) {
        selectedId = this.suggestionListElem.getSelectedItems()[0]!.id;
        lostSelected = !suggestionKeys.includes(selectedId);
      }
      const canSelectFirst = this.popoverElem && (!isSuggesting || lostSelected || this.suggestionListElem && this.suggestionListElem.getSelectedItems().length == 0);
      //console.log("canSelectFirst", canSelectFirst, this.suggestionListElem.getSelectedItems().length);
      /** Render agent lists for mentions */
      let i = 0;
      agentItems = suggestionKeys.map((key) => {
          i += 1;
          const canSelect = i == 1 && canSelectFirst || key == selectedId;
          /* Special mentions */
          if (key == "__all") {
            return html`             
                <ui5-li id=${key} style="height: 3rem; border: none;" ?selected=${canSelect}
                @click=${(e:any) => {
                  e.preventDefault();
                  this.suggestionSelected(key);
                }}>
              @all
          </ui5-li>`;
          }
          const agentId = new AgentId(key);
          if (agentId.equals(this.profilesZvm.cell.address.agentId)) return html``;
          /** Grab and display profile */
          const profile = this.profilesZvm.perspective.getProfile(agentId);
          //const profile = this._dummyProfiles[key];
          if (!profile) return html``;
          return html`             
          <ui5-li id=${key} style="height: 3rem; border: none;" ?selected=${canSelect}
                @click=${(e:any) => {
                  e.preventDefault();
                  this.suggestionSelected(profile.nickname);
                  }}>
              ${renderAvatar(this.profilesZvm, new AgentId(key), "XS", "chatAvatar", "imageContent")}
              ${profile.nickname}
          </ui5-li>`;
        });
      /** */
      if (this.popoverElem && !isSuggesting) {
        this.popoverElem.showAt(this.inputElem as any as HTMLElement);
        this._cacheInputValue = this.inputElem.value;
        if (lastWordIsMention && lastWord.length > 2) {
          //console.log("_cacheInputValue inputElem", this.inputElem.value, lastWord, lastWord.length - 1)
          this._cacheInputValue = this.inputElem.value.slice(0, -(lastWord.length - 1));
          //console.log("_cacheInputValue after", this._cacheInputValue)
        }
      }
    }

    // TODO: refactor when to call suggestionSelected()
    if (this.popoverElem && isSuggesting && agentItems.length == 0) {
      this.suggestionSelected();
    }


    let fileElem = html``;
    if (this._file) {
      fileElem = html`
          <div style="margin-left: 35px; height: 20px; margin-top: 5px; color: #4141cc;">
              File: ${this._file.name}
              <ui5-button class="trash" icon="delete" design="Transparent" tooltip=${msg('Remove attachment')}
                          @click=${(_e:any) => this._file = undefined}></ui5-button>
          </div>
      `;
    }

    let walElem = html``;
    if (this._wal) {
      walElem = html`
          <div style="margin-left: 35px; height: 20px; margin-top: 5px; color: #4141cc;">
              <wurl-link wurl="${weaveUrlFromWal(this._wal)}"></wurl-link>
              <ui5-button class="trash" icon="delete" design="Transparent" tooltip=${msg('Remove attachment')}
                          @click=${(_e:any) => this._wal = undefined}></ui5-button>
          </div>
      `;
    }

    /** render all */
    return html`
        ${fileElem}
        ${walElem}
        <ui5-bar id="inputBar" design="FloatingFooter">
            <!-- <ui5-button slot="startContent" design="Positive" icon="add"></ui5-button> -->
            ${this.showHrlBtn? html`
            <ui5-button design="Transparent" icon="add"  tooltip=${msg('Attach WAL from pocket')}
                        @click=${async (_e:any) => {
                            this._wal = await this.weServices.userSelectWal();
                        }}>
            </ui5-button>` : html``}
            ${this.showFileBtn? html`
            <ui5-button design="Transparent" icon="attachment" tooltip=${msg('Attach file')}
                        @click=${(_e:any) => {
                          let input = document.createElement('input');
                          input.type = 'file';
                          input.onchange = (e:any) => {this._file = e.target.files[0];}
                          input.click();
                        }}>
            </ui5-button>` : html``}
            <!-- TEXT AREA -->
            <ui5-textarea id="textMessageInput" mode="SingleSelect"
                          placeholder="Message #${this.topic}, @ to mention"
                          growing
                          growing-max-lines="3"
                          rows="1"
                          maxlength="1000"
                          @keydown=${this.handleKeydown}
                          @input=${(_e:any) => this.requestUpdate()}
            ></ui5-textarea>
            <!-- <ui5-button design="Transparent" slot="endContent" icon="delete"></ui5-button> -->
        </ui5-bar>
        <ui5-popover id="pop" hide-arrow allow-target-overlap placement-type="Top" horizontal-align="Stretch" initial-focus="textMessageInput">
          <ui5-list id="agent-list">
              ${agentItems}
          </ui5-list>
        </ui5-popover>
    `;
  }

  /** */
  static override get styles() {
    return [
      css`
        ui5-avatar {
          margin-top: 9px;
          margin-left: 15px;
        }

        #pop {
          /*background: #e3e3e3;*/
          box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;
        }

        #inputBar {
          width: auto;
          height: auto;
          box-shadow: none;
          padding: 3px;
          border-radius: 10px;
        }

        #textMessageInput {
          width: 100%;
          border: none;
          padding: 0px;
        }

        .trash {
          color: #ec4b7a;
          padding: 0px;
          margin: 0px;
          height: 20px;
        }

        .trash:hover {
          background-color: rgba(243, 175, 175, 0.6);
          border-color: #ec0e0e;
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
