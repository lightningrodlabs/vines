import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {CommentThreadView} from "./comment-thread-view";
import {SemanticTopicsView} from "./semantic-topics-view";
import {AnyLinkableHashB64, ThreadsPerspective} from "../viewModels/threads.perspective";
import {CommentRequest} from "../utils";

/** @ui5/webcomponents-fiori */
import "@ui5/webcomponents-fiori/dist/Bar.js"
/** @ui5/webcomponents */
import "@ui5/webcomponents/dist/Badge.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/Menu.js";
import Dialog from "@ui5/webcomponents/dist/Dialog";
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/features/InputSuggestions.js";
import "@ui5/webcomponents/dist/Select.js";

/** @ui5/webcomponents-icons */
//import "@ui5/webcomponents-icons/dist/allIcons-static.js";
import "@ui5/webcomponents-icons/dist/action-settings.js"
import "@ui5/webcomponents-icons/dist/activate.js"
import "@ui5/webcomponents-icons/dist/add.js"
import "@ui5/webcomponents-icons/dist/comment.js"
import "@ui5/webcomponents-icons/dist/delete.js"
import "@ui5/webcomponents-icons/dist/discussion.js"
import "@ui5/webcomponents-icons/dist/dropdown.js"
import "@ui5/webcomponents-icons/dist/email.js"
import "@ui5/webcomponents-icons/dist/home.js"
import "@ui5/webcomponents-icons/dist/number-sign.js"
import "@ui5/webcomponents-icons/dist/process.js"
import "@ui5/webcomponents-icons/dist/save.js"
import "@ui5/webcomponents-icons/dist/sys-add.js"
import "@ui5/webcomponents-icons/dist/synchronize.js"
import "@ui5/webcomponents-icons/dist/workflow-tasks.js"

/**  */
import {ChatThreadView} from "./chat-thread-view";
import {ThreadsProfile} from "../viewModels/profiles.proxy";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {emptyAppletId, getInitials} from "../utils";

import {EditProfile} from "./edit-profile";
//import {PeerList} from "./peer-list";

import {
  ActionHashB64,
  decodeHashFromBase64,
  DnaHashB64,
  encodeHashToBase64,
  EntryHashB64,
  fakeEntryHash
} from "@holochain/client";
import {CreatePpInput, ThreadsEntryType} from "../bindings/threads.types";
import {AppletThreadsTree} from "./applet-threads-tree";

import {
  AppletInfo,
  Hrl,
  WeServices, weServicesContext,
} from "@lightningrodlabs/we-applet";
import {consume, ContextConsumer, createContext} from "@lit-labs/context";
import {ProfilesZvm} from "../viewModels/profiles.zvm";
import {globalProfilesContext} from "../viewModels/happDef";
import {inputBarStyleTemplate} from "../styles";


/**
 * @element
 */
@customElement("semantic-threads-page")
export class SemanticThreadsPage extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    /** Create a fake appletId for testing without We */
    //fakeEntryHash().then((eh) => this.appletId = encodeHashToBase64(eh));

    this.addEventListener('beforeunload', (e) => {
      console.log("<semantic-threads-page> beforeunload", e);
      // await this._dvm.threadsZvm.commitSearchLogs();
    });

  }


  /** -- Fields -- */
  @state() private _initialized = false;
  @state() private _selectedThreadHash: AnyLinkableHashB64 = '';
  @state() private _selectedCommentThreadHash: AnyLinkableHashB64 = '';
  private _selectedThreadSubjectName: string = '';
  @state() private _createTopicHash: AnyLinkableHashB64 = '';

  @state() private _canShowComments = false;
  @state() private _appletToShow: DnaHashB64 | null = null;


  @property() appletId: EntryHashB64;


  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  @consume({ context: globalProfilesContext, subscribe: true })
  _profilesZvm!: ProfilesZvm;

  @consume({ context: weServicesContext, subscribe: true })
  weServices!: WeServices;

  private _myProfile: ThreadsProfile = {nickname: "unknown", fields: {}}


  /** AppletId -> AppletInfo */
  @state() private _appletInfos: Dictionary<AppletInfo> = {}


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
    let ah = await this._dvm.publishThreadFromSemanticTopic(this.appletId, this._createTopicHash, input.value);
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
    let ah = await this._dvm.publishTextMessage(input.value, this._selectedThreadHash);
    console.log("onCreateTextMessage() res:", ah);
    input.value = "";

    /** DEBUG */
    if (this.weServices) {
      const entryInfo = await this.weServices.entryInfo([decodeHashFromBase64(this.cell.dnaHash), decodeHashFromBase64(ah)]);
      console.log("entryInfo2", this.cell.dnaHash, entryInfo);
    }



    //await this.probeLatestMessages();
    //const msgList = this.shadowRoot!.getElementById("textMessageList") as TextMessageList;
    //msgList.requestUpdate();
  }


  /** */
  async onCreateSemanticTopic(topic: string) {
    await this._dvm.publishSemanticTopic(topic);
  }



  /** After first render only */
  async firstUpdated() {
    // this._initialized = true;
    console.log("<semantic-threads-page> firstUpdated() _appletInfos", this.appletId);

    /** Generate test data */
    if (!this.appletId) {
      this.appletId = encodeHashToBase64(await emptyAppletId());
      console.warn("no appletId provided. A fake one has been generated", this.appletId);
    }
    await this._dvm.threadsZvm.generateTestData(this.appletId);

    /** */
    const leftSide = this.shadowRoot.getElementById("leftSide");
    leftSide.style.background = "#B9CCE7";


    /** Grab all AppletIds */
    if (this.weServices) {
      const appletIds = await this._dvm.threadsZvm.probeAllAppletIds();
      for (const appletId of appletIds) {
        const appletInfo = await this.weServices.appletInfo(decodeHashFromBase64(appletId));
        //console.log("_appletInfos", appletId, appletInfo);
        this._appletInfos[appletId] = appletInfo;
      }
    }
    this.requestUpdate();
    /** */
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

    /** Fiddle with shadow parts CSS */
    /** -- Loading Done -- */
    const inputBar = this.shadowRoot.getElementById('inputBar') as HTMLElement;
    if (inputBar) {
      inputBar.shadowRoot.appendChild(inputBarStyleTemplate.content.cloneNode(true));
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
        pp: {
          purpose: "comment",
          rules: "N/A",
          subjectHash: decodeHashFromBase64(request.subjectHash),
          subjectType: request.subjectType,
        },
        appletId: decodeHashFromBase64(this.appletId),
        dnaHash: decodeHashFromBase64(this.cell.dnaHash),
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
    this._selectedThreadSubjectName = e.detail.subjectName;
  }


  /** */
  onAppletSelected(e) {
    console.log("onAppletSelected()", e);
    const selectedOption = e.detail.selectedOption;
    console.log("onAppletSelected() selectedOption", e.detail.selectedOption);
    if (selectedOption.id == "topics-option") {
      this._appletToShow = null;
    } else {
      this._appletToShow = selectedOption.id;
    }
    this.requestUpdate();
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
          <ui5-bar id="topicBar" design="Header">
              <ui5-button slot="startContent" icon="number-sign" tooltip=${this._selectedThreadHash}
                          design="Transparent"></ui5-button>
              <span id="threadTitle" slot="startContent">${topic}: ${thread.pp.purpose}</span>
              <ui5-button slot="endContent" icon="comment" tooltip="Toggle Comments" @click=${() => {this._dvm.dumpLogs(); this._canShowComments = !this._canShowComments;}}></ui5-button>
          </ui5-bar>
          <chat-thread-view id="chat-view" .threadHash=${this._selectedThreadHash}></chat-thread-view>
          <ui5-bar id="inputBar" design="FloatingFooter">
              <!-- <ui5-button slot="startContent" design="Positive" icon="add"></ui5-button> -->
              <ui5-input id="textMessageInput" type="Text" placeholder="Message #${topic}"
                         show-clear-icon
                         @change=${this.onCreateTextMessage}></ui5-input>
              <!-- <ui5-button design="Transparent" slot="endContent" icon="delete"></ui5-button> -->
          </ui5-bar>
      `;
    }

    /** This agent's profile info */
    let agent = {nickname: "unknown", fields: {}} as ThreadsProfile;
    let maybeAgent = undefined;
    if (this._profilesZvm) {
      maybeAgent = this._myProfile;
      if (maybeAgent) {
        agent = maybeAgent;
      } else {
        //console.log("Profile not found for", texto.author, this._dvm.profilesZvm.perspective.profiles)
        this._profilesZvm.probeProfile(this._dvm.cell.agentPubKey);
        //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
      }
    }
    const initials = getInitials(agent.nickname);
    const avatarUrl = agent.fields['avatar'];

    console.log("this._appletInfos", JSON.parse(JSON.stringify(this._appletInfos)));

    console.log("this._appletInfos", this._appletInfos);
    let appletOptions = Object.entries(this._appletInfos).map(([appletId, appletInfo]) => {
      console.log("appletInfo", appletInfo);
      if (!appletInfo) {
        return html``;
      }
      return html`<ui5-option id=${appletId} icon="discussion">${appletInfo.appletName}</ui5-option>`;
    }
    );
    console.log("appletOptions", appletOptions);

    /** Render all */
    return html`
        <div id="mainDiv" @commenting-clicked=${this.onCommentingClicked}>
            <div id="leftSide">
                <ui5-select id="dna-select" class="select" style="background: #B9CCE7"
                @change=${this.onAppletSelected}>
                    ${appletOptions}
                    <!--<ui5-option id=${this.appletId}>Threads</ui5-option>-->
                    <ui5-option id="topics-option" icon="number-sign" selected>Topics</ui5-option>
                </ui5-select>
                ${this._appletToShow? html`
                    <applet-threads-tree .appletId=${this._appletToShow? this._appletToShow : this.appletId}
                                      @selected="${this.onDnaThreadSelected}"></applet-threads-tree>
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
                
                <ui5-button icon="add" style="margin:10px 30px 0px 30px;"
                     @click=${() => {console.log("createTopicDialogElem", this.createTopicDialogElem); this.createTopicDialogElem.show()}}>
                    Add New Topic
                </ui5-button>
                <ui5-button icon="save" design="Positive"
                            style="margin:10px 30px 10px 30px;"
                            @click=${this.onCommitBtn}>
                    Mark all as read
                </ui5-button>                
                <hr style="width:100%;margin:0px;color:aliceblue;"/>
                `}
                
                <!--
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
                </div> -->
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
                <comment-thread-view .threadHash=${this._selectedCommentThreadHash} showInput="true" .subjectName="${this._selectedThreadSubjectName}"></comment-thread-view>
            </div>
            <!-- <div id="rightSide">
                <peer-list></peer-list>
            </div> -->
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
                <ui5-button id="createTopicDialogButton"
                            style="margin-top:5px" design="Emphasized" @click=${this.onCreateTopic}>Create
                </ui5-button>
                <ui5-button style="margin-top:5px" @click=${() => this.createTopicDialogElem.close(false)}>Cancel</ui5-button>
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
            <div slot="footer" style:"display:flex;">
                <ui5-button id="createThreadDialogButton" style="margin-top:5px" design="Emphasized" @click=${this.onCreateThread}>Create
                </ui5-button>
                <ui5-button style="margin-top:5px" @click=${(e) => this.createThreadDialogElem.close(false)}>Cancel</ui5-button>
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
    let latestLogDate = new Date(this.threadsPerspective.globalProbeLog.time / 1000);
    console.debug("refresh()", latestLogDate)
    await this._dvm.threadsZvm.probeAllLatest();
  }


  /** */
  async onCommitBtn(_e?: any) {
    await this._dvm.threadsZvm.commitSearchLogs();
  }


  /** */
  static get styles() {
    return [
      css`
        :host {
          background: #FBFCFD;
          display: block;
          height: inherit;
        }

        .ui5-select-label-root {
          font-size: larger;
          font-weight: bold;
        }
        
        #mainDiv {
          display: flex;
          flex-direction: row;
          height: inherit;
        }

        #leftSide {
          background: #B9CCE7;
          max-height: 100vh;
          width: 250px;
          min-width: 250px;
          display: flex;
          flex-direction: column;
          border: 0.01em solid #A3ACB9;
        }

        #centerSide {
          width: 100%;
          min-height: 100vh;
          height: 100vh;
          max-height: 100vh;
          background: #FBFCFD;
          display: flex;
          flex-direction: column;
        }

        #topicBar {
          background: #DBE3EF;
          /*border: 1px solid dimgray;*/
        }

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
        
        #rightSide {
          width: 300px;
          /*height: 100vh;*/
          background: #eaeaea;
          display: flex;
          flex-direction: column;
          background: #B9CCE7;
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
