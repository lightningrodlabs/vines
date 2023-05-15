import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {CommentThreadView} from "./comment-thread-view";
import {SemanticTopicsView} from "./semantic-topics-view";
import {AnyLinkableHashB64, ThreadsPerspective} from "../viewModels/threads.perspective";

/** @ui5/webcomponents */
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
import "@ui5/webcomponents-icons/dist/activate.js"
import "@ui5/webcomponents-icons/dist/synchronize.js"
import "@ui5/webcomponents-icons/dist/add.js"
import "@ui5/webcomponents-icons/dist/delete.js"
import "@ui5/webcomponents-icons/dist/home.js"
import "@ui5/webcomponents-icons/dist/action-settings.js"
import "@ui5/webcomponents-icons/dist/number-sign.js"
import "@ui5/webcomponents-icons/dist/process.js"
import "@ui5/webcomponents-icons/dist/workflow-tasks.js"
import "@ui5/webcomponents-icons/dist/discussion.js"
import {ChatThreadView} from "./chat-thread-view";
import {ThreadsProfile} from "../viewModels/profiles.proxy";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {getInitials} from "../utils";
import {EditProfile} from "./edit-profile";
import {PeerList} from "./peer-list";

/**
 * @element
 */
export class SemanticThreadsPage extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Fields -- */
  @state() private _initialized = false;
  @state() private _selectedThreadHash: AnyLinkableHashB64 = '';
  @state() private _createTopicHash: AnyLinkableHashB64 = '';

  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


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


  /** -- Methods -- */

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


  /** */
  shouldUpdate(changedProperties: PropertyValues<this>): boolean {
    //if (!this._initialized) return false;
    return super.shouldUpdate(changedProperties);
  }


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
    await this._dvm.threadsZvm.generateTestData();
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
      if (this._dvm.profilesZvm.getProfile(this._dvm.profilesZvm.cell.agentPubKey)) {
        await this._dvm.profilesZvm.updateMyProfile({nickname, fields});
      } else {
        await this._dvm.profilesZvm.createMyProfile({nickname, fields});
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
      await this._dvm.profilesZvm.updateMyProfile(profile);
    } catch(e) {
      await this._dvm.profilesZvm.createMyProfile(profile);
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
    await this._dvm.pingPeers(undefined, this._dvm.allCurrentOthers());
    //}
  }

  /** */
  async pingAllOthers() {
    //if (this._currentSpaceEh) {
    const agents = this._dvm.profilesZvm.getAgents().filter((agentKey) => agentKey != this.cell.agentPubKey);
    console.log("Pinging All Others", agents);
    await this._dvm.pingPeers(undefined, agents);
    //}
  }


  /** */
  render() {
    console.log("<semantic-threads-page>.render()", this._initialized, this._selectedThreadHash);

    //console.log("\t Using threadsZvm.roleName = ", this._dvm.threadsZvm.cell.name)

    this._myProfile = this._dvm.profilesZvm.getMyProfile();


    let centerSide = html`<h1 style="margin:auto;">No thread selected</h1>`
    if (this._selectedThreadHash) {
      const thread = this.threadsPerspective.threads[this._selectedThreadHash];
      const topic = this.threadsPerspective.allSemanticTopics[thread.pp.subjectHash];

      centerSide = html`
          <ui5-bar design="Header" style="background: #f1efef; border: 1px solid dimgray;">
              <ui5-button slot="startContent" icon="number-sign" tooltip=${this._selectedThreadHash}
                          design="Transparent"></ui5-button>
              <span id="threadTitle" slot="startContent">${topic}: ${thread.pp.purpose}</span>
              <ui5-button slot="endContent" icon="action-settings" tooltip="Go to settings" @click=${() => this._dvm.dumpLogs()}></ui5-button>
          </ui5-bar>
          <chat-view id="chat-view" .threadHash=${this._selectedThreadHash}
                            style=""></chat-view>
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
    let maybeAgent = this._dvm.profilesZvm.perspective.profiles[this._dvm.cell.agentPubKey];
    if (maybeAgent) {
      agent = maybeAgent;
    } else {
      //console.log("Profile not found for", texto.author, this._dvm.profilesZvm.perspective.profiles)
      this._dvm.profilesZvm.probeProfile(this._dvm.cell.agentPubKey)
      //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
    }
    const initials = getInitials(agent.nickname);
    const avatarUrl = agent.fields['avatar'];


    /** Render all */
    return html`
      <div id="mainDiv">
          <div id="leftSide">
              <div id="sideButtonBar" style="display: flex; flex-direction: row; height: 44px; border: 1px solid darkslategray">
                  <span style="font-size: 24px;font-weight: bold;padding: 3px 20px 0px 10px;">Topics</span>
                  <ui5-button design="Transparent" icon="action-settings" tooltip="Go to settings"
                              @click=${async () => {
                                  await this.updateComplete;
                                  this.dispatchEvent(new CustomEvent('debug', {detail: true, bubbles: true, composed: true}));
                              }}
                  ></ui5-button>                  
                  <ui5-button icon="synchronize" tooltip="Refresh" design="Transparent" @click=${this.refresh}></ui5-button>
                  <ui5-button icon="activate" tooltip="Commit logs" design="Transparent" @click=${this.onCommitBtn}></ui5-button>
                  <ui5-button id="createTopicButton" icon="add" tooltip="Create Topic" design="Transparent" 
                              @click=${() => this.createTopicDialogElem.show()}
                  ></ui5-button>                  
              </div>
              <semantic-topics-view 
                      @createThreadClicked=${(e) => {this._createTopicHash = e.detail; this.createThreadDialogElem.show()}}
                      @selected=${(e) => {this.onThreadSelected(e.detail)}}
              ></semantic-topics-view>
              <div id="profile-div" style="display: flex; flex-direction: row">
                  ${avatarUrl? html`
                      <ui5-avatar class="chatAvatar" style="box-shadow: 1px 1px 1px 1px rgba(130, 122, 122, 0.88)">
                          <img src=${avatarUrl}>
                      </ui5-avatar>                   
                          ` : html`
                        <ui5-avatar class="chatAvatar" shape="Circle" initials=${initials} color-scheme="Accent2"></ui5-avatar>
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
                  .saveProfileLabel=${'Edit Profile'}
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
          <ui5-button id="createTopicDialogButton" design="Emphasized" @click=${this.onCreateTopic}>Create</ui5-button>
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
              <ui5-button id="createThreadDialogButton" design="Emphasized" @click=${this.onCreateThread}>Create</ui5-button>
              <ui5-button @click=${(e) => this.createThreadDialogElem.close(false)}>Cancel</ui5-button>
          </div>
      </ui5-dialog>      
    `;
  }



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


  /** */
  static get scopedElements() {
    return {
      "semantic-topics-view": SemanticTopicsView,
      "text-thread-view": CommentThreadView,
      "chat-view": ChatThreadView,
      "edit-profile": EditProfile,
      "peer-list": PeerList,
    }
  }

  /** */
  static get styles() {
    return [
      css`
        :host {
          background: #f7f6f8;
          display: block;
          height: 100vh;
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
