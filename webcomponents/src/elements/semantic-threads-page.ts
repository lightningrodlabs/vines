import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {CommentThreadView} from "./comment-thread-view";
import {SemanticTopicsView} from "./semantic-topics-view";
import {AnyLinkableHashB64, ThreadsPerspective} from "../viewModels/threads.perspective";

/** @ui5/webcomponents */
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/Menu.js";
import Label from "@ui5/webcomponents/dist/Label"
import Dialog from "@ui5/webcomponents/dist/Dialog"
import Button from "@ui5/webcomponents/dist/Button"
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/features/InputSuggestions.js";
/** @ui5/webcomponents-fiori */
import "@ui5/webcomponents-fiori/dist/Bar.js"
/** @ui5/webcomponents-icons */
//import "@ui5/webcomponents-icons/dist/allIcons-static.js";
import "@ui5/webcomponents-icons/dist/dropdown.js"
import "@ui5/webcomponents-icons/dist/activate.js"
import "@ui5/webcomponents-icons/dist/comment.js"
import "@ui5/webcomponents-icons/dist/synchronize.js"
import "@ui5/webcomponents-icons/dist/add.js"
import "@ui5/webcomponents-icons/dist/delete.js"
import "@ui5/webcomponents-icons/dist/home.js"
import "@ui5/webcomponents-icons/dist/action-settings.js"
import "@ui5/webcomponents-icons/dist/sys-add.js"
import "@ui5/webcomponents-icons/dist/number-sign.js"
import "@ui5/webcomponents-icons/dist/process.js"
import "@ui5/webcomponents-icons/dist/workflow-tasks.js"
import "@ui5/webcomponents-icons/dist/discussion.js"

/**  */
import {ChatThreadView} from "./chat-thread-view";
import {ThreadsProfile} from "../viewModels/profiles.proxy";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {getInitials} from "../utils";
import {EditProfile} from "./edit-profile";
import {PeerList} from "./peer-list";
import {ActionHashB64, decodeHashFromBase64, DnaHashB64} from "@holochain/client";
import {CreatePpInput, ThreadsEntryType} from "../bindings/threads.types";
import {DnaThreadsTree} from "./dna-threads-tree";


import {
  Hrl,
  WeServices,
} from "@lightningrodlabs/we-applet";
import {consume, ContextConsumer, createContext} from "@lit-labs/context";
import {ProfilesDvm} from "../viewModels/profiles.dvm";
import {ProfilesPerspective, ProfilesZvm} from "../viewModels/profiles.zvm";
import {globalProfilesContext} from "../viewModels/happDef";


/** */
export interface CommentRequest {
  maybeCommentThread: ActionHashB64 | null,
  subjectHash: AnyLinkableHashB64,
  subjectType: string,
}


/**
 * @element
 */
@customElement("semantic-threads-page")
export class SemanticThreadsPage extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }


  /** -- Fields -- */
  @state() private _initialized = false;
  @state() private _selectedThreadHash: AnyLinkableHashB64 = '';
  @state() private _selectedCommentThreadHash: AnyLinkableHashB64 = '';
  @state() private _createTopicHash: AnyLinkableHashB64 = '';

  @state() private _canShowComments = false;
  @state() private _showDna: DnaHashB64 | null = null;


  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  @consume({ context: globalProfilesContext, subscribe: true })
  _profilesZvm!: ProfilesZvm;


  private _myProfile: ThreadsProfile = {nickname: "unknown", fields: {}}

  /** -- Getters -- */

  get createTopicDialogElem(): Dialog {
    return this.shadowRoot.getElementById("create-topic-dialog") as Dialog;
  }

  get createThreadDialogElem(): Dialog {
    return this.shadowRoot.getElementById("create-thread-dialog") as Dialog;
  }


  get profileDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("profile-dialog") as Dialog;
  }

  // get myNickName(): string {
  //   return this._myProfile!.nickname;
  // }
  // get myAvatar(): string {
  //   return this._myProfile!.fields.avatar;
  // }
  // get myColor(): string {
  //   return this._myProfile!.fields.color;
  // }


  /** -- Update -- */

  /** */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<semantic-threads-page>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    newDvm.probeAll();
    this._selectedThreadHash = '';
    this._initialized = true;
  }

  //
  // protected firstUpdated() {
  //   console.log("<semantic-threads-page>.firstUpdated()", this._initialized, this._selectedThreadHash);
  // }


  // /** */
  // shouldUpdate(changedProperties: PropertyValues<this>): boolean {
  //   //if (!this._initialized) return false;
  //   const res = super.shouldUpdate(changedProperties);
  //   if (!this._profilesDvm) {
  //     this.requestProfilesDvm();
  //   }
  //   return res;
  // }


  // /** -- Grab Profiles DVM from a different cell -- */
  //
  // /** */
  // protected requestProfilesDvm() {
  //   const contextType = createContext('dvm/profiles');
  //   console.log(`\t\t Requesting context "${contextType}"`)
  //   /*const consumer =*/ new ContextConsumer(
  //     this,
  //     contextType,
  //     async (value: ProfilesDvm, dispose?: () => void): Promise<void> => {
  //       console.log(`\t\t Received value for context "${contextType}"`)
  //       if (this._profilesDvm) {
  //         this._profilesDvm.profilesZvm.unsubscribe(this);
  //       }
  //       this._profilesDvm = value;
  //       this._profilesDvm.profilesZvm.subscribe(this, 'profilesPerspective');
  //     },
  //     false, // true will call twice at init
  //   );
  //   //console.log({consumer})
  // }
  //
  // private _profilesDvm?: ProfilesDvm;
  //
  // @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  // profilesPerspective!: ProfilesPerspective;


  /** -- Update -- */

  /** */
  async onCreateTopic(e) {
    const input = this.shadowRoot!.getElementById("topicTitleInput") as HTMLInputElement;
    await this._dvm.publishSemanticTopic(input.value);
    //console.log("onCreateList() res:", res)
    input.value = "";
    this.createTopicDialogElem.close();
  }


  /** */
  async onCreateThread(e) {
    const input = this.shadowRoot!.getElementById("threadPurposeInput") as HTMLInputElement;
    let ah = await this._dvm.publishThreadFromSemanticTopic(this._createTopicHash, input.value);
    //console.log("onCreateList() res:", res)
    input.value = "";
    this._selectedThreadHash = ah;
    this.createThreadDialogElem.close(false)
  }


  /** */
  async onCreateTextMessage(e) {
    const input = this.shadowRoot!.getElementById("textMessageInput") as HTMLInputElement;
    if (!input.value || input.value.length == 0) {
      return;
    }
    let path_str = await this._dvm.publishTextMessage(input.value, this._selectedThreadHash);
    console.log("onCreateTextMessage() res:", path_str);
    input.value = "";

    //await this.probeLatestMessages();
    //const msgList = this.shadowRoot!.getElementById("textMessageList") as TextMessageList;
    //msgList.requestUpdate();
  }


  /** */
  async onCreateComment(e) {
    const input = this.shadowRoot!.getElementById("commentInput") as HTMLInputElement;
    if (!input.value || input.value.length == 0) {
      return;
    }
    const thread = this._dvm.threadsZvm.getThread(this._selectedCommentThreadHash);
    if (!thread) {
      console.error("Missing Comment thread");
      return;
    }
    const path_str = await this._dvm.publishTextMessage(input.value, this._selectedCommentThreadHash);
    console.log("onCreateComment() res:", path_str);
    input.value = "";
  }


  /** */
  async onCreateSemanticTopic(topic: string) {
    await this._dvm.publishSemanticTopic(topic);
  }


  /** After first render only */
  async firstUpdated() {
    // this._initialized = true;
    console.log("<semantic-threads-page> firstUpdated():", "createMyProfile");

    // FIXME Fix source-chain head changed error by implementing blocking calls in zits
    //await this._dvm.profilesZvm.createMyProfile({nickname: "Bobby", fields: {}});
    //this._myNick = this._dvm.profilesZvm.getMyProfile().nickname;

    /** Generate test data */
    //await this._dvm.threadsZvm.generateTestData();
    const leftSide = this.shadowRoot.getElementById("leftSide");
    leftSide.style.background = "#aab799";

    this.pingAllOthers();
  }


  /** */
  protected async updated(_changedProperties: PropertyValues) {
    try {

      const chatView = this.shadowRoot.getElementById("chat-view") as ChatThreadView;
      const view = await chatView.updateComplete;
      //console.log("ChatView.parent.updated() ", view, chatView.scrollTop, chatView.scrollHeight, chatView.clientHeight)
      if (!view) {
        /** Request a new update for scrolling to work */
        chatView.requestUpdate();
      }
    } catch(e) {
      /** i.e. element not present */
    }
  }


  /** */
  async handleColorChange(e: any) {
    console.log("handleColorChange: " + e.target.lastValueEmitted)
    const color = e.target.lastValueEmitted;
    const profile = this._myProfile!;
    await this.setMyProfile(profile.nickname, profile.fields['avatar'], color)
  }




  /** */
  async setMyProfile(nickname: string, avatar: string, color: string) {
    console.log("updateProfile() called:", nickname)
    const fields: Dictionary<string> = {};
    fields['color'] = color;
    fields['avatar'] = avatar;
    try {
      if (this._profilesZvm.getProfile(this._dvm.cell.agentPubKey)) {
        await this._profilesZvm.updateMyProfile({nickname, fields});
      } else {
        await this._profilesZvm.createMyProfile({nickname, fields});
      }
    } catch (e) {
      console.log("createMyProfile() failed");
      console.log(e);
    }
  }


  /** */
  private async onProfileEdited(profile: ThreadsProfile) {
    console.log("onProfileEdited()", this._myProfile)
    try {
      await this._profilesZvm.updateMyProfile(profile);
    } catch(e) {
      await this._profilesZvm.createMyProfile(profile);
      this._myProfile = profile;
    }
    this.profileDialogElem.close(false);
    /** Make sure a redraw is triggered */
    this._myProfile.fields.avatar = profile.fields.avatar;
    this._myProfile.fields.color = profile.fields.color;
    this.requestUpdate();
  }


  /** */
  async pingActiveOthers() {
    //if (this._currentSpaceEh) {
    console.log("Pinging All Active");
    const currentPeers = this._dvm.allCurrentOthers(this._profilesZvm.getAgents());
    await this._dvm.pingPeers(undefined, currentPeers);
    //}
  }


  /** */
  async pingAllOthers() {
    if (!this._profilesZvm) {
      return;
    }
    //if (this._currentSpaceEh) {
    const agents = this._profilesZvm.getAgents().filter((agentKey) => agentKey != this.cell.agentPubKey);
    console.log("Pinging All Others", agents);
    await this._dvm.pingPeers(undefined, agents);
    //}
  }


  /** */
  async onCommentingClicked(e: CustomEvent<CommentRequest>) {
    console.log("onCommentingClicked()", e);
    const request = e.detail;
    let maybeCommentThread: ActionHashB64 | null = request.maybeCommentThread;

    /** Create Comment thread for this TextMessage */
    if (!maybeCommentThread) {
      const ppInput: CreatePpInput = {
        purpose: "comment",
        rules: "N/A",
        dnaHash: decodeHashFromBase64(this.cell.dnaHash),
        subjectHash: decodeHashFromBase64(request.subjectHash),
        subjectType: request.subjectType,
      };
      const [ppAh, _ppMat] = await this._dvm.threadsZvm.publishParticipationProtocol(ppInput);
      maybeCommentThread = ppAh;
      // /** Grab chat-message-item to request an update */
      // const chatView = this.shadowRoot.getElementById("chat-view") as ChatThreadView;
      // const item = chatView.shadowRoot.getElementById("chat-item__" + beadAh) as any;
      // console.log("onCommentingClicked() item", item);
      // if (item) item.requestUpdate();
    }

    this._canShowComments = true;
    this._selectedCommentThreadHash = maybeCommentThread;
  }


  /** */
  onDnaSelected(e) {
    console.log("onDnaSelected()", e);
    const selectedOption = e.detail.selectedOption;
    console.log("onDnaSelected() selectedOption", e.detail.selectedOption);
    if (selectedOption.id == "topics-option") {
      this._showDna = null;
    } else {
      this._showDna = selectedOption.id;
    }
  }


  /** */
  onDnaThreadSelected(e) {
    console.log("onDnaThreadSelected()", e);
    if (e.detail.type == ThreadsEntryType.ParticipationProtocol) {
        this._selectedThreadHash = e.detail.target;
    }
  }


  /** */
  render() {
    console.log("<semantic-threads-page>.render()", this._initialized, this._selectedThreadHash, this._profilesZvm);

    if (!this._profilesZvm) {
      console.error("this._profilesZvm not found");
    } else {
      this._myProfile = this._profilesZvm.getMyProfile();
    }

    let centerSide = html`<h1 style="margin:auto;">No thread selected</h1>`
    if (this._selectedThreadHash) {
      const thread = this.threadsPerspective.threads[this._selectedThreadHash];
      const topic = this.threadsPerspective.allSemanticTopics[thread.pp.subjectHash];

      centerSide = html`
          <ui5-bar design="Header" style="background: #f1efef; border: 1px solid dimgray;">
              <ui5-button slot="startContent" icon="number-sign" tooltip=${this._selectedThreadHash}
                          design="Transparent"></ui5-button>
              <span id="threadTitle" slot="startContent">${topic}: ${thread.pp.purpose}</span>
              <ui5-button slot="endContent" icon="comment" tooltip="Toggle Comments" @click=${() => {this._dvm.dumpLogs(); this._canShowComments = !this._canShowComments;}}></ui5-button>
          </ui5-bar>
          <chat-thread-view id="chat-view" .threadHash=${this._selectedThreadHash} style=""></chat-thread-view>
          <ui5-bar design="FloatingFooter" style="margin:10px;width: auto;">
              <ui5-button slot="startContent" design="Positive" icon="add"></ui5-button>
              <ui5-input slot="startContent" id="textMessageInput" type="Text" placeholder="Message #${topic}"
                         show-clear-icon
                         style="min-width: 400px;"
                         @change=${this.onCreateTextMessage}></ui5-input>
              <!-- <ui5-button design="Transparent" slot="endContent" icon="delete"></ui5-button> -->
          </ui5-bar>
      `;
    }

    /** This agent's profile info */
    let agent = {nickname: "unknown", fields: {}} as ThreadsProfile;
    let maybeAgent = undefined;
    if (this._profilesZvm) {
      maybeAgent = this._profilesZvm.perspective.profiles[this._dvm.cell.agentPubKey];
      if (maybeAgent) {
        agent = maybeAgent;
      } else {
        //console.log("Profile not found for", texto.author, this._dvm.profilesZvm.perspective.profiles)
        this._profilesZvm.probeProfile(this._dvm.cell.agentPubKey)
        //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
      }
    }
    const initials = getInitials(agent.nickname);
    const avatarUrl = agent.fields['avatar'];


    /** Render all */
    return html`
        <div id="mainDiv" @commenting-clicked=${this.onCommentingClicked}>
            <div id="leftSide">
                <ui5-select id="dna-select" class="select" style="background: rgb(170, 183, 153);"
                @change=${this.onDnaSelected}>
                    <ui5-option id=${this.cell.dnaHash}>Threads</ui5-option>
                    <ui5-option id="topics-option" icon="number-sign" selected>Topics</ui5-option>
                </ui5-select>
                ${this._showDna? html`
                    <dna-threads-tree .dnaHash=${this.cell.dnaHash}
                                      @selected="${this.onDnaThreadSelected}"></dna-threads-tree>
                ` : html`
                <semantic-topics-view
                        @createThreadClicked=${(e) => {
                            this._createTopicHash = e.detail;
                            this.createThreadDialogElem.show()
                        }}
                        @selected=${(e) => {
                            this.onThreadSelected(e.detail)
                        }}
                ></semantic-topics-view>
                <div style="display: flex; flex-direction: row; height: 36px; border: 1px solid #267906;background:#d6f2ac;cursor:pointer;align-items:center;padding-left:40px;"
                     @click=${() => {this.createTopicDialogElem.show()}}>
                    Add New Topic +
                </div>
                `}
                <div style="display:flex; flex-direction:row; height:44px; border:1px solid #fad0f1;background:#f1b0b0">
                    <ui5-button design="Transparent" icon="action-settings" tooltip="Go to settings"
                                @click=${async () => {
                                    await this.updateComplete;
                                    this.dispatchEvent(new CustomEvent('debug', {detail: true, bubbles: true, composed: true}));
                                }}
                    ></ui5-button>
                    <ui5-button icon="synchronize" tooltip="Refresh" design="Transparent"
                                @click=${this.refresh}></ui5-button>
                    <ui5-button icon="activate" tooltip="Commit logs" design="Transparent"
                                @click=${this.onCommitBtn}></ui5-button>
                </div>
                <div id="profile-div" style="display: flex; flex-direction: row">
                    ${avatarUrl ? html`
                        <ui5-avatar class="chatAvatar" style="box-shadow: 1px 1px 1px 1px rgba(130, 122, 122, 0.88)">
                            <img src=${avatarUrl}>
                        </ui5-avatar>
                    ` : html`
                        <ui5-avatar class="chatAvatar" shape="Circle" initials=${initials}
                                    color-scheme="Accent2"></ui5-avatar>
                    `}
                    <div style="display: flex; flex-direction: column; align-items: stretch;padding-top:18px;margin-left:5px;">
                        <div>${agent.nickname}</div>
                            <!-- <div style="font-size: small">${this.cell.agentPubKey}</div> -->
                    </div>
                    <ui5-button style="margin-top:10px;"
                                design="Transparent" icon="action-settings" tooltip="Go to settings"
                                @click=${() => this.profileDialogElem.show()}
                    ></ui5-button>
                </div>
            </div>
            <div id="centerSide">
                ${centerSide}
            </div>
            <div id="commentSide" style="display:${this._canShowComments ? 'flex' : 'none'}; flex-direction: column;">
                <comment-thread-view .threadHash=${this._selectedCommentThreadHash}></comment-thread-view>
                <ui5-bar design="FloatingFooter" style="margin:10px;width: auto;">
                    <ui5-input slot="startContent" id="commentInput" type="Text" placeholder="Comment..."
                               show-clear-icon
                               style="min-width: 400px;"
                               @change=${this.onCreateComment}></ui5-input>
                </ui5-bar>
            </div>
            <div id="rightSide">
                <peer-list></peer-list>
            </div>
        </div>
        <!-- DIALOGS -->
        <!-- ProfileDialog -->
        <ui5-dialog id="profile-dialog" header-text="Edit Profile">
            <edit-profile
                    allowCancel
                    .profile="${this._myProfile}"
                    .saveProfileLabel= ${'Edit Profile'}
                    @cancel-edit-profile=${() => this.profileDialogElem.close(false)}
                    @save-profile=${(e: CustomEvent) => this.onProfileEdited(e.detail.profile)}
            ></edit-profile>
        </ui5-dialog>
        <!-- CreateTopicDialog -->
        <ui5-dialog id="create-topic-dialog" header-text="Create Topic">
            <section>
                <div>
                    <ui5-label for="topicTitleInput" required>Title:</ui5-label>
                    <ui5-input id="topicTitleInput"></ui5-input>
                </div>
            </section>
            <div slot="footer">
                <div style="flex: 1;"></div>
                <ui5-button id="createTopicDialogButton" design="Emphasized" @click=${this.onCreateTopic}>Create
                </ui5-button>
                <ui5-button @click=${() => this.createTopicDialogElem.close(false)}>Cancel</ui5-button>
            </div>
        </ui5-dialog>
        <!-- CreateThreadDialog -->
        <ui5-dialog id="create-thread-dialog" header-text="Create Thread">
            <section>
                <div>
                    <ui5-label for="threadPurposeInput" required>Purpose:</ui5-label>
                    <ui5-input id="threadPurposeInput"></ui5-input>
                </div>
            </section>
            <div slot="footer">
                <div style="flex: 1;"></div>
                <ui5-button id="createThreadDialogButton" design="Emphasized" @click=${this.onCreateThread}>Create
                </ui5-button>
                <ui5-button @click=${(e) => this.createThreadDialogElem.close(false)}>Cancel</ui5-button>
            </div>
        </ui5-dialog>
    `;
  }



  /** */
  async onThreadSelected(threadHash: AnyLinkableHashB64) {
    console.log("onThreadSelected()", threadHash)
    //this._dvm.threadsZvm.probeLatestBeads(threadHash)
    // const beadLinks = await this._dvm.threadsZvm.probeLatestBeads({ppAh: decodeHashFromBase64(threadHash), targetCount: 20})
    // console.log("onThreadSelected() beads found: ", beadLinks.length);
    this._selectedThreadHash = threadHash;
  }


  /** */
  async refresh(_e?: any) {
    await this._dvm.probeAll();
    await this.pingAllOthers();
    await this._dvm.threadsZvm.probeSubjectTypes(this.cell.dnaHash);

    /** DEBUGGING */
    //await this._dvm.generateTestSignals();
    let latestLogDate = new Date(this.threadsPerspective.globalSearchLog.time / 1000);
    console.debug("refresh()", latestLogDate)
    await this._dvm.threadsZvm.probeAllLatest();
  }


  /** */
  async onCommitBtn(_e?: any) {
    /** DEBUGGING */
    await this._dvm.threadsZvm.commitSearchLogs();
  }


  // /** */
  // static get scopedElements() {
  //   return {
  //     "semantic-topics-view": SemanticTopicsView,
  //     "comment-thread-view": CommentThreadView,
  //     "chat-view": ChatThreadView,
  //     "edit-profile": EditProfile,
  //     "peer-list": PeerList,
  //     "dna-threads-view": DnaThreadsTree,
  //   }
  // }

  /** */
  static get styles() {
    return [
      css`
        :host {
          background: #f7f6f8;
          display: block;
          height: 100vh;
        }

        .ui5-select-label-root {
          font-size: larger;
          font-weight: bold;
        }
        
        #mainDiv {
          display: flex;
          flex-direction: row;
          height: 100vh;
          overflow: clip;
        }

        #leftSide {
          background: #e889c0;
          height: 100vh;
          width: 340px;
          display: flex;
          flex-direction: column;
        }

        #centerSide {
          width: 100%;
          height: 100vh;
          background: #eaeaea;
          display: flex;
          flex-direction: column;
        }

        #rightSide {
          width: 300px;
          height: 100vh;
          background: #eaeaea;
          display: flex;
          flex-direction: column;
          background: #979f97;
        }

        .chatAvatar {
          margin-top: 5px;
          margin-left: 5px;
          margin-bottom: 5px;
          margin-right: 5px;
          min-width: 48px;
        }

        #threadTitle {
          font-size: 18px;
          font-weight: bold;
        }


      `,

    ];
  }
}
