import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {AnyLinkableHashB64, ThreadsPerspective} from "../viewModels/threads.perspective";
import {CommentRequest, parseMentions} from "../utils";
import "@ddd-qc/path-explorer";

/** @ui5/webcomponents-fiori */
import "@ui5/webcomponents-fiori/dist/Bar.js";
import "@ui5/webcomponents-fiori/dist/NotificationListItem.js";
import "@ui5/webcomponents-fiori/dist/NotificationAction.js";
import "@ui5/webcomponents-fiori/dist/ShellBar.js";
import "@ui5/webcomponents-fiori/dist/ShellBarItem.js";
/** @ui5/webcomponents */
import "@ui5/webcomponents/dist/Badge.js";
import "@ui5/webcomponents/dist/BusyIndicator.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/CustomListItem.js";
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/Menu.js";
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Popover.js";
import "@ui5/webcomponents/dist/features/InputSuggestions.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/StandardListItem.js";
import "@ui5/webcomponents/dist/SuggestionItem.js";
import "@ui5/webcomponents/dist/Tree.js"
import "@ui5/webcomponents/dist/TreeItem.js";
import "@ui5/webcomponents/dist/TreeItemCustom.js";

import Dialog from "@ui5/webcomponents/dist/Dialog";
import Popover from "@ui5/webcomponents/dist/Popover";

/** @ui5/webcomponents-icons */
//import "@ui5/webcomponents-icons/dist/allIcons-static.js";
import "@ui5/webcomponents-icons/dist/action-settings.js"
import "@ui5/webcomponents-icons/dist/activate.js"
import "@ui5/webcomponents-icons/dist/add.js"
import "@ui5/webcomponents-icons/dist/chain-link.js"
import "@ui5/webcomponents-icons/dist/comment.js"
import "@ui5/webcomponents-icons/dist/delete.js"
import "@ui5/webcomponents-icons/dist/discussion.js"
import "@ui5/webcomponents-icons/dist/dropdown.js"
import "@ui5/webcomponents-icons/dist/email.js"
import "@ui5/webcomponents-icons/dist/home.js"
import "@ui5/webcomponents-icons/dist/inbox.js"
import "@ui5/webcomponents-icons/dist/number-sign.js"
import "@ui5/webcomponents-icons/dist/process.js"
import "@ui5/webcomponents-icons/dist/save.js"
import "@ui5/webcomponents-icons/dist/sys-add.js"
import "@ui5/webcomponents-icons/dist/synchronize.js"
import "@ui5/webcomponents-icons/dist/workflow-tasks.js"

/**  */
import {ChatThreadView} from "./chat-thread-view";
import {Dictionary} from "@ddd-qc/cell-proxy";


import {
  ActionHashB64,
  decodeHashFromBase64,
  DnaHashB64,
  encodeHashToBase64,
  EntryHashB64,
} from "@holochain/client";
import {CreatePpInput, ThreadsEntryType} from "../bindings/threads.types";

import {
  AppletId,
  AppletInfo,
  Hrl, weClientContext,
  WeServices,
} from "@lightningrodlabs/we-applet";
import {consume} from "@lit-labs/context";
import {globalProfilesContext} from "../viewModels/happDef";
import {shellBarStyleTemplate} from "../styles";

import {AppletThreadsTree} from "./applet-threads-tree";
import {CommentThreadView} from "./comment-thread-view";
import {SemanticTopicsView} from "./semantic-topics-view";
import  "./mentions-notification-list";
import "./input-bar";
import {getInitials, ProfileMat, ProfilesZvm} from "@ddd-qc/profiles-dvm";


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
  @state() private _canShowMentions = false;
  @state() private _canShowDebug = false;
  @state() private _appletToShow: DnaHashB64 | null = null;


  @property() appletId: AppletId;


  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  @consume({ context: globalProfilesContext, subscribe: true })
  _profilesZvm!: ProfilesZvm;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServices;

  private _myProfile: ProfileMat = {nickname: "guest_" + Math.floor(Math.random() * 100), fields: {}}

  /** AppletHash -> AppletInfo */
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
  async onCreateTextMessage(inputText: string) {
    console.log("onCreateTextMessage", inputText)

    let mentionedAgents = undefined;
    if (this._profilesZvm) {
       const mentions = parseMentions(inputText);
       console.log("parseMentions", mentions);
       console.log("parseMentions reversed", this._profilesZvm.perspective.reversed);
       mentionedAgents = this._profilesZvm.findProfiles(mentions);
      console.log("parseMentions mentionedAgents", mentionedAgents);
    }

    let ah = await this._dvm.publishTextMessage(inputText, this._selectedThreadHash, mentionedAgents);
    console.log("onCreateTextMessage() res:", ah);


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
      this.appletId = "FakeAppletId";
      //this.appletId = encodeHashToBase64(await emptyAppletId());
      console.warn("no appletId provided. A fake one has been generated", this.appletId);
    }
    //await this._dvm.threadsZvm.generateTestData(this.appletId);

    /** */
    const leftSide = this.shadowRoot.getElementById("leftSide");
    leftSide.style.background = "#B9CCE7";


    /** Grab all AppletIds */
    if (this.weServices) {
      const appletIds = await this._dvm.threadsZvm.probeAllAppletIds();
      for (const appletId of appletIds) {
        const appletInfo = await this.weServices.appletInfo(decodeHashFromBase64(appletId));
        console.log("_appletInfos", appletId, appletInfo);
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
    const shellBar = this.shadowRoot.getElementById('topicBar') as HTMLElement;
    if (shellBar) {
      shellBar.shadowRoot.appendChild(shellBarStyleTemplate.content.cloneNode(true));
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
  private async onProfileEdited(profile: ProfileMat) {
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
        //appletHash: decodeHashFromBase64(this.appletId),
        appletId: this.appletId,
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
    let threadTitle = "Threads";
    if (this._selectedThreadHash) {
      const thread = this.threadsPerspective.threads[this._selectedThreadHash];
      const topic = this.threadsPerspective.allSemanticTopics[thread.pp.subjectHash];
      threadTitle = `# ${topic}: ${thread.pp.purpose}`;

      centerSide = html`
          <chat-thread-view id="chat-view" .threadHash=${this._selectedThreadHash}></chat-thread-view>
          <threads-input-bar .profilesZvm=${this._profilesZvm} .topic=${topic}
                             @input=${(e) => {e.preventDefault(); this.onCreateTextMessage(e.detail)}}></threads-input-bar>
      `;
    }


    /** This agent's profile info */
    let agent = {nickname: "unknown", fields: {}} as ProfileMat;
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

    //console.log("this._appletInfos", JSON.parse(JSON.stringify(this._appletInfos)));
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
                <ui5-select id="dna-select" class="select" style="background:#B9CCE7; width:auto; margin:0px;"
                            @change=${this.onAppletSelected}>
                    ${appletOptions}
                        <!--<ui5-option id=${this.appletId}>Threads</ui5-option>-->
                    <ui5-option id="topics-option" icon="number-sign" selected>Topics</ui5-option>
                </ui5-select>
                ${this._appletToShow ? html`
                    <applet-threads-tree .appletId=${this._appletToShow ? this._appletToShow : this.appletId}
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
                                @click=${() => {
                                    console.log("createTopicDialogElem", this.createTopicDialogElem);
                                    this.createTopicDialogElem.show()
                                }}>
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
                        <div><abbr title=${this.cell.agentPubKey}>${agent.nickname}</abbr></div>
                            <!-- <div style="font-size: small">${this.cell.agentPubKey}</div> -->
                    </div>
                    <ui5-button style="margin-top:10px;"
                                design="Transparent" icon="action-settings" tooltip="Edit profile"
                                @click=${() => this.profileDialogElem.show()}
                    ></ui5-button>
                    <!-- <ui5-button style="margin-top:10px;"
                                design="Transparent" icon="synchronize" tooltip="Refresh"
                                @click=${this.refresh}></ui5-button>  -->                  
                </div>
            </div>
            <div id="mainSide">
              <ui5-shellbar id="topicBar" primary-title=${threadTitle} notifications-count="${this._dvm.threadsZvm.perspective.mentions.length? this._dvm.threadsZvm.perspective.mentions.length : ""}" show-notifications
                            @notifications-click=${() => {
                  const popover = this.shadowRoot.getElementById("notifPopover") as Popover;
                  if (popover.isOpen()) {
                    popover.close();
                    return;
                  }
                  const shellbar = this.shadowRoot.getElementById("topicBar");
                  popover.showAt(shellbar);
              }}>
                  <!-- <ui5-input slot="searchField" placeholder="Enter text..."></ui5-input> -->
                      <!--<ui5-shellbar-item icon="chain-link" tooltip="Toggle Debug" @click=${() => {this._dvm.dumpLogs(); this._canShowDebug = !this._canShowDebug;}}></ui5-shellbar-item> -->
                  <ui5-shellbar-item id="cmtButton" icon="comment" tooltip="Toggle Comments" @click=${() => {this._canShowComments = !this._canShowComments;}}></ui5-shellbar-item>
              </ui5-shellbar>

                <ui5-popover id="notifPopover" placement-type="Bottom" horizontal-align="Right" style="max-width: 500px">
                    <mentions-notification-list @jump=${ async (e) => {
                      console.log("requesting jump to bead", e.detail);
                      const tuple = await this._dvm.threadsZvm.zomeProxy.getTextMessage(decodeHashFromBase64(e.detail));
                      this._selectedThreadHash = encodeHashToBase64(tuple[2].bead.forProtocolAh);
                      const popover = this.shadowRoot.getElementById("notifPopover") as Popover;
                      if (popover.isOpen()) {
                          popover.close();
                      }
                    }}></mentions-notification-list>
                </ui5-popover>
                
              <div id="lowerSide">
                <div id="centerSide">
                    ${centerSide}
                </div>
                <div id="commentSide"
                     style="display:${this._canShowComments ? 'flex' : 'none'}; flex-direction:column; background:#d8e4f4;min-width: 350px;">
                    <comment-thread-view .threadHash=${this._selectedCommentThreadHash} showInput="true"
                                         .subjectName="${this._selectedThreadSubjectName}"></comment-thread-view>
                </div>
                <div id="rightSide" style="display: ${this._canShowMentions? "block" : "none"}">
                    <mentions-list id="mentionsList"></mentions-list>
                    <!-- <peer-list></peer-list> -->
                </div>
                  <anchor-tree id="debugSide"
                               style="display:${this._canShowDebug ? 'block' : 'none'};background:#f4d8db;"></anchor-tree>                  
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
                    <ui5-input id="topicTitleInput" @keydown=${(e) => {
                        if (e.keyCode === 13) {
                            e.preventDefault();
                            this.onCreateTopic(e);
                        }
                    }}></ui5-input>
                </div>
            </section>
            <div slot="footer">
                <ui5-button id="createTopicDialogButton"
                            style="margin-top:5px" design="Emphasized" @click=${this.onCreateTopic}>Create
                </ui5-button>
                <ui5-button style="margin-top:5px" @click=${() => this.createTopicDialogElem.close(false)}>Cancel
                </ui5-button>
            </div>
        </ui5-dialog>
        <!-- CreateThreadDialog -->
        <ui5-dialog id="create-thread-dialog" header-text="Create Thread">
            <section>
                <div>
                    <ui5-label for="threadPurposeInput" required>Purpose:</ui5-label>
                    <ui5-input id="threadPurposeInput" @keydown=${(e) => {
                        if (e.keyCode === 13) {
                            e.preventDefault();
                            this.onCreateThread(e);
                        }
                    }}></ui5-input>
                </div>
            </section>
            <div slot="footer" style:
            "display:flex;">
            <ui5-button id="createThreadDialogButton" style="margin-top:5px" design="Emphasized"
                        @click=${this.onCreateThread} >Create
            </ui5-button>
            <ui5-button style="margin-top:5px" @click=${(e) => this.createThreadDialogElem.close(false)}>Cancel
            </ui5-button>
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
    await this._dvm.threadsZvm.probeMentions();
    console.log("mentions:", this._dvm.threadsZvm.perspective.mentions.length);
    // const mentionsList = this.shadowRoot.getElementById("mentionsList") as MentionsList;
    // mentionsList.requestUpdate();
  }


  // /** */
  // async refresh(_e?: any) {
  //   await this._dvm.probeAll();
  //   await this.pingAllOthers();
  //   await this._dvm.threadsZvm.probeSubjectTypes(this.cell.dnaHash);
  //
  //   console.log("mentions:", this._dvm.threadsZvm.perspective.mentions.length);
  //
  //   /** DEBUGGING */
  //   //await this._dvm.generateTestSignals();
  //   let latestLogDate = new Date(this.threadsPerspective.globalProbeLog.time / 1000);
  //   console.debug("refresh()", latestLogDate)
  //   await this._dvm.threadsZvm.probeAllLatest();
  // }


  /** */
  async onCommitBtn(_e?: any) {
    await this._dvm.threadsZvm.commitProbeLogs();
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
          width: 275px;
          min-width: 275px;
          display: flex;
          flex-direction: column;
          border: 0.01em solid #A3ACB9;
        }

        #mainSide {
          width: 100%;
          display: flex;
          flex-direction: column;
        }
        
        #lowerSide {
          display: flex;
          flex-direction: row;
          flex: 1;
          overflow-y: auto;
        }
        
        #centerSide {
          width: 100%;
          background: #FBFCFD;
          display: flex;
          flex-direction: column;
        }

        #topicBar {
          background: #DBE3EF;
          /*border: 1px solid dimgray;*/
        }

        #topicBar::part(root) {
          /*background: #DBE3EF;*/
          /*border: 1px solid dimgray;*/
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
