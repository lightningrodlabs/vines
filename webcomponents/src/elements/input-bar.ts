import {css, html, LitElement, PropertyValues, TemplateResult} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {consume} from "@lit/context";

import Popover from "@ui5/webcomponents/dist/Popover";

import {inputBarStyleTemplate, suggestionListTemplate} from "../styles";


import Input from "@ui5/webcomponents/dist/Input";

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
import {WAL, weaveUrlFromWal} from "@theweave/api";
//import {toasty} from "../toast";
import Menu from "@ui5/webcomponents/dist/Menu";
import Button from "@ui5/webcomponents/dist/Button";
import {MIC_MIME_TYPE} from "../features/chat-thread/audio-recorder";
import {toasty} from "../toast";
import {formatFileSize} from "../utils";
import {Limitations} from "../bindings/threads.types";
import {defaultLimitations} from "../viewModels/threads.materialize";
//import {handledMimeTypes} from "../features/rules/rules-edit";
//import ValueState from "@ui5/webcomponents-base/dist/types/ValueState.js";


/**
 * @element
 */
@customElement("vines-input-bar")
export class InputBar extends LitElement {

  /** Properties */

  @property() topic: string = '';
  @property() cachedInput: string = '';

  @property() background?: string;
  @property() limitations: Limitations = defaultLimitations();

  @property({type: Object}) profilesZvm!: ProfilesAltZvm;

  @state() private _cacheInputValue: string = "";
  @state() private _file: File | undefined = undefined;
  @state() private _wal: WAL | undefined = undefined;

  @state() private _isEditing: boolean = false;

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

  get micDialogElem(): Popover {
    return this.shadowRoot!.getElementById("mic-dialog") as Popover;
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


  /** Handle 'jump' event */
  override connectedCallback() {
    super.connectedCallback();
    // @ts-ignore
    this.addEventListener('paste', this.onPaste);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // @ts-ignore
    this.removeEventListener('paste', this.onPaste);
  }

  /**  */
  onPaste(e: ClipboardEvent) {
    e.preventDefault();
    //console.log("<vines-input-bar>.onPaste()", e);
    const text = e.clipboardData?.getData('text/plain');
    if (text) {
      //console.log('<vines-input-bar>.onPaste() text:', text);
      /** Get the text content before and after cursor */
      const nativeTextarea = this.inputElem.shadowRoot!.querySelector("textarea") as unknown as HTMLInputElement;
      console.log("<vines-input-bar>.onPaste() input", nativeTextarea.selectionStart, nativeTextarea.selectionEnd);
      const textBeforeCursor = this.value.substring(0, nativeTextarea.selectionStart!);
      const textAfterCursor = this.value.substring(nativeTextarea.selectionEnd!);
      /** Done */
      this.setValue(textBeforeCursor + text + textAfterCursor);
      //this.setValue(this.value + text);
      return;
    }

    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        //console.log("<vines-input-bar>.onPaste()", items[i]!.type);
        //if (items[i]!.type.indexOf('image') !== -1) {
          const blob = items[i]!.getAsFile();
          if (blob) {
            this._file = blob;
            return;
          }
        //}
      }
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
  override updated(changedProperties: PropertyValues) {
    /* Set cached input */
    if (changedProperties.has("cachedInput") && this.inputElem && this.inputElem.value == "" && this.cachedInput != "") {
      //console.warn("<vines-input-bar> updated() cachedInput", this.cachedInput, this.inputElem);
      this.inputElem.value = this.cachedInput;
    }
    if (this.background) {
      const elem = this.shadowRoot!.getElementById('inputBar') as HTMLElement;
      elem.style.background = this.background;
      elem.style.borderRadius = "20px";
    }

    const maybeEdit = this.shadowRoot!.getElementById("filename-input") as Input;
    if (maybeEdit) {
      maybeEdit.focus();
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


  private validateText(text: string): boolean {
    if (text.length < this.minTextSize) {
      return false;
    }
    /** Check banned words */
    // FIXME
    /** */
    return true;
  }

  /** */
  private commitInput() {
    console.log(`Commit input value "${this.inputElem.value}"`);
    /** Validate */
    if (!this.validateText(this.inputElem.value)) {
      // this.inputElem.valueState = ValueState.Error;
      return;
    }
    /** Shoot */
    this.dispatchEvent(new CustomEvent<VinesInputEvent>('input', {detail: {text: this.inputElem.value!, file: this._file!, wal: this._wal!}, bubbles: true, composed: true}));
    /** Clean-up */
    this.inputElem.value = "";
    this._cacheInputValue = "";
    this._file = undefined;
    this._wal = undefined;
    this._isEditing = false;
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


  focusInput() {
    if (this.inputElem) {
      this.inputElem.focus();
    }
  }


  /** */
  async onEditFile() {
    if (!this._file) {
      return;
    }
    const input = this.shadowRoot!.getElementById("filename-input") as Input;
    const name = input.value.trim();
    this._file = new File([this._file!], name, {
      type: this._file!.type,
      lastModified: this._file!.lastModified,
    });
    this._isEditing = false;
  }


  /** Rules */
  private canWal = true;
  private canFile = true;
  private canText = true;
  private minFileSize = 0;
  private maxFileSize = 16 * 1024 * 1024; // FIXME: get DNA setting
  private minTextSize = 0;
  private maxTextSize = 16 * 1024;

  /** */
  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    /** Rules */
    if (changedProperties.has("limitations")) {
      console.log("<input-bar> limitations", this.limitations);
        //const rulesType = getRuleType(this.rules);
      this.canFile = true;
      this.canText = true;
      this.minFileSize = 0;
      this.maxFileSize = 16 * 1024 * 1024; // FIXME: get DNA setting
      this.minTextSize = 0;
      this.maxTextSize = 16 * 1024;

      this.canWal = this.limitations.canWal;
      if (!this.limitations.canFile) {
        this.canFile = false;
      } else {
        this.minFileSize = this.limitations.canFile.minFileSize;
        this.maxFileSize = this.limitations.canFile.maxFileSize;
      }
      if (!this.limitations.canText) {
        this.canText = false;
      } else {
        this.minTextSize = this.limitations.canText.minTextLength;
        this.maxTextSize = this.limitations.canText.maxTextLength;
      }

    }
  }


  /** */
  pickFile() {
    let accept = "";
    for (const k of this.limitations.canFile!.allowedFileTypes) {
      accept += k + ", "
    }
    console.log("pickFile()", this.limitations.canFile, accept);
    let input = document.createElement('input');
    input.accept = accept;
    input.type = 'file';
    input.onchange = (e) => this.onAttachFile(e);
    input.click();
  }


  /** */
  override render() {
    console.log("<vines-input-bar>.render() 2", this.cachedInput, this._wal, this.profilesZvm);

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
      //console.log("<vines-input-bar>.render() filtered", filtered);
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
      const fileNameElem = this._isEditing
        ? html`<ui5-input id="filename-input" .value=${this._file.name} @change=${(_e:any) => this.onEditFile()}></ui5-input>`
        : html`<div>${this._file.name}</div>`;

      fileElem = html`
          <div style="margin-left: 35px; height: 20px; margin-top: 5px; color: #4141cc; display: flex; flex-direction: row; align-items: center; margin-bottom: 3px;">
              <div style="margin-right:5px;">${msg("File")}:</div>
              ${fileNameElem}
              <span style="margin-left:5px;font-size: small;">(${formatFileSize(this._file.size)})</span> 
              <ui5-button class="fileIcon" icon="edit" design="Transparent" tooltip=${msg('Rename file')}
                          style="margin-left:10px;"
                          @click=${(_e:any) => this._isEditing = !this._isEditing}></ui5-button>
              <ui5-button class="fileIcon trash" icon="delete" design="Transparent" tooltip=${msg('Remove attachment')}
                          @click=${(_e:any) => {this._file = undefined; this._isEditing = false;}}></ui5-button>
          </div>
      `;
    }

    let walElem = html``;
    if (this._wal) {
      walElem = html`
          <div style="margin-left: 35px; height: 35px; margin-top: 5px; color: #4141cc;">
              <wurl-link wurl="${weaveUrlFromWal(this._wal)}"></wurl-link>
              <ui5-button class="trash" icon="delete" design="Transparent" tooltip=${msg('Remove attachment')}
                          @click=${(_e:any) => this._wal = undefined}></ui5-button>
          </div>
      `;
    }


    let addBtn = html``;
    let micBtn = html``;
    if (this.canFile) {
      micBtn = html`
          <ui5-button id="micBtn" design="Transparent" icon="microphone" tooltip=${msg('Voice Message')}
                      @click=${(_e: any) => {
                          const el = this.shadowRoot!.getElementById("micBtn") as HTMLElement;
                          this.micDialogElem.showAt(el);
                          //this.micDialogElem.show();
                      }}>
          </ui5-button>
      `;

      addBtn = html`
            <ui5-button design="Transparent" icon="attachment" tooltip=${msg('Attach file')}
                        @click=${(_e:any) => { this.pickFile()}}>
            </ui5-button>
      `;
    }
    if (this.weServices && (this.canFile || this.canWal)) {
      addBtn = html`
          <ui5-button id="addBtn" design="Transparent" icon="add"  tooltip=${msg('Add Attachment')}
                      @click=${(_e: any) => {
          const settingsMenu = this.shadowRoot!.getElementById("addMenu") as Menu;
          const settingsBtn = this.shadowRoot!.getElementById("addBtn") as Button;
          settingsMenu.showAt(settingsBtn);
        }}>
          </ui5-button>          
        `
    }


    const placeholder = this.canText
      ? this.maxTextSize > 0
        ? `${msg("Message")} #${this.topic}, @ ${msg("to mention")} (${msg('limit:')} ${this.maxTextSize} ${msg('characters')})`
        : `${msg("Message")} #${this.topic}, @ ${msg("to mention")}`
      : msg('<Text message forbidden>');

    /** render all */
    return html`
        ${fileElem}
        ${walElem}
        <ui5-bar id="inputBar" design="FloatingFooter">
            <!-- <ui5-button slot="startContent" design="Positive" icon="add"></ui5-button> -->
            ${addBtn}
            ${micBtn}
            <!-- TEXT AREA -->
            <ui5-textarea id="textMessageInput" mode="SingleSelect"
                          placeholder=${placeholder}
                          growing
                          growing-max-lines="3"
                          rows="1"
                          .maxlength=${this.maxTextSize}
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
        <!-- menu -->
        <ui5-menu id="addMenu" header-text=${msg("Add")} @item-click=${(e: any) => this.onAddMenu(e)}>
            <ui5-menu-item id="fileItem" ?disabled=${!this.canFile} text=${msg("Upload a File")} icon="attachment" starts-section></ui5-menu-item>             
            ${this.weServices? html`
            <ui5-menu-item id="linkWalItem" ?disabled=${!this.canText} text=${msg("Insert a WAL Link")} icon="chain-link" starts-section></ui5-menu-item>
            <ui5-menu-item id="embedWalItem" ?disabled=${!this.canWal} text=${msg("Embed a WAL")} starts-section></ui5-menu-item>
            ` : html``}
        </ui5-menu>
        <!-- CreateThreadDialog -->
        <ui5-popover id="mic-dialog" header-text=${msg("Create voice message")} placement-type="Top">
          <audio-panel @close=${() => this.micDialogElem.close(false)}
                       @mic=${(e:any) => {
                           const file = new File([e.detail],
                                   "recording.opus",
                                   { type: MIC_MIME_TYPE, lastModified: Date.now() }
                           );
                            if (file.size < this.minFileSize || file.size > this.maxFileSize) {
                                toasty("Attach recording cancelled: Invalid file size");
                            } else {
                              this._file = file;
                            }
                         this.micDialogElem.close(false);
                       }}
          ></audio-panel>
        </ui5-popover>
    `;
  }


  /** */
  onAttachFile(e:any) {
    const file = e.target.files[0] as File;
    console.log("onAttachFile()", file.size, this.minFileSize, this.maxFileSize)
    if (file.size < this.minFileSize || file.size > this.maxFileSize) {
      toasty("Attach File cancelled: Invalid file size");
    } else {
      this._file = e.target.files[0];
    }
    this.inputElem.focus();
  }


  /** */
  async onAddMenu(e:any): Promise<void> {
    console.log("AddMenu.item-click", e, this.limitations.canWal, this.limitations.canFile);
    switch (e.detail.item.id) {
      case "fileItem":
        this.pickFile();
      break;
      case "linkWalItem":
        const maybeWalLink = await this.weServices.assets.userSelectAsset();
        console.log("maybeWalLink", maybeWalLink);
        if (maybeWalLink) {
          this.inputElem.value += weaveUrlFromWal(maybeWalLink);
        }
      break;
      case "embedWalItem":
        const maybeWal = await this.weServices.assets.userSelectAsset();
        console.log("maybeWal", maybeWal);
        this._wal = maybeWal;
        this.inputElem.focus();
      break;
    }
  }


  /** */
  static override get styles() {
    return [
      css`
        :host {
          background: beige;
        }

        ui5-avatar {
          margin-top: 9px;
          margin-left: 15px;
        }

        #pop {
          /*background: #e3e3e3;*/
          box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;
        }

        #filename-input {
          /*color: rgba(28, 79, 248, 0.75);*/
          width: auto;
          max-height: 18px;
          background: #a7636312;
          border: none;
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

        .fileIcon {
          padding: 0px;
          margin: 0px;
          height: 20px;
        }

        .trash {
          color: #ec4b7a;
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
