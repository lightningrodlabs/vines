import {css, html, PropertyValues, TemplateResult} from "lit";
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
import {msg, str} from "@lit/localize";
import {ActionId, AgentId, DnaElement} from "@ddd-qc/lit-happ";
import {MicEvent, VinesInputEvent} from "../events";
import {filesContext, weClientContext} from "../contexts";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {WAL, weaveUrlFromWal} from "@theweave/api";
import Menu from "@ui5/webcomponents/dist/Menu";
import Button from "@ui5/webcomponents/dist/Button";
import {MIC_MIME_TYPE} from "../features/chat-thread/audio-recorder";
import {toasty} from "../toast";
import {formatFileSize, isFileValid} from "../utils";
import {
  DEFAULT_MAX_TEXT_LENGTH,
  defaultCommentLimitations,
} from "../viewModels/threads.materialize";
import {formatTime} from "../features/timezone/utils";
import {ThreadsDnaPerspective, ThreadsDvm} from "../viewModels/threads.dvm";
import {FilesDvm, prettyFileSize} from "@ddd-qc/files";
import {AudioPanel} from "../features/chat-thread/audio-panel";


/**
 * @element
 */
@customElement("vines-input-bar")
export class InputBar extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  /** -- Consumed -- */

  @consume({context: weClientContext, subscribe: true})
  weServices!: WeServicesEx;

  @consume({context: filesContext, subscribe: true})
  filesDvm!: FilesDvm;

  /** -- Properties -- */

  @property() topic: string = '';

  @property({type: Boolean}) busy: boolean = false;

  @property() background?: string;

  @property({type: Boolean}) nosend: boolean = false;

  @property() threadHash?: ActionId;
  @property() agentHash?: AgentId; // special case when DM-ing before DM thread was created

  /** -- State -- */

  @state() private _stashedInputValue: string = ""; // Used for mention pop-up
  @state() private _prevInputValue: string = "";

  @state() private _file: File | undefined = undefined;
  @state() private _wal: WAL | undefined = undefined;

  @state() private _isEditingFileName: boolean = false;


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
    //console.debug("<vines-input-bar>.value()", this.inputElem? this.inputElem.value : "<no elem>");
    if (this.inputElem) {
      return this.inputElem.value;
    }
    return "";
  }

  setWal(f: WAL): void {
    this._wal = f;
  }

  setFile(f: File): void {
    console.log("<vines-input-bar>.setFile()", f);
    this._file = f;
  }

  setValue(v: string): void {
//    console.debug("<vines-input-bar>.setValue()", v);
    if (this.inputElem) {
      this.inputElem.value = v;
      this.requestUpdate();
      //console.log("<vines-input-var> (jump) setValue to", v);
    }
  }

  /** -- Callbacks -- */

  /** Handle events */
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


  /** -- Methods -- */

  /**  */
  onPaste(e: ClipboardEvent) {
    e.preventDefault();
    // console.debug("<vines-input-bar>.onPaste()", e);
    const text = e.clipboardData?.getData('text/plain');
    if (text && this.inputElem) {
      //console.log('<vines-input-bar>.onPaste() text:', text);
      /** Get the text content before and after cursor */
      const nativeTextarea = this.inputElem.shadowRoot!.querySelector("textarea") as unknown as HTMLInputElement;
      //console.log("<vines-input-bar>.onPaste() input", nativeTextarea.selectionStart, nativeTextarea.selectionEnd);
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

  /** */
  protected override async firstUpdated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow parts CSS */
    const inputBar = this.shadowRoot!.getElementById('inputBar') as HTMLElement;
    if (inputBar) {
      inputBar.shadowRoot!.appendChild(inputBarStyleTemplate.content.cloneNode(true));

      const input = inputBar.querySelector("#textMessageInput") as HTMLElement;
      //console.log("textMessageInput", input);
      input.shadowRoot!.appendChild(inputBarStyleTemplate.content.cloneNode(true));

      const pop = this.shadowRoot!.getElementById('pop') as HTMLElement;
      const list = pop.querySelector("#agent-list") as HTMLElement;
      //console.log("<vines-input-bar> #agent-list", pop, list);
      list.shadowRoot!.appendChild(suggestionListTemplate.content.cloneNode(true));
    }
    /** Set initial background */
    if (this.background) {
      const elem = this.shadowRoot!.getElementById('inputBar') as HTMLElement;
      elem.style.background = this.background;
      elem.style.borderRadius = "20px";
    }
  }


  private _limitations = defaultCommentLimitations();

  /** */
  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    //console.debug("<vines-input-bar>.willUpdate()", changedProperties.has("threadHash"), this.threadHash, this.agentHash, changedProperties);
    /** Set Restrictions */
    if (this.threadHash && this._dvm.threadsZvm.perspective.threads.get(this.threadHash!)) {
      this._limitations = this._dvm.threadsZvm.perspective.threads.get(this.threadHash!)!.pp.limitations;
      //console.debug("<vines-input-bar> limitations", this._limitations);
    } else {
      this._limitations = defaultCommentLimitations();
    }
    /* Set cached input */
    if ((changedProperties.has("threadHash") || changedProperties.has("agentHash")) && this.inputElem /*&& this.inputElem.value == ""*/) {
      //console.debug("<vines-input-bar>.willUpdate() restore cached input. current:", this.inputElem.value);
      this.inputElem.value = "";
      if (this.threadHash) {
        const maybe = this.perspective.threadInputs.get(this.threadHash);
        if (maybe) {
          this.inputElem.value = maybe;
        }
      }
    }
  }


  /** */
  override updated(_changedProperties: PropertyValues) {
    /** Tip if input value changed */
    const current = this.inputElem? this.inputElem.value : "";
    //console.debug(`<vines-input-bar>.updated() text-input "${this._prevInputValue}"`, current);
    if (this.inputElem && this.threadHash && current != this._prevInputValue) {
      this._prevInputValue = this.inputElem.value;
      this._dvm.storeThreadInput(this.threadHash, this.inputElem.value);
    }
    /** */
    const maybeEdit = this.shadowRoot!.getElementById("filename-input") as Input;
    if (maybeEdit) {
      maybeEdit.focus();
    }
    /** Make sure input stays focus after committing */
    this.focusInput();
  }


  /** */
  private suggestionSelected(nickname?: string) {
    if (nickname) {
      if (nickname[0] == '@') {
        nickname = nickname.slice(1);
      }
      this.inputElem.value = this._stashedInputValue + nickname + " "
    }
    this.inputElem.focus();
    if (this.popoverElem.isOpen()) {
      this.popoverElem.close();
    }
    this._stashedInputValue = "";
  }


  /** */
  private validateText(text: string): string {
    if (text.length < this._limitations.canText!.minTextLength) {
      return msg("Text too short");
    }
    /** Check banned words */
    const words = text.split(/\s+/);
    for (const banned of this._limitations.canText!.bannedWords) {
      if (words.includes(banned)) {
        return msg("Banned word used") + ": " + banned;
      }
    }
    /** */
    return "";
  }


  /** */
  private commitInput() {
    console.log(`<vines-input-bar> Commit input`);
    /** Validate */
    if (this.inputElem) {
      const reason = this.validateText(this.inputElem.value);
      if (reason) {
        // this.inputElem.valueState = ValueState.Error;
        toasty(msg("Invalid message") + ": " + reason);
        return;
      }
    }
    /** Shoot event */
    const text = this.inputElem? this.inputElem.value : undefined;
    const event: VinesInputEvent = {
      ppAh: this.threadHash!,
      agent: this.agentHash!,
      text,
      file: this._file!,
      wal: this._wal!,
    };
    this.dispatchEvent(new CustomEvent<VinesInputEvent>('vines-input-commit', {
      detail: event,
      bubbles: true,
      composed: true
    }));
    /** Clean-up */
    if (this.inputElem) this.inputElem.value = "";
    this._stashedInputValue = "";
    this._file = undefined;
    this._wal = undefined;
    this._isEditingFileName = false;
    this.requestUpdate();
  }


  /** */
  handleSuggestingKeydown(e: any) {
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
      console.log("<vines-input-bar> selected item", items[i], items[i]!.outerText);
      this.suggestionSelected(items[i]!.outerText);
      e.preventDefault();
    }
  }


  /** */
  handleKeydown(e: any) {
    //console.log("<vines-input-bar> keydown", this.threadHash, this.popoverElem && this.popoverElem.isOpen(), e);
    const isSuggesting = this.popoverElem && this.popoverElem.isOpen();
    //console.log("Input keydown keyCode", e.keyCode, isSuggesting, this.inputElem.value);
    if (isSuggesting) {
      this.handleSuggestingKeydown(e);
      return;
    }
    /** Enter: commit message */
    if (e.keyCode === 13) {
      if (!e.shiftKey) {
        //console.log("<vines-input-bar> keydown keyCode ENTER", this.inputElem.value);
        e.stopPropagation();
        e.preventDefault();
        this.commitInput();
      }
      return;
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
    this._isEditingFileName = false;
  }


  /** */
  pickFile() {
    let accept = "";
    for (const k of this._limitations.canFile!.allowedFileTypes) {
      accept += k + ", "
    }
    console.log("<vines-input-bar> pickFile()", this._limitations.canFile, accept);
    let input = document.createElement('input');
    input.accept = accept;
    input.type = 'file';
    input.onchange = (e) => this.onAttachFile(e);
    input.click();
  }


  /** */
  override render() {
    console.debug(`<vines-input-bar>.render() ${this.busy}`);
    const input = this.inputElem? this.inputElem.value : "";
    //console.log("<vines-input-bar>.render()", this.threadHash, this.agentHash, input);
    const me = this._dvm.cell.address.agentId;

    /** check & enable suggestion popover */
    const isSuggesting = this.popoverElem && this.popoverElem.isOpen();

    const endsWithWhitespace = input.length != input.trimEnd().length;
    const words = this.splitByWordsAndPunctuation(input); //input.trim().split(/\s+/);
    const lastWord = words.length > 0? words[words.length - 1]! : "";
    const lastWordIsMention = lastWord.length > 0 && lastWord[0] == '@' && !endsWithWhitespace;
    //console.log("input words", words, lastWordIsMention);
    let agentItems: TemplateResult<1>[] = [];
    if (lastWordIsMention) {
      const filter = lastWord.slice(1);
      /** Filter suggestions */
      let suggestionItems = Object.entries(this._specialProfiles);
      for (const agent of this._dvm.profilesZvm.perspective.agents) {
        const profile = this._dvm.profilesZvm.perspective.getProfile(agent);
        if (profile && !profile.fields["imported"]) {
          suggestionItems.push([agent.b64, profile])
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
                      @click=${(e: any) => {
                          e.preventDefault();
                          this.suggestionSelected(key);
                      }}>
                  @all
              </ui5-li>`;
        }
        const agentId = new AgentId(key);
        if (agentId.equals(me)) return html``;
        /** Grab and display profile */
        const profile = this._dvm.profilesZvm.perspective.getProfile(agentId);
        //const profile = this._dummyProfiles[key];
        if (!profile) return html``;
        return html`
            <ui5-li id=${key} style="height: 3rem; border: none;" ?selected=${canSelect}
                    @click=${(e: any) => {
                        e.preventDefault();
                        this.suggestionSelected(profile.nickname);
                    }}>
                ${renderAvatar(this, this._dvm.profilesZvm, new AgentId(key), "XS", "chatAvatar", "imageContent")}
                ${profile.nickname}
            </ui5-li>`;
      });
      /** */
      if (this.popoverElem && !isSuggesting) {
        this.popoverElem.showAt(this.inputElem as any as HTMLElement);
        this._stashedInputValue = this.inputElem.value;
        if (lastWordIsMention && lastWord.length > 2) {
          //console.log("_cacheInputValue inputElem", this.inputElem.value, lastWord, lastWord.length - 1)
          this._stashedInputValue = this.inputElem.value.slice(0, -(lastWord.length - 1));
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
      const fileNameElem = this._isEditingFileName
        ? html`<ui5-input id="filename-input"
                             .value=${this._file.name}
                             @change=${(_e: any) => this.onEditFile()}></ui5-input>`
        : html`<div>${this._file.name}</div>`;

      fileElem = html`
          <div class="file-row">
              <div style="margin-right:5px;">${msg("File")}:</div>
              ${fileNameElem}
              <span style="margin-left:5px; font-size:small;">(${formatFileSize(this._file.size)})</span>
              <ui5-button class="fileIcon" icon="edit" design="Transparent" tooltip=${msg('Rename file')}
                          style="margin-left:10px;"
                          @click=${(_e: any) => this._isEditingFileName = !this._isEditingFileName}></ui5-button>
              <ui5-button class="fileIcon trash" icon="delete" design="Transparent" tooltip=${msg('Remove attachment')}
                          @click=${(_e: any) => {
                              this._file = undefined;
                              this._isEditingFileName = false;
                          }}></ui5-button>
          </div>
      `;
    }

    let walElem = html``;
    if (this._wal) {
      walElem = html`
          <div style="margin-left: 35px; height: 35px; margin-top: 5px; color: #4141cc;">
              <wurl-link wurl="${weaveUrlFromWal(this._wal)}"></wurl-link>
              <ui5-button class="trash" icon="delete" design="Transparent" tooltip=${msg('Remove attachment')}
                          @click=${(_e: any) => this._wal = undefined}></ui5-button>
          </div>
      `;
    }


    let addBtn = html``;
    let micBtn = html``;
    if (this._limitations.canFile) {
      const maybePanel = this.shadowRoot!.getElementById("audio-panel") as AudioPanel;
      micBtn = html`
          <ui5-button id="micBtn" design="Transparent" icon="microphone" tooltip=${msg('Create Voice Message')}
                      style="color: ${maybePanel && maybePanel.isRecording? "red" : ""}"
                      @click=${(_e: any) => {
                          const el = this.shadowRoot!.getElementById("micBtn") as HTMLElement;
                          this.micDialogElem.showAt(el);
                          //this.micDialogElem.show();
                      }}>
          </ui5-button>
      `;

      addBtn = html`
          <ui5-button design="Transparent" icon="attachment" tooltip=${msg('Attach file')}
                      @click=${(_e: any) => { this.pickFile()}}>
          </ui5-button>
      `;
    }
    if (this.weServices && (this._limitations.canFile || this._limitations.canWal)) {
      addBtn = html`
          <ui5-button id="addBtn" design="Transparent" icon="add" tooltip=${msg('Add Attachment')}
                      @click=${(_e: any) => {
                          const settingsMenu = this.shadowRoot!.getElementById("addMenu") as Menu;
                          const settingsBtn = this.shadowRoot!.getElementById("addBtn") as Button;
                          settingsMenu.showAt(settingsBtn);
                      }}>
          </ui5-button>
      `
    }

    let inputPlaceholder = msg('<Text message forbidden>');
    if (this._limitations.canText) {
      const maxTextLength = this._limitations.canText!.maxTextLength;
      inputPlaceholder = maxTextLength > 0 && maxTextLength != DEFAULT_MAX_TEXT_LENGTH
        ? `${msg("Message")} ${this.topic}, @ ${msg("to mention")} (${msg('limit:')} ${maxTextLength} ${msg('characters')})`
        : `${msg("Message")} ${this.topic}, @ ${msg("to mention")}`;
    }

    const canSend = (this.inputElem && this.inputElem.value.length > 0) || this._file || this._wal;

    /** render busy bar */
    let busyBar = html``;
    if (this.busy) {
       busyBar = html`
         <div style="margin-top: -10px;">
           <ui5-bar design="FloatingFooter" style="width 300px; background:#ccc;">
               <ui5-busy-indicator delay="0" size="Large" active
                                   style="margin:auto; width:100%; height:100%; color:#404455c7;"
               ></ui5-busy-indicator>
           </ui5-bar>
         </div>
       `;
    }
    /** render all */
    return html`
        ${busyBar}
        <div id="input-bar" style="${this._limitations.canText? "" : "width:fit-content;"}; ${this.busy? "display: none;": ""}">
            ${fileElem}
            ${walElem}
            <ui5-bar id="inputBar" design="FloatingFooter">
                <!-- <ui5-button slot="startContent" design="Positive" icon="add"></ui5-button> -->
                ${this.nosend? html`` : html`
                  ${addBtn}
                  ${micBtn}
                `}
                <!-- TEXT AREA -->
                ${this._limitations.canText? html`
                    <ui5-textarea id="textMessageInput" mode="SingleSelect"
                                  placeholder=${inputPlaceholder}
                                  growing
                                  growing-max-lines="10"
                                  rows="1"
                                  .maxlength=${this._limitations.canText!.maxTextLength == 0? DEFAULT_MAX_TEXT_LENGTH : this._limitations.canText!.maxTextLength}
                                  @keydown=${this.handleKeydown}
                                  @input=${(_e: any) => {
                                      //console.debug("<vines-input-bar> input input event");
                                      this.requestUpdate();
                                  }}
                    ></ui5-textarea>` : html``}
                
                    <ui5-button slot="${this._limitations.canText? "endContent" : ""}" design="Emphasized"
                                icon="paper-plane" tooltip=${msg("Send")}
                                ?disabled=${!canSend}
                                @click=${() => this.commitInput()}></ui5-button>
            </ui5-bar>
        </div>
        <ui5-popover id="pop" hide-arrow allow-target-overlap placement-type="Top" horizontal-align="Stretch"
                     initial-focus="textMessageInput">
            <ui5-list id="agent-list">
                ${agentItems}
            </ui5-list>
        </ui5-popover>
        <!-- menu -->
        <ui5-menu id="addMenu" header-text=${msg("Add")} @item-click=${(e: any) => this.onAddMenu(e)}>
            <ui5-menu-item id="fileItem" ?disabled=${!this._limitations.canFile} text=${msg("Upload a File")}
                           icon="attachment" starts-section></ui5-menu-item>
            ${this.weServices? html`
                <ui5-menu-item id="linkWalItem" ?disabled=${!this._limitations.canText} text=${msg("Insert an Asset Link")}
                               icon="chain-link" starts-section></ui5-menu-item>
                <ui5-menu-item id="embedWalItem" ?disabled=${!this._limitations.canWal} text=${msg("Embed an Asset")}
                               starts-section></ui5-menu-item>
            ` : html``}
        </ui5-menu>
        <!-- CreateThreadDialog -->
        <ui5-popover id="mic-dialog" header-text=${msg("Create Voice Message")} placement-type="Top"
                     @close=${() => console.debug("FIXME: Modal doesnt work properly so can't detect if user clicks outside of popover...")}>
            <audio-panel id="audio-panel"
                         @close=${() => {
                             this.micDialogElem.close(false);
                             this.requestUpdate();
                         }}
                         @rec=${() => {this.requestUpdate();}}
                         @mic=${(e: CustomEvent<MicEvent>) => {
                             const myProfile = this._dvm.profilesZvm.getMyProfile()!;
                             //const day = format(Date.now() * 1000, "yyyy-MMMM-dd-HH.mm");
                             const day = formatTime(Date.now() * 1000, myProfile.fields["timezone"]!);
                             const filename = `${this.topic}-${myProfile.nickname}-${day}.opus`;
                             const file = new File([e.detail.blob],
                                     filename,
                                     {type: MIC_MIME_TYPE, lastModified: Date.now()}
                             );
                             if (file.size < this._limitations.canFile!.minFileSize || file.size > this._limitations.canFile!.maxFileSize) {
                                 toasty(msg("Attach recording cancelled: Invalid file size"));
                             } else {
                                 this._file = file;
                             }
                             this.micDialogElem.close(false);
                             if (e.detail.canSend) {
                                 this.commitInput();
                             }
                             this.requestUpdate();
                         }}
            ></audio-panel>
        </ui5-popover>
    `;
  }

  /** */
  onAttachFile(e: any) {
    const file = e.target.files[0] as File;
    const fileLimits = this._limitations.canFile!;
    console.log("<vines-input-bar> onAttachFile()", file.size, fileLimits.minFileSize, fileLimits.maxFileSize)
    if (!isFileValid(file, this.filesDvm.dnaProperties)) {
      this.focusInput();
      return;
    }
    if (file.size > fileLimits.maxFileSize /*|| file.size > this._filesDvm.dnaProperties.maxParcelSize*/) {
      toasty(msg(str`Error: File is too big: ${prettyFileSize(file.size)}. Maximum file size allowed in this channel: ${prettyFileSize(fileLimits.maxFileSize)}`));
      this.focusInput();
      return;
    }
    if (file.size < fileLimits.minFileSize) {
      toasty(msg(str`Error: File is too small: ${prettyFileSize(file.size)}. Minimum file size allowed in this channel: ${prettyFileSize(fileLimits.minFileSize)}`));
      this.focusInput();
      return;
    }
    this._file = file;
    this.focusInput();
  }


  /** */
  async onAddMenu(e: any): Promise<void> {
    console.log("<vines-input-bar> AddMenu.item-click", e, this._limitations.canWal, this._limitations.canFile);
    switch (e.detail.item.id) {
      case "fileItem":
        this.pickFile();
        break;
      case "linkWalItem":
        const maybeWalLink = await this.weServices.assets.userSelectAsset();
        console.log("<vines-input-bar> maybeWalLink", maybeWalLink);
        if (maybeWalLink && this.inputElem) {
          this.inputElem.value += weaveUrlFromWal(maybeWalLink);
          this.requestUpdate();
        }
        break;
      case "embedWalItem":
        const maybeWal = await this.weServices.assets.userSelectAsset();
        console.log("<vines-input-bar> maybeWal", maybeWal);
        this._wal = maybeWal;
        this.focusInput();
        break;
    }
  }


  /** */
  static override get styles() {
    return [
      css`
        :host {
          /*background: beige;*/
        }

        #input-bar {
          margin: auto;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;
          border-radius: 20px;
        }

        ui5-avatar {
          margin-top: 9px;
          margin-left: 15px;
        }

        .file-row {
          margin-left: 35px;
          height: 25px;
          margin-top: 5px;
          margin-right: 5px;
          padding-top: 5px;
          color: #4141cc;
          display: flex;
          flex-direction: row;
          align-items: center;
          margin-bottom: 3px;
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

          ui5-textarea::part(textarea) {
             text-wrap:auto;
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
