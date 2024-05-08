import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {delay, DnaElement, HappBuildModeType} from "@ddd-qc/lit-happ";

import "@ddd-qc/path-explorer";

/** @ui5/webcomponents-fiori */
import "@ui5/webcomponents-fiori/dist/Bar.js";
import "@ui5/webcomponents-fiori/dist/NotificationListItem.js";
import "@ui5/webcomponents-fiori/dist/NotificationAction.js";
import "@ui5/webcomponents-fiori/dist/ShellBar.js";
import "@ui5/webcomponents-fiori/dist/ShellBarItem.js";
/** @ui5/webcomponents */
import "@ui5/webcomponents/dist/Avatar.js"
import "@ui5/webcomponents/dist/AvatarGroup.js"
import "@ui5/webcomponents/dist/Badge.js";
import "@ui5/webcomponents/dist/BusyIndicator.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/CustomListItem.js";
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Menu.js";
import "@ui5/webcomponents/dist/MenuItem.js";
import "@ui5/webcomponents/dist/MultiInput.js";
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/Panel.js";
import "@ui5/webcomponents/dist/Popover.js";
import "@ui5/webcomponents/dist/ProgressIndicator.js";
import "@ui5/webcomponents/dist/features/InputSuggestions.js";
import "@ui5/webcomponents/dist/Select.js";
import "@ui5/webcomponents/dist/StandardListItem.js";
import "@ui5/webcomponents/dist/Switch.js";
import "@ui5/webcomponents/dist/SuggestionItem.js";
import "@ui5/webcomponents/dist/Toast.js";
import "@ui5/webcomponents/dist/Tree.js"
import "@ui5/webcomponents/dist/TreeItem.js";
import "@ui5/webcomponents/dist/TreeItemCustom.js";

import Dialog from "@ui5/webcomponents/dist/Dialog";
import Popover from "@ui5/webcomponents/dist/Popover";
import Input from "@ui5/webcomponents/dist/Input";
import Menu from "@ui5/webcomponents/dist/Menu";
import Button from "@ui5/webcomponents/dist/Button";
import RadioButton from "@ui5/webcomponents/dist/RadioButton";
import ShellBar from "@ui5/webcomponents-fiori/dist/ShellBar";

/** @ui5/webcomponents-icons */
//import "@ui5/webcomponents-icons/dist/allIcons-static.js";
import "@ui5/webcomponents-icons/dist/action-settings.js"
import "@ui5/webcomponents-icons/dist/activate.js"
import "@ui5/webcomponents-icons/dist/add.js"
import "@ui5/webcomponents-icons/dist/add-favorite.js"
import "@ui5/webcomponents-icons/dist/accept.js"
import "@ui5/webcomponents-icons/dist/attachment.js"
import "@ui5/webcomponents-icons/dist/attachment-text-file.js"
import "@ui5/webcomponents-icons/dist/attachment-photo.js"
import "@ui5/webcomponents-icons/dist/attachment-video.js"
import "@ui5/webcomponents-icons/dist/attachment-audio.js"
import "@ui5/webcomponents-icons/dist/attachment-zip-file.js"
import "@ui5/webcomponents-icons/dist/bookmark.js"
import "@ui5/webcomponents-icons/dist/copy.js"
import "@ui5/webcomponents-icons/dist/chain-link.js"
import "@ui5/webcomponents-icons/dist/close-command-field.js"
import "@ui5/webcomponents-icons/dist/cloud.js"
import "@ui5/webcomponents-icons/dist/comment.js"
import "@ui5/webcomponents-icons/dist/customer.js"
import "@ui5/webcomponents-icons/dist/document.js"
import "@ui5/webcomponents-icons/dist/document-text.js"
import "@ui5/webcomponents-icons/dist/delete.js"
import "@ui5/webcomponents-icons/dist/decline.js"
import "@ui5/webcomponents-icons/dist/discussion.js"
import "@ui5/webcomponents-icons/dist/documents.js"
import "@ui5/webcomponents-icons/dist/dropdown.js"
import "@ui5/webcomponents-icons/dist/download.js"
import "@ui5/webcomponents-icons/dist/edit.js"
import "@ui5/webcomponents-icons/dist/email.js"
import "@ui5/webcomponents-icons/dist/error.js"
import "@ui5/webcomponents-icons/dist/feedback.js"
import "@ui5/webcomponents-icons/dist/favorite.js"
import "@ui5/webcomponents-icons/dist/favorite-list.js"
import "@ui5/webcomponents-icons/dist/flag.js"
import "@ui5/webcomponents-icons/dist/group.js"
import "@ui5/webcomponents-icons/dist/home.js"
import "@ui5/webcomponents-icons/dist/hide.js"
import "@ui5/webcomponents-icons/dist/inbox.js"
import "@ui5/webcomponents-icons/dist/information.js"
import "@ui5/webcomponents-icons/dist/journey-arrive.js"
import "@ui5/webcomponents-icons/dist/journey-depart.js"
import "@ui5/webcomponents-icons/dist/less.js"
import "@ui5/webcomponents-icons/dist/message-success.js"
import "@ui5/webcomponents-icons/dist/marketing-campaign.js"
import "@ui5/webcomponents-icons/dist/navigation-down-arrow.js"
import "@ui5/webcomponents-icons/dist/nav-back.js"
import "@ui5/webcomponents-icons/dist/number-sign.js"
import "@ui5/webcomponents-icons/dist/org-chart.js"
import "@ui5/webcomponents-icons/dist/open-folder.js"
import "@ui5/webcomponents-icons/dist/overflow.js"
import "@ui5/webcomponents-icons/dist/person-placeholder.js"
import "@ui5/webcomponents-icons/dist/process.js"
import "@ui5/webcomponents-icons/dist/product.js"
import "@ui5/webcomponents-icons/dist/pdf-attachment.js"
import "@ui5/webcomponents-icons/dist/response.js"
import "@ui5/webcomponents-icons/dist/save.js"
import "@ui5/webcomponents-icons/dist/sys-add.js"
import "@ui5/webcomponents-icons/dist/show.js"
import "@ui5/webcomponents-icons/dist/synchronize.js"
import "@ui5/webcomponents-icons/dist/user-edit.js"
import "@ui5/webcomponents-icons/dist/upload-to-cloud.js"
import "@ui5/webcomponents-icons/dist/unfavorite.js"
import "@ui5/webcomponents-icons/dist/warning.js"
import "@ui5/webcomponents-icons/dist/workflow-tasks.js"

/**  */
import {Dictionary} from "@ddd-qc/cell-proxy";

import '@vaadin/grid/theme/lumo/vaadin-grid.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-selection-column.js';

import 'css-doodle';

import {
  AnyBeadMat,
  AnyLinkableHashB64, beadJumpEvent,
  ChatThreadView,
  CommentRequest, CommentThreadView,
  doodle_flowers, EditTopicRequest,
  event2type,
  globaFilesContext, InputBar, JumpDestinationType,
  JumpEvent,
  NotifySettingType, onlineLoadedContext,
  parseMentions,
  ParticipationProtocol, ProfilePanel, searchFieldStyleTemplate,
  shellBarStyleTemplate, Subject, THIS_APPLET_ID, threadJumpEvent,
  ThreadsDnaPerspective,
  ThreadsDvm,
  ThreadsEntryType,
  ThreadsPerspective, weaveUrlToWal,
  weClientContext,
} from "@vines/elements";

import {WeServicesEx} from "@ddd-qc/we-utils";


import {
  ActionHashB64,
  decodeHashFromBase64,
  encodeHashToBase64,
  NetworkInfo,
  Timestamp,
} from "@holochain/client";

import {FrameNotification, GroupProfile, weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {consume, ContextProvider} from "@lit/context";

import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm";
import {FileTableItem} from "@ddd-qc/files/dist/elements/file-table";
import {FilesDvm, prettyFileSize, splitFile, SplitObject} from "@ddd-qc/files";
import {StoreDialog} from "@ddd-qc/files/dist/elements/store-dialog";
import {HAPP_BUILD_MODE} from "@ddd-qc/lit-happ/dist/globals";
import {msg} from "@lit/localize";
import {setLocale} from "./localization";
import {composeNotificationTitle, renderAvatar} from "@vines/elements/dist/render";
import {toasty} from "@vines/elements/dist/toast";
import {wrapPathInSvg} from "@ddd-qc/we-utils";
import {mdiInformationOutline} from "@mdi/js";
import {parseSearchInput} from "@vines/elements/dist/search";
import {CellIdStr} from "@ddd-qc/cell-proxy/dist/types";

// HACK: For some reason hc-sandbox gives the dna name as cell name instead of the role name...
const FILES_CELL_NAME = HAPP_BUILD_MODE == HappBuildModeType.Debug? 'dFiles' : 'rFiles';

console.log("FILES_CELL_NAME", FILES_CELL_NAME);


/**
 * @element
 */
@customElement("vines-page")
export class VinesPage extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    this.addEventListener('beforeunload', (e) => {
      console.log("<vines-page> beforeunload", e);
      // await this._dvm.threadsZvm.commitSearchLogs();
    });
  }


  /** Handle 'jump' event */
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('popstate', this.onPopState);
    this.addEventListener('jump', this.onJump);
    this.addEventListener('show-profile', this.onShowProfile);
    this.addEventListener('edit-profile', this.onEditProfile);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('popstate', this.onPopState);
    this.removeEventListener('jump', this.onJump);
    this.removeEventListener('edit-profile', this.onEditProfile);
    this.removeEventListener('show-profile', this.onShowProfile);
  }


  getDeepestElemAt(x: number, y: number): HTMLElement {
    const elem = this.shadowRoot.elementFromPoint(x, y) as HTMLElement;
    let shadow: HTMLElement = elem;
    let shadower;
    do {
      shadower = undefined;
      if (shadow.shadowRoot) {
        shadower = shadow.shadowRoot.elementFromPoint(x, y) as HTMLElement;
      }
      if (shadower) {
        shadow = shadower;
      }
    } while(shadower);
    return shadow;
  }


  onShowProfile(e) {
    console.log("onShowProfile()", e.detail)
    const elem = this.getDeepestElemAt(e.detail.x, e.detail.y);
    //console.log("onShowProfile() elem", elem)
    const popover = this.shadowRoot.getElementById("profilePop") as Popover;
    const sub = this.shadowRoot.getElementById("profilePanel") as ProfilePanel;
    sub.hash = e.detail.agent;
    sub.requestUpdate();
    popover.showAt(elem);
  }

  onEditProfile(e) {
    this.profileDialogElem.show();
  }

  /** -- Fields -- */

  @state() private _selectedCommentThreadHash: AnyLinkableHashB64 = '';
           private _selectedCommentThreadSubjectName: string = '';
  @state() private _createTopicHash: AnyLinkableHashB64 = '';

  @state() private _canShowComments = false;
  @state() private _canShowFavorites = false;
  @state() private _canShowSearchResults = false;
  @state() private _canShowDebug = false;
  @state() private _listerToShow: string | null = null;

  @state() private _canViewArchivedSubjects = false;
  @state() private _currentCommentRequest?: CommentRequest;

  @state() private _splitObj?: SplitObject;

  @state() private _replyToAh?: ActionHashB64;


  private _threadNames: Record<ActionHashB64, string> = {};

  @property() selectedThreadHash: AnyLinkableHashB64 = '';
  @property() selectedBeadAh: ActionHashB64 = '';

  @property({type: Object})
  networkInfoLogs: Record<CellIdStr, [Timestamp, NetworkInfo][]>;

  //@property() appletId: AppletId;

  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({ context: globaFilesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;


  /** -- Getters -- */

  get createTopicDialogElem(): Dialog {
    return this.shadowRoot.getElementById("create-topic-dialog") as Dialog;
  }
  get editTopicDialogElem(): Dialog {
    return this.shadowRoot.getElementById("edit-topic-dialog") as Dialog;
  }

  get createThreadDialogElem(): Dialog {
    return this.shadowRoot.getElementById("create-thread-dialog") as Dialog;
  }

  get profileDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("profile-dialog") as Dialog;
  }

  get waitDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("wait-dialog") as Dialog;
  }


  /** -- Update -- */

  /** */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<vines-page>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    //newDvm.probeAll();
    // if (this.weServices) {
    //   const appletInfo = await this.weServices.appletInfo(a)
    //   const groupProfile = await this.weServices.groupProfile(decodeHashFromBase64(newDvm.cell.dnaHash));
    //   console.log("dvmUpdated() groupProfile", groupProfile);
    // }
    this.selectedThreadHash = '';
    this.selectedBeadAh = '';
    this._listerToShow = newDvm.cell.dnaHash;
  }


  /** -- Update -- */

  /** */
  async onCreateTopic(e) {
    const input = this.shadowRoot!.getElementById("topicTitleInput") as HTMLInputElement;
    const name = input.value.trim();
    await this._dvm.publishSemanticTopic(name);
    //console.log("onCreateList() res:", res)
    input.value = "";
    this.createTopicDialogElem.close();
  }


  /** */
  async onEditTopic(e) {
    const input = this.shadowRoot!.getElementById("editTopicTitleInput") as HTMLInputElement;
    const name = input.value.trim();
    await this._dvm.editSemanticTopic(this.editTopicDialogElem.getAttribute('TopicHash'), name);
    //console.log("onCreateList() res:", res)
    input.value = "";
    this.editTopicDialogElem.close();
  }


  /** */
  async onCreateThread(e) {
    const input = this.shadowRoot!.getElementById("threadPurposeInput") as HTMLInputElement;
    const name = input.value.trim();
    if (name.length < 1) {
      return;
    }
    const tuple = await this._dvm.publishThreadFromSemanticTopic(this.weServices? this.weServices.appletId : THIS_APPLET_ID, this._createTopicHash, name);
    //console.log("onCreateThread()", tuple, tuple[1])
    input.value = "";

    this.dispatchEvent(threadJumpEvent(tuple[1]));
    this.createThreadDialogElem.close(false);
  }


  /** */
  async onCreateTextMessage(inputText: string) {
    console.log("onCreateTextMessage", inputText, this._dvm.profilesZvm)
    const mentionedAgents = parseMentions(inputText, this._dvm.profilesZvm);
    let threadHash = this.selectedThreadHash;
    if (this._currentCommentRequest) {
      threadHash = await this.createCommentThread(this._currentCommentRequest);
      this._currentCommentRequest = undefined;
    }
    let ah = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, inputText, threadHash, undefined, mentionedAgents, this._replyToAh);
    console.log("onCreateTextMessage() ah", ah, this._replyToAh);
    this._replyToAh = undefined;
    this.selectedBeadAh = '';

    // /** DEBUG */
    // if (this.weServices) {
    //   const entryInfo = await this.weServices.entryInfo([decodeHashFromBase64(this.cell.dnaHash), decodeHashFromBase64(ah)]);
    //   console.log("entryInfo2", this.cell.dnaHash, entryInfo);
    // }
  }


  /** */
  async onCreateHrlMessage() {
    const maybeWal = await this.weServices.userSelectWal();
    if (!maybeWal) {
      return;
    }
    console.log("onCreateHrlMessage()", weaveUrlFromWal(maybeWal), maybeWal);
    //const entryInfo = await this.weServices.entryInfo(maybeHrl.hrl);
    // FIXME make sure hrl is an entryHash
    let ah = await this._dvm.publishTypedBead(ThreadsEntryType.AnyBead, maybeWal, this.selectedThreadHash, undefined, [], this._replyToAh);
    this._replyToAh = undefined;
    this.selectedBeadAh = '';
    console.log("onCreateHrlMessage() ah", ah);
  }


  /** */
  async onCreateSemanticTopic(topic: string) {
    await this._dvm.publishSemanticTopic(topic);
  }


  ///** */
  //shouldUpdate(changedProperties: PropertyValues<this>): boolean {
  //  const canUpdate = super.shouldUpdate(changedProperties);
  //  console.log("<vines-page>.shouldUpdate()", /*canUpdate,*/ changedProperties, JSON.stringify(changedProperties.get("threadsPerspective")));
  //  return canUpdate;
  //}


  /** After first render only */
  async firstUpdated() {
    console.log("<vines-page> firstUpdated()");

    /** Generate test data */
    //await this._dvm.threadsZvm.generateTestData("");

    /** Fiddle with shadow parts CSS */
    const searchField = this.shadowRoot.getElementById('search-field') as Input;
    console.log("search-field", searchField,searchField.shadowRoot);
    if (searchField) {
      searchField.shadowRoot.appendChild(searchFieldStyleTemplate.content.cloneNode(true));
      this.requestUpdate();
    }
    const shellBar = this.shadowRoot.getElementById('topicBar') as ShellBar;
    if (shellBar) {
      shellBar.shadowRoot.appendChild(shellBarStyleTemplate.content.cloneNode(true));
      shellBar.showSearchField = false;
    }

    /** Grab all AppletIds & GroupProfiles */
    if (this.weServices) {
      console.log("<vines-page> firstUpdated() calling probeAllAppletIds()", this.weServices);
      const appletIds = await this._dvm.threadsZvm.probeAllAppletIds();
      console.log("<vines-page> firstUpdated() appletIds", appletIds);
      for (const appletId of appletIds) {
        /*const wtf = */ await this.weServices.cacheFullAppletInfo(appletId);
      }
      /** notifyFrame of some new content */
      const allCount = Object.keys(this._dvm.threadsZvm.perspective.unreadThreads).length + Object.keys(this._dvm.threadsZvm.perspective.newThreads).length;
      if (allCount > 0) {
        this.weServices.notifyFrame([{
          title: "New content",
          body: "",
          notification_type: "content",
          icon_src: wrapPathInSvg(mdiInformationOutline),
          urgency: 'medium',
          timestamp: Date.now(),
      }]);
      }
    }
    this.requestUpdate();
    /** */
    this.pingAllOthers();
  }

  private _lastKnownNotificationIndex = 0;


  /** */
  protected async updated(_changedProperties: PropertyValues) {
    /** ??? */
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

    // /** Fiddle with shadow parts CSS */
    // const shellBar = this.shadowRoot.getElementById('topicBar') as HTMLElement;
    // if (shellBar) {
    //   shellBar.shadowRoot.appendChild(shellBarStyleTemplate.content.cloneNode(true));
    // }

    //   /** Toggle notif settings switch if necessary */
    //   const allRadio = this.shadowRoot.getElementById("notifSettingsAll") as RadioButton;
    //   const mentionRadio = this.shadowRoot.getElementById("notifSettingsMentions") as RadioButton;
    //   const neverRadio = this.shadowRoot.getElementById("notifSettingsNever") as RadioButton;
    //
    //   if (allRadio.checked) {
    //     this._dvm.threadsZvm.publishNotifSetting(this.selectedThreadHash, NotifySettingType.AllMessages);
    //     return;
    //   }
    //   if (mentionRadio.checked) {
    //     this._dvm.threadsZvm.publishNotifSetting(this.selectedThreadHash, NotifySettingType.MentionsOnly);
    //     return;
    //   }
    //   if (neverRadio.checked) {
    //     this._dvm.threadsZvm.publishNotifSetting(this.selectedThreadHash, NotifySettingType.Never);
    //     return;
    //   }
    // }

    /** Grab AssetInfo for all AnyBeads */
    for (const [beadInfo, beadPair] of Object.entries(this.threadsPerspective.beads)) {
      if (beadInfo != ThreadsEntryType.AnyBead) {
        continue;
      }
      const anyBead = beadPair[1] as AnyBeadMat;
      const wal = weaveUrlToWal(anyBead.value);
      if (!this.weServices.assetInfoCached(wal)) {
        const maybe = await this.weServices.assetInfo(wal);
        if (maybe) {
          this.requestUpdate();
        }
      }
    }

    /** Create popups from signaled Notifications */
    const weNotifs = [];
    for (const notif of this.perspective.signaledNotifications.slice(this._lastKnownNotificationIndex)) {
      const author = this._dvm.profilesZvm.perspective.profiles[encodeHashToBase64(notif.author)] ? this._dvm.profilesZvm.perspective.profiles[encodeHashToBase64(notif.author)].nickname : "unknown";
      const canPopup = author != this.cell.agentPubKey || HAPP_BUILD_MODE == HappBuildModeType.Debug;
      //const date = new Date(notif.timestamp / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
      //const date_str = timeSince(date) + " ago";
      const [notifTitle, notifBody] = composeNotificationTitle(notif, this._dvm.threadsZvm, this._filesDvm, this.weServices);
      let message = `"${notifBody}" from @${author}.` ; // | ${date_str}`;
      /** in-app toast */
      if (canPopup) {
        toasty(notifTitle + " " + message);
      }
      /** We Notification */
      if (this.weServices) {
        const myNotif: FrameNotification = {
          title: notifTitle,
          body: message,
          notification_type: event2type(notif.event),
          icon_src: wrapPathInSvg(mdiInformationOutline),
          urgency: 'high',
          timestamp: notif.timestamp / 1000,
        }
        weNotifs.push(myNotif);
      }
      this._lastKnownNotificationIndex += 1;
    }
    if (this.weServices && weNotifs.length > 0) {
      this.weServices.notifyFrame(weNotifs);
    }
  }


  /** */
  async handleColorChange(e: any) {
    console.log("handleColorChange: " + e.target.lastValueEmitted)
    const color = e.target.lastValueEmitted;
    const profile = this._dvm.profilesZvm.getMyProfile()!;
    await this.setMyProfile(profile.nickname, profile.fields['avatar'], color)
  }


  /** */
  async setMyProfile(nickname: string, avatar: string, color: string) {
    console.log("updateProfile() called:", nickname)
    const fields: Dictionary<string> = {};
    fields['color'] = color;
    fields['avatar'] = avatar;
    try {
      if (this._dvm.profilesZvm.getProfile(this._dvm.cell.agentPubKey)) {
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
  private async onSaveProfile(profile: ProfileMat) {
    console.log("onSaveProfile()", profile)
    try {
      await this._dvm.profilesZvm.updateMyProfile(profile);
    } catch(e) {
      await this._dvm.profilesZvm.createMyProfile(profile);
    }
    this.profileDialogElem.close(false);
    this.requestUpdate();
  }


  /** */
  async pingActiveOthers() {
    //if (this._currentSpaceEh) {
    console.log("Pinging All Active");
    const currentPeers = this._dvm.allCurrentOthers(this._dvm.profilesZvm.getAgents());
    await this._dvm.pingPeers(undefined, currentPeers);
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
  async onEditTopicClicked(e: CustomEvent<EditTopicRequest>) {
    console.log("onEditTopicClicked()", e.detail);
    const request = e.detail;
    const input = this.shadowRoot!.getElementById("editTopicTitleInput") as HTMLInputElement;
    input.value = request.subjectName;
    this.editTopicDialogElem.setAttribute('topicHash', request.topicHash);
    this.editTopicDialogElem.open = true;
  }


  /** */
  async onReplyClicked(e: CustomEvent) {
    console.log("onReplyClicked()", e.detail);
    const beadAh = e.detail;
    this._replyToAh = beadAh;
  }


  /** */
  async onCommentingClicked(e: CustomEvent<CommentRequest>) {
    console.log("onCommentingClicked()", e.detail);
    const request = e.detail;

    if (request.viewType == "side") {
      const threadHash = request.maybeCommentThread? request.maybeCommentThread : await this.createCommentThread(request);
      this._canShowComments = true;
      /** Save input field before switching */
      if (this._selectedCommentThreadHash) {
        const commentView = this.shadowRoot.getElementById("comment-view") as CommentThreadView;
        if (commentView) {
          this._dvm.perspective.threadInputs[this._selectedCommentThreadHash] = commentView.value;
        }
      }
      this._selectedCommentThreadHash = threadHash;
      this._selectedCommentThreadSubjectName = request.subjectName;
      return;
    }

    if (!request.maybeCommentThread) {
      this._currentCommentRequest = request;
      //this._selectedThreadSubjectName = request.subjectName;
      return;
    }
  }


  /** */
  async createCommentThread(request: CommentRequest) {
    const subject: Subject = {
        hash: decodeHashFromBase64(request.subjectHash),
        typeName: request.subjectType,
        appletId: this.weServices? this.weServices.appletId : THIS_APPLET_ID,
        dnaHash: decodeHashFromBase64(this.cell.dnaHash),
    };
    const pp: ParticipationProtocol = {
        purpose: "comment",
        rules: "N/A",
        subject,
        subject_name: request.subjectName,
        //subject_name: await determineSubjectName(materializeSubject(subject), this._dvm.threadsZvm, this._filesDvm, this.weServices),
    };
    const [ts, ppAh, _ppMat] = await this._dvm.threadsZvm.publishParticipationProtocol(pp);
    return ppAh;
  }


  /** */
  onAppletSelected(e) {
    console.log("onAppletSelected()", e);
    const selectedOption = e.detail.selectedOption;
    console.log("onAppletSelected() selectedOption", e.detail.selectedOption);
    if (selectedOption.id == "mine-option") {
      this._listerToShow = null;
      return;
    }
    if (selectedOption.id == "topics-option") {
      this._listerToShow = this.cell.dnaHash;
      return;
    }
    if (selectedOption.id == "this-app-option" /*|| (this.weServices && selectedOption.id == this.weServices.appletId)*/) {
      this._listerToShow = THIS_APPLET_ID;
      return;
    }
    /* it's an appletId so display the applet lister */
    this._listerToShow = selectedOption.id;
    this.requestUpdate();
  }


  @state() private _hideFiles = true;


  /** */
  onCreateFileMessage(ppAh: ActionHashB64) {
    var input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e:any) => {
      console.log("target upload file", e);
      const file = e.target.files[0];
      // if (file.size > this._dvm.dnaProperties.maxParcelSize) {
      //   //toastError(`File is too big ${prettyFileSize(file.size)}. Maximum file size: ${prettyFileSize(this._dvm.dnaProperties.maxParcelSize)}`)
      //   return;
      // }
      this._splitObj = await this._filesDvm.startPublishFile(file, [], async (eh) => {
        console.log("<vines-page> startPublishFile callback", eh);
        let ah = this._dvm.publishTypedBead(ThreadsEntryType.EntryBead, eh, ppAh, undefined, [], this._replyToAh);
        this._splitObj = undefined;
        this._replyToAh = undefined;
        this.selectedBeadAh = '';
        console.log("onCreateFileMessage() ah", ah);
      });
      console.log("onCreateFileMessage()", this._splitObj);
    }
    input.click();
  }


  /** */
  async onPopState(e: CustomEvent<PopStateEvent>) {
    console.log("onPopState()", e);
  }


  /** */
  async onJump(e: CustomEvent<JumpEvent>) {
    console.log("<vines-page>.onJump()", e.detail, this.selectedThreadHash);
    const prevThreadHash = this.selectedThreadHash; // this.selectedThreadHash can change value during this function call (changed by other functions handling events I guess).
    this._replyToAh = undefined;
    /** */
    if (e.detail.type == JumpDestinationType.Thread || e.detail.type == JumpDestinationType.Bead) {
      /** set lastProbeTime for current thread */
      await this._dvm.threadsZvm.commitThreadProbeLog(prevThreadHash);
      /** Clear notifications on prevThread */
      const prevThreadNotifs = this._dvm.threadsZvm.getPpNotifs(prevThreadHash);
      for (const [linkAh, _notif] of prevThreadNotifs) {
        await this._dvm.threadsZvm.deleteInboxItem(linkAh);
      }
      /** Cache and reset input-bar */
      const inputBar = this.shadowRoot.getElementById("input-bar") as InputBar;
      if (inputBar) {
        this._dvm.perspective.threadInputs[prevThreadHash] = inputBar.value;
        inputBar.setValue("");
        // console.log("onJump() inputBar cached", this._dvm.perspective.threadInputs[prevThreadHash], prevThreadHash);
      }
    }
    /** Close any opened popover */
    const popover = this.shadowRoot.getElementById("notifPopover") as Popover;
    if (popover.isOpen()) {
      popover.close();
    }
    const pop = this.shadowRoot.getElementById("notifSettingsPopover") as Popover;
    if (pop.isOpen()) {
      pop.close();
    }
    let searchPopElem = this.shadowRoot.getElementById("searchPopover") as Popover;
    if (searchPopElem.isOpen()) {
      searchPopElem.close();
    }
  }


  /** */
  onNotifSettingsChange() {
    console.log("onNotifSettingsChange()")
    const allRadio = this.shadowRoot.getElementById("notifSettingsAll") as RadioButton;
    const mentionRadio = this.shadowRoot.getElementById("notifSettingsMentions") as RadioButton;
    const neverRadio = this.shadowRoot.getElementById("notifSettingsNever") as RadioButton;

    if (allRadio.checked) {
      this._dvm.threadsZvm.publishNotifSetting(this.selectedThreadHash, NotifySettingType.AllMessages);
      //console.log("notifSetting checked", NotifySettingType.AllMessages);
      return;
    }
    if (mentionRadio.checked) {
      this._dvm.threadsZvm.publishNotifSetting(this.selectedThreadHash, NotifySettingType.MentionsOnly);
      //console.log("notifSetting checked", NotifySettingType.MentionsOnly);
      return;
    }
    if (neverRadio.checked) {
      this._dvm.threadsZvm.publishNotifSetting(this.selectedThreadHash, NotifySettingType.Never);
      //console.log("notifSetting checked", NotifySettingType.Never);
      return;
    }
  }


  /** */
  downloadTextFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }


  /** */
  private addSearch(str: string) {
    const field = this.shadowRoot.getElementById("search-field") as Input;
    let ws = "";
    if (field.value.length > 0 && field.value[field.value.length - 1] != " ") {
      ws = " "
    }
    field.value += ws + str;
    field.focus();
  }


  /** */
  render() {
    console.log("<vines-page>.render()", this.onlineLoaded, this.selectedThreadHash, /*this._dvm.profilesZvm,*/ this._dvm.threadsZvm.perspective);
    //console.log("<vines-page>.render() jump", this.perspective.threadInputs[this.selectedThreadHash], this.selectedThreadHash);

    let centerSide = html`
        <!-- <h1 style="margin:auto;margin-top:20px;">${msg("No thread selected")}</h1> -->
        ${doodle_flowers}
    `;
    let primaryTitle = "No thread selected";
    if (this.selectedThreadHash) {
      const thread = this.threadsPerspective.threads.get(this.selectedThreadHash);
      if (!thread) {
        this._dvm.threadsZvm.fetchPp(this.selectedThreadHash);
      } else {
        primaryTitle = thread.name;
        const maybeSemanticTopicThread = this.threadsPerspective.allSemanticTopics[thread.pp.subject.hash];
        let topic;
         if (maybeSemanticTopicThread) {
           const [semTopic, _topicHidden] = maybeSemanticTopicThread;
           topic = semTopic;
         } else {
           topic = "Reply";
         }

        /** Check uploading state */
        let pct = 100;
        if (this._splitObj) {
          /** auto refresh since we can't observe filesDvm */
          delay(500).then(() => {this.requestUpdate()});
          pct = Math.ceil(this._filesDvm.perspective.uploadState.chunks.length / this._filesDvm.perspective.uploadState.splitObj.numChunks * 100)
        }

        let maybeReplyAuthorName = "unknown"
        if (this._replyToAh) {
          const beadInfo = this._dvm.threadsZvm.getBeadInfo(this._replyToAh);
          if (beadInfo) {
            const maybeProfile = this._dvm.profilesZvm.perspective.profiles[beadInfo.author];
            if (maybeProfile) {
              maybeReplyAuthorName = maybeProfile.nickname;
            }
          }
        }

        centerSide = html`
            <chat-thread-view id="chat-view" .threadHash=${this.selectedThreadHash} .beadAh=${this.selectedBeadAh}></chat-thread-view>
            ${this._splitObj? html`
              <div id="uploadCard">
                <div style="padding:5px;">Uploading ${this._filesDvm.perspective.uploadState.file.name}</div>
                <ui5-progress-indicator style="width:100%;" value=${pct}></ui5-progress-indicator>
              </div>
            ` : html`
            <div class="reply-info" style="display: ${this._currentCommentRequest? "block" : "none"}">
              Thread about "${this._currentCommentRequest? this._currentCommentRequest.subjectName : ''}"
              <ui5-button icon="delete" design="Transparent"
                          style="border:none; padding:0px"
                          @click=${(e) => {this._currentCommentRequest = undefined;}}></ui5-button>
            </div>
            <div class="reply-to-div" style="display: ${this._replyToAh? "flex" : "none"}">
                Replying to ${maybeReplyAuthorName}
                <div style="flex-grow: 1"></div>
                <ui5-button icon="decline" design="Transparent"
                            style="border:none; padding:0px"
                            @click=${(e) => {this._replyToAh = undefined;}}></ui5-button>
            </div>
            <vines-input-bar id="input-bar"
                             .profilesZvm=${this._dvm.profilesZvm}
                             .topic=${topic}
                             .cachedInput=${this.perspective.threadInputs[this.selectedThreadHash]? this.perspective.threadInputs[this.selectedThreadHash] : ""}
                             .showHrlBtn=${!!this.weServices}
                             showFileBtn="true"
                             @input=${(e) => {e.preventDefault(); this.onCreateTextMessage(e.detail)}}
                             @upload=${(e) => {e.preventDefault(); this.onCreateFileMessage(this.selectedThreadHash)}}
                             @grab_hrl=${async (e) => {e.preventDefault(); this.onCreateHrlMessage()}}
            ></vines-input-bar>`
            }
        `;
      }
    }


    /** This agent's profile info */
    let myProfile = this._dvm.profilesZvm.getMyProfile();
    if (!myProfile) {
      myProfile = {nickname: "unknown", fields: {lang: "en"}} as ProfileMat;
    }
    let lang = myProfile.fields['lang'];
    if (!lang || lang == "") {
      lang = "en";
    }
    setLocale(lang);

    const avatar = renderAvatar(this._dvm.profilesZvm, this.cell.agentPubKey, "S");

    //console.log("this._appletInfos", JSON.parse(JSON.stringify(this._appletInfos)));
    //console.log("this.wePerspective.applets", this.wePerspective.applets, myProfile);
    let appletOptions = [];
    if (this.weServices) {
      appletOptions = Object.entries(this.weServices.cache.appletInfo).map(([appletId, appletInfo]) => {
          console.log("appletInfo", appletInfo);
          /** exclude this applet as it's handled specifically elsewhere */
          if (this.weServices.appletId == appletId) {
            return html``;
          }
          return html`<ui5-option id=${appletId} icon="discussion">${appletInfo.appletName}</ui5-option>`;
        }
      );
    }
    console.log("appletOptions", appletOptions);


    let fileTable = html``;
    if (!this._hideFiles) {
      const publicItems = Object.entries(this._filesDvm.deliveryZvm.perspective.publicParcels)
          .map(([ppEh, [description, timestamp, author]]) => {
            //const [description, timestamp, author] = this.deliveryPerspective.publicParcels[ppEh];
            const isLocal = !!this._filesDvm.deliveryZvm.perspective.localPublicManifests[ppEh];
            return {ppEh, description, timestamp, author, isLocal, isPrivate: false} as FileTableItem;
          });
      console.log("dFiles dnaProperties", this._filesDvm.dnaProperties);
      console.log("dFiles filesDvm cell", this._filesDvm.cell);
      fileTable = html`
        <cell-context .cell=${this._filesDvm.cell}>
            <h2>Public Files</h2>
            <button @click=${(e) => {
                const storeDialogElem = this.shadowRoot.querySelector("store-dialog") as StoreDialog;
                storeDialogElem.open(false);
            }}>Add Public file</button>
            <store-dialog></store-dialog>        
            <file-table .items=${publicItems}></file-table>
            <activity-timeline></activity-timeline>
        </cell-context>          
      `;
    }

    const searchValue = this.shadowRoot.getElementById("search-field")? (this.shadowRoot.getElementById("search-field") as Input).value : "";
    const searchParameters = parseSearchInput(searchValue, this._dvm.profilesZvm.perspective);

    let notifSetting = NotifySettingType.MentionsOnly; // default
    if (this.selectedThreadHash) {
      notifSetting = this._dvm.threadsZvm.getNotifSetting(this.selectedThreadHash, this.cell.agentPubKey);
    }

    /** Group Info */
    let groupProfile: GroupProfile = {
      name: "Vines",
      logo_src: "icon.png",
    };

    /* Use weServices, otherise try from dna properties */
    if(this.weServices) {
      const appletInfo = this.weServices.appletInfoCached(this.weServices.appletId);
      console.log("get appletInfo", appletInfo);
      if (appletInfo) {
        console.log("get groupProfile", appletInfo.groupsIds[0]);
        const weGroup = this.weServices.groupProfileCached(appletInfo.groupsIds[0]);
        if (weGroup) {
          groupProfile = weGroup;
        }
      }
    } else {
      if (this._dvm.dnaProperties.groupName) {
        groupProfile.name = this._dvm.dnaProperties.groupName;
      }
      if (this._dvm.dnaProperties.groupSvgIcon) {
        // const svg = atob(this._dvm.dnaProperties.groupSvgIcon);
        // console.log("dnaProperties svg", svg);
        // const tagRegex = /^[a-zA-Z][^\s>\/]*(?:\s(?:[^=]+=(?:"[^"]*"|'[^']*'))?)*\s*\/?$/;
        // const isValid = tagRegex.test("svg");
        // if (isValid) {
        //   groupProfile.logo_src = `data:image/svg+xml;base64,${this._dvm.dnaProperties.groupSvgIcon}`;
        // }
        groupProfile.logo_src = `data:image/svg+xml;base64,${this._dvm.dnaProperties.groupSvgIcon}`;
      }
    }

    /** Get network info for this cell */
    const sId = CellIdStr(this.cell.id);
    const networkInfos = this.networkInfoLogs && this.networkInfoLogs[sId]? this.networkInfoLogs[sId] : [];
    const networkInfo = networkInfos.length > 0 ? networkInfos[networkInfos.length - 1][1] : null;

    let lister= html`<applet-lister .appletId=${this._listerToShow}></applet-lister>`
    if (this._listerToShow == this.cell.dnaHash) {
      lister = html`
          <topics-lister 
                         .showArchivedTopics=${this._canViewArchivedSubjects}
                         .selectedThreadHash=${this.selectedThreadHash}
                         @createNewTopic=${(e) => this.createTopicDialogElem.show()}
                         @createThreadClicked=${(e) => {
                             this._createTopicHash = e.detail;
                             this.createThreadDialogElem.show();
                         }}
          ></topics-lister>
      `;
    }
    if (this._listerToShow == null) {
      lister = html`
          <my-threads-lister 
                         .showArchivedSubjects=${this._canViewArchivedSubjects}
                         .selectedThreadHash=${this.selectedThreadHash}
                         @createNewTopic=${(e) => this.createTopicDialogElem.show()}
                         @createThreadClicked=${(e) => {
        this._createTopicHash = e.detail;
        this.createThreadDialogElem.show()
      }}
          ></my-threads-lister>
      `;
    }
    let maybeBackBtn = html``;
    const thread = this._dvm.threadsZvm.perspective.threads.get(this.selectedThreadHash);
    if (thread) {
      const subjectBead = this._dvm.threadsZvm.getBeadInfo(thread.pp.subject.hash);
      if (subjectBead) {
        maybeBackBtn = html`
            <ui5-button icon="nav-back" slot="startButton" class="shellbtn"
                        @click=${(_e) => this.dispatchEvent(beadJumpEvent(thread.pp.subject.hash))}></ui5-button>`;
      }
    }


    /** Render all */
    return html`
        <div id="mainDiv" 
             @commenting-clicked=${this.onCommentingClicked}
             @reply-clicked=${this.onReplyClicked}
             @edit-topic-clicked=${this.onEditTopicClicked} >
            <div id="leftSide" @contextmenu=${(e) => {
              console.log("LeftSide contextmenu", e);
                // e.preventDefault();
                // const menu = this.shadowRoot.getElementById("groupMenu") as Menu;
                // const btn = this.shadowRoot.getElementById("groupBtn") as Button;
                // menu.showAt(btn);
                // //menu.style.top = e.clientY + "px";
                // //menu.style.left = e.clientX + "px";
            }}>
                <div id="group-div">
                    <ui5-avatar size="S" class="chatAvatar"
                                @click=${() => {
                        const popover = this.shadowRoot.getElementById("networkPopover") as Popover;
                        const btn = this.shadowRoot.getElementById("group-div") as HTMLElement;
                        popover.showAt(btn);
                    }}>
                        <img src=${groupProfile.logo_src} style="background: #fff; border: 1px solid #66666669;">
                    </ui5-avatar>
                    <div style="display: flex; flex-direction: column; align-items: stretch;padding-top:12px;margin-left:5px;flex-grow: 1;min-width: 0;"
                         @click=${() => {
                        const popover = this.shadowRoot.getElementById("networkPopover") as Popover;
                        const btn = this.shadowRoot.getElementById("group-div") as HTMLElement;
                        popover.showAt(btn);
                    }}>
                        <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis;font-size:1.25rem">${groupProfile.name}</div>
                        <div style="font-size: 0.66rem;color:grey; text-decoration: underline;"><ui5-icon name="group" style="height: 0.75rem;margin-right:3px"></ui5-icon>${networkInfo? networkInfo.total_network_peers : 1} Members</div>
                    </div>
                    <ui5-button id="groupBtn" style="margin-top:10px;" tooltip
                                design="Transparent" icon="navigation-down-arrow"
                                @click=${(e) => {
                                  e.preventDefault();
                                  //console.log("onSettingsMenu()", e);
                                  const menu = this.shadowRoot.getElementById("groupMenu") as Menu;
                                  const btn = this.shadowRoot.getElementById("groupBtn") as Button;
                                  menu.showAt(btn);
                                }}>
                    </ui5-button>
                    <ui5-menu id="groupMenu" @item-click=${this.onGroupMenu}>
                        <ui5-menu-item id="createTopic" text=${msg("Create new Topic")} icon="add"></ui5-menu-item>
                        ${this._canViewArchivedSubjects
                          ? html`<ui5-menu-item id="viewArchived" text=${msg("Hide Archived Topics")} icon="hide"></ui5-menu-item>`
                          : html`<ui5-menu-item id="viewArchived" text=${msg("View Archived Topics")} icon="show"></ui5-menu-item>
                        `}
                        <ui5-menu-item id="markAllRead" text=${msg("Mark all as read")}></ui5-menu-item>
                    </ui5-menu>
                </div>

                <ui5-select id="dna-select" @change=${this.onAppletSelected}>
                    ${appletOptions}
                    <!-- <ui5-option id="this-app-option" icon="discussion">Vines</ui5-option>  FIXME: disabled because not working -->
                    <ui5-option id="mine-option" icon="bookmark">My Threads</ui5-option>
                    <ui5-option id="topics-option" icon="org-chart" selected>Topics</ui5-option>
                </ui5-select>
                ${lister}

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
                <div id="profile-row">
                    <div id="profile-div" 
                         style="display: flex; flex-direction: row; cursor:pointer;flex-grow:1;min-width: 0;"
                         @click=${(e) => {
                             e.stopPropagation();
                             this.dispatchEvent(new CustomEvent('show-profile', {detail: {agent: this.cell.agentPubKey, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));}}>
                      ${avatar}
                      <div style="display: flex; flex-direction: column; align-items: stretch;padding-top:18px;margin-left:5px;flex-grow:1;min-width: 0;">
                          <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis;"><abbr title=${this.cell.agentPubKey}>${myProfile.nickname}</abbr></div>
                              <!-- <div style="font-size: small">${this.cell.agentPubKey}</div> -->
                      </div>
                    </div>
                    <ui5-button id="settingsBtn" style="margin-top:10px;"
                                design="Transparent" icon="action-settings" tooltip=${msg("Settings")}
                                @click=${(e) => {
                                  //console.log("onSettingsMenu()", e);
                                  const settingsMenu = this.shadowRoot.getElementById("settingsMenu") as Menu;
                                  const settingsBtn = this.shadowRoot.getElementById("settingsBtn") as Button;
                                  settingsMenu.showAt(settingsBtn);
                                }}>
                    </ui5-button>
                      <ui5-menu id="settingsMenu" header-text=${msg("Settings")} 
                                @item-click=${(e) => this.onSettingsMenu(e)}>
                          <ui5-menu-item id="editProfileItem" text=${msg("Edit Profile")} icon="user-edit"></ui5-menu-item>
                          <ui5-menu-item id="exportItem" text=${msg("Export Local")} icon="save" starts-section></ui5-menu-item>
                          <ui5-menu-item id="exportAllItem" text=${msg("Export All")} icon="save" starts-section></ui5-menu-item>
                          <ui5-menu-item id="uploadFileItem" text=${msg("Import File")} icon="upload-to-cloud"></ui5-menu-item>
                          <ui5-menu-item id="importCommitItem" text=${msg("Import & commit")} icon="open-folder" ></ui5-menu-item>
                          <ui5-menu-item id="importOnlyItem" text=${msg("Import only")} icon="open-folder" ></ui5-menu-item>
                          <ui5-menu-item id="bugItem" text=${msg("Report Bug")} icon="marketing-campaign" starts-section></ui5-menu-item>
                          <ui5-menu-item id="dumpItem" text=${msg("Dump app logs")}></ui5-menu-item>
                          <ui5-menu-item id="dumpNetworkItem" text=${msg("Dump Network logs")}></ui5-menu-item>
                      </ui5-menu>
                    <!-- Network Health Panel -->
                    <ui5-popover id="networkPopover">
                        <div slot="header" style="display:flex; flex-direction:row; width:100%; margin:5px; font-weight: bold;">
                            <abbr title=${this.cell.dnaHash}>${msg("Network Health")}</abbr>
                            <div style="flex-grow: 1;"></div>
                        </div>
                        <network-health-panel></network-health-panel>
                        <div slot="footer" style="display:flex; flex-direction:row; width:100%; margin:5px; margin-right:0px;">
                          <div style="flex-grow: 1;"></div>
                          <ui5-button slot="footer" design="Emphasized" @click=${() => {
                                      const popover = this.shadowRoot.getElementById("networkPopover") as Popover;
                                      if (popover.isOpen()) {
                                          popover.close();
                                      }
                                  }}
                          >Close</ui5-button>
                        </div>
                    </ui5-popover>
                  <!-- <ui5-button style="margin-top:10px;"
                                design="Transparent" icon="synchronize" tooltip="Refresh"
                                @click=${this.refresh}></ui5-button>  -->
                </div>
            </div>
            <div id="mainSide">
              <ui5-shellbar id="topicBar" primary-title=${primaryTitle} show-search-field>
                  ${maybeBackBtn}
                  <ui5-input id="search-field" slot="searchField" placeholder=${msg('Search')} show-clear-icon
                             @input=${(e) => {
                                 console.log("<search-field> @input", e.keyCode, e);
                                 let searchElem = this.shadowRoot.getElementById("search-field") as Input;
                                 let searchPopElem = this.shadowRoot.getElementById("searchPopover") as Popover;
                                 if (searchElem.value == "") {
                                   searchPopElem.close();
                                   this._canShowSearchResults = false;
                                   this.requestUpdate(); // important
                                   return;
                                 }
                                 searchPopElem.showAt(searchElem, true);
                                 searchPopElem.headerText = `${msg("SEARCH FOR")}: ${searchElem.value}`;
                             }}
                             @keypress=${(e) => {
                               console.log("<search-field> @keypress", e.keyCode, e);
                               let searchElem = this.shadowRoot.getElementById("search-field") as Input;
                               let searchPopElem = this.shadowRoot.getElementById("searchPopover") as Popover;
                               //let searchResultElem = this.shadowRoot.getElementById("search-result-panel") as Popover;
                               if (searchElem.value != "") {
                                 if (e.keyCode === 13) {
                                   searchPopElem.close();
                                   this._canShowSearchResults = true;
                                   this.requestUpdate(); // important
                                 } else {
                                   if (!searchPopElem.isOpen()) {
                                     searchPopElem.showAt(searchElem, true);
                                   }
                                 }
                               } else {
                                 // TODO: check if this code branch is actually useful
                                 this._canShowSearchResults = false;
                                 this.requestUpdate(); // important
                               }
                             }}
                  ></ui5-input>
                  ${this.selectedThreadHash == "" ? html`` :
                          html`<ui5-shellbar-item id="notifSettingsBtn" 
                                           icon="bell" 
                                           tooltip=${msg('Notifications Settings')} 
                                           @click=${() => {
                                             console.log("notifSettingsBtn.click()")
                                            const popover = this.shadowRoot.getElementById("notifSettingsPopover") as Popover;
                                            if (popover.isOpen()) {
                                                popover.close();
                                                return;
                                            }
                                            const shellbar = this.shadowRoot.getElementById("topicBar");
                                            popover.showAt(shellbar);
                                        }}>
                          </ui5-shellbar-item>`
                  }                  
                  <ui5-shellbar-item id="favButton" icon="favorite-list" @click=${() => {this._canShowFavorites = !this._canShowFavorites;}}></ui5-shellbar-item>
                  <ui5-shellbar-item id="cmtButton" icon="comment" @click=${() => {this._canShowComments = !this._canShowComments;}}></ui5-shellbar-item>
                  <ui5-shellbar-item id="inboxButton" icon="inbox"
                                     .count=${Object.keys(this._dvm.threadsZvm.perspective.inbox).length? Object.keys(this._dvm.threadsZvm.perspective.inbox).length : ""}
                                     @click=${() => {
                                        console.log("inboxButton.click()")
                                        const popover = this.shadowRoot.getElementById("notifPopover") as Popover;
                                        if (popover.isOpen()) {
                                            popover.close();
                                            return;
                                        }
                                        const shellbar = this.shadowRoot.getElementById("topicBar");
                                        popover.showAt(shellbar);
                                    }}>
                  </ui5-shellbar-item>
              </ui5-shellbar>

                <ui5-popover id="searchPopover" header-text="SEARCH FOR: " hide-arrow placement-type="Bottom" horizontal-align="Stretch">
                    <div class="popover-content">
                        <ui5-list mode="None" separators="None">
                            <!-- <ui5-li-groupheader class="search-group-header">${msg("message contains")}</ui5-li-groupheader>
                            <ui5-li>Channels</ui5-li>
                            <ui5-li>FIXME</ui5-li>
                            <ui5-li>FIXME</ui5-li>
                            <hr style="color:#f4f4f4"/> -->
                            <ui5-li-groupheader class="search-group-header">${msg("Search Options")}</ui5-li-groupheader>
                            <ui5-li @click=${(e) => this.addSearch("in:")}><b>in:</b> <i>thread</i></ui5-li>
                            <ui5-li @click=${(e) => this.addSearch("from:")}><b>from:</b> <i>user</i></ui5-li>
                            <ui5-li @click=${(e) => this.addSearch("mentions:")}><b>mentions:</b> <i>user</i></ui5-li>
                            <ui5-li @click=${(e) => this.addSearch("before:")}><b>before:</b> <i>date</i></ui5-li>
                            <ui5-li @click=${(e) => this.addSearch("after:")}><b>after:</b> <i>date</i></ui5-li>
                        </ui5-list>
                    </div>
                </ui5-popover>

                <ui5-popover id="notifPopover" header-text="Inbox" placement-type="Bottom" horizontal-align="Right" hide-arrow style="max-width: 500px">
                    <notification-list></notification-list>
                </ui5-popover>

                <ui5-popover id="notifSettingsPopover" placement-type="Bottom" horizontal-align="Right" hide-arrow header-text=${msg("Notification settings for this channel")}>
                    <div  style="flex-direction: column; display: flex">
                        <ui5-radio-button id="notifSettingsAll" name="GroupA" text=${msg("All Messages")} @change=${(e) => this.onNotifSettingsChange()} ?checked=${(notifSetting == NotifySettingType.AllMessages) as Boolean}><</ui5-radio-button>
                        <ui5-radio-button id="notifSettingsMentions" name="GroupA" text=${msg("Mentions & Replies Only")} @change=${(e) => this.onNotifSettingsChange()} ?checked=${(notifSetting == NotifySettingType.MentionsOnly) as Boolean}></ui5-radio-button>
                        <ui5-radio-button id="notifSettingsNever" name="GroupA" text=${msg("Never")} @change=${(e) => this.onNotifSettingsChange()} ?checked=${(notifSetting == NotifySettingType.Never) as Boolean}></ui5-radio-button>
                    </div>
                </ui5-popover>

              <div id="lowerSide">
                <div id="centerSide">
                    ${centerSide}
                    ${fileTable}
                </div>
                <div id="commentSide"
                     style="display:${this._canShowComments ? 'flex' : 'none'};">
                    <comment-thread-view id="comment-view" .threadHash=${this._selectedCommentThreadHash} showInput="true"
                                         .subjectName="${this._selectedCommentThreadSubjectName}"></comment-thread-view>
                </div>
                  <div id="favoritesSide"
                       style="display:${this._canShowFavorites ? 'flex' : 'none'};">
                      <favorites-view></favorites-view>
                  </div>
                  <!-- <peer-list></peer-list> -->
                  ${this._canShowSearchResults? html`
                  <div id="rightSide">
                      <search-result-panel .parameters=${searchParameters}></search-result-panel>
                  </div>`
                  : html``}
                  <anchor-tree id="debugSide"
                               style="display:${this._canShowDebug ? 'block' : 'none'};background:#f4d8db;"></anchor-tree>
              </div>
            </div>
        <!-- DIALOGS -->
        <ui5-dialog id="wait-dialog">
            <ui5-busy-indicator delay="0" size="Large" active style="padding-top:20px; width:100%;"></ui5-busy-indicator>
        </ui5-dialog>
        <!-- Profile Dialog/Popover -->
        <ui5-popover id="profilePop" hide-arrow allow-target-overlap placement-type="Right" style="min-width: 0px;">
            <profile-panel id="profilePanel" @edit-profile=${(e) => (this.shadowRoot.getElementById("profilePop") as Popover).close()}></profile-panel>
        </ui5-popover>
        <ui5-dialog id="profile-dialog" header-text=${msg("Edit Profile")}>
            <vines-edit-profile
                    allowCancel
                    .profile=${myProfile}
                    .saveProfileLabel= ${msg('Edit Profile')}
                    @cancel-edit-profile=${() => this.profileDialogElem.close(false)}
                    @lang-selected=${(e: CustomEvent) => setLocale(e.detail)}
                    @save-profile=${(e: CustomEvent) => this.onSaveProfile(e.detail)}
            ></vines-edit-profile>
        </ui5-dialog>
        <!-- CreateTopicDialog -->
        <ui5-dialog id="create-topic-dialog" header-text=${msg('Create Topic')}>
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
          <!-- EditTopicDialog -->
          <ui5-dialog id="edit-topic-dialog" header-text=${msg('Edit Topic')}>
              <section>
                  <div>
                      <ui5-label for="editTopicTitleInput" required>Title:</ui5-label>
                      <ui5-input id="editTopicTitleInput" @keydown=${(e) => {
                          if (e.keyCode === 13) {
                              e.preventDefault();
                              this.onEditTopic(e);
                          }
                      }}></ui5-input>
                  </div>
              </section>
              <div slot="footer">
                  <ui5-button id="createTopicDialogButton"
                              style="margin-top:5px" design="Emphasized" @click=${this.onEditTopic}>Create
                  </ui5-button>
                  <ui5-button style="margin-top:5px" @click=${() => this.editTopicDialogElem.close(false)}>Cancel
                  </ui5-button>
              </div>
          </ui5-dialog>
        <!-- CreateThreadDialog -->
        <ui5-dialog id="create-thread-dialog" header-text="Create new channel">
            <section>
                <div>
                    <ui5-label for="threadPurposeInput" required>Purpose:</ui5-label>
                    <ui5-input id="threadPurposeInput" 
                               @keydown=${async (e) => {
                                  if (e.keyCode === 13) {
                                      e.preventDefault();
                                      await this.onCreateThread(e);
                                  }
                    }}></ui5-input>
                </div>
            </section>
            <div slot="footer" style:
            "display:flex;">
            <ui5-button id="createThreadDialogButton" style="margin-top:5px" design="Emphasized"
                        @click=${async (e) => await this.onCreateThread(e)} >Create
            </ui5-button>
            <ui5-button style="margin-top:5px" @click=${(e) => this.createThreadDialogElem.close(false)}>Cancel
            </ui5-button>
            </div>
        </ui5-dialog>
    `;
  }


  private importDvm(canPublish: boolean) {
    console.log("importDvm()");
    //console.log("<store-dialog> localOnly", localOnly, this._localOnly);
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = ".json";
    input.onchange = async (e:any) => {
      console.log("onImport() target download file", e);
      const file = e.target.files[0];
      if (!file) {
        console.error("No file selected");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const contents = reader.result as string;
        //console.log(contents);
        this._dvm.importPerspective(contents, canPublish);
      };
      // Read the file as text
      reader.readAsText(file);
    }
    input.click();
  }


  /** */
  private openFile() {
    console.log("<vines-page>.openFile()");
    var input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e:any) => {
      console.log("<vines-page> target download file", e);
      const file = e.target.files[0];
      if (file.size > this._filesDvm.dnaProperties.maxParcelSize) {
        toasty(`Error: File is too big ${prettyFileSize(file.size)}. Maximum file size: ${prettyFileSize(this._filesDvm.dnaProperties.maxParcelSize)}`);
        return;
      }
      const splitObj = await splitFile(file, this._filesDvm.dnaProperties.maxChunkSize);
      const maybeSplitObj = await this._filesDvm.startPublishFile(file, []/*this._selectedTags*/, (_manifestEh) => {
        toasty(msg("File successfully shared") +": " + splitObj.dataHash);
        this.requestUpdate();
      });
      if (!maybeSplitObj) {
        toasty(msg("Error: File already shared to group or stored locally"));
      }
    }
    input.click();
  }


  /** */
  async onGroupMenu(e): Promise<void> {
    console.log("onGroupMenu item-click", e)
    switch (e.detail.item.id) {
      case "createTopic": this.createTopicDialogElem.show(); break;
      case "viewArchived": this.onShowArchiveTopicsBtn(e); break;
      case "markAllRead": this.onCommitBtn(e); break;
    }
  }



  /** */
  async onSettingsMenu(e): Promise<void> {
    console.log("item-click", e);
    this.waitDialogElem.show();
    let content = "";
    switch (e.detail.item.id) {
      case "uploadFileItem": this.openFile(); break;
      case "editProfileItem": this.profileDialogElem.show(); break;
      case "exportAllItem":
        if (content == "") content = await this._dvm.exportAllPerspective();
      case "exportItem":
        const files_json = await this._filesDvm.exportPerspective();
        this.downloadTextFile("dump_files.json", files_json);
        if (content == "") content = this._dvm.exportPerspective();
        this.downloadTextFile("dump_threads.json", content);
        toasty(`Exported data to json in Downloads folder`);
        break;
      case "importCommitItem": this.importDvm(true); break;
      case "importOnlyItem": this.importDvm(false); break;
      case "bugItem": window.open(`https://github.com/lightningrodlabs/threads/issues/new`, '_blank'); break;
      case "dumpItem": this._dvm.dumpLogs(); break;
      case "dumpNetworkItem": this.dispatchEvent(new CustomEvent('dumpNetworkLogs', {detail: null, bubbles: true, composed: true})); break;
    }
    this.waitDialogElem.close();
  }


  /** */
  async refresh(_e?: any) {
    await this._dvm.threadsZvm.probeInbox();
    console.log("Inbox:", Object.keys(this._dvm.threadsZvm.perspective.inbox).length);
    // const mentionsList = this.shadowRoot.getElementById("mentionsList") as MentionsList;
    // mentionsList.requestUpdate();
  }


  /** */
  async onCommitBtn(_e?: any) {
    toasty("All marked 'read' & cleared Inbox");
    await this._dvm.threadsZvm.commitAllProbeLogs();
    await this._dvm.threadsZvm.flushInbox();
    //const semTopic = this.shadowRoot.getElementById("topicusView") as SemanticTopicsView;
    //semTopic.requestUpdate();
  }


  /** */
  onShowArchiveTopicsBtn(_e?: any) {
    this._canViewArchivedSubjects = !this._canViewArchivedSubjects;
  }



  /** */
  static get styles() {
    return [
      css`
        :host {
          background: #FBFCFD;
          display: block;
          height: 100vh;
          width: 100vw;
        }

        abbr {
          text-decoration: none;
        }

        #profile-div:hover {
          background: rgba(214, 226, 245, 0.8);
          outline: 1px solid darkblue;
        }

        .reply-info {
          background: #b4c4be;
          margin: 0px 10px -9px 10px;
          padding: 5px;
          border: 1px solid black;
        }

        .reply-to-div {
          flex-direction: row;
          background: rgb(208, 208, 208);
          margin: 0px 12px -4px;
          border-radius: 12px;
          font-size: smaller;
          padding-left: 5px;
          align-items: center;
          color: #202020;
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
          /*background: #B9CCE7;*/
          width: 275px;
          min-width: 275px;
          max-width: 275px;
          display: flex;
          flex-direction: column;
          /*gap:15px;*/
        }

        #profilePop::part(content) {
          padding: 0px;
        }
        
        #profile-row {
          display: flex;
          flex-direction: row;
          padding-right: 5px;
          background: #e8e8e8;
          /*background: white;*/
          /*box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;*/
        }

        #mainSide {
          overflow: auto;
          display: flex;
          flex-grow:1;
          flex-direction: column;
          z-index: 1;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;
        }

        #lowerSide {
          display: flex;
          flex-direction: row;
          flex-grow: 1;
          overflow-y: auto;
        }

        #centerSide {
          flex-grow: 1;
          overflow: auto;
          display: flex;
          flex-direction: column;
          background: #FBFCFD;          
        }

        .shellbtn {
          color: #464646;
        }
        .shellbtn:hover {
          background: #e6e6e6;
        }

        #topicBar::part(root) {
          /*border: 1px solid dimgray;*/
          /*color:black;*/
          /*background: rgb(94, 120, 200);*/
          background: white;
          padding-left: 2px;
          border-radius:5px;
          /*box-shadow: rgba(30, 30, 30, 0.17) 2px 10px 10px;*/
          box-shadow: rgba(0, 0, 0, 0.2) 0px 8px 30px 0px;
        }


        #favoritesSide {
          flex-direction:column;
          min-width: 350px;
          max-width: 350px;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;
        }
        #rightSide {
          width: 500px;
          background: #eaeaea;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;
        }

        #commentSide {
          flex-direction: column;
          min-width: 350px;
          max-width: 350px;
          background: #d8e4f4;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;

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

        #uploadCard {
          margin: auto;
          /*margin-left:10px;*/
          min-width: 350px;
          width: 90%;
          padding: 5px;
          display: flex;
          flex-direction: column;
          border: 1px solid black;
          background: beige;
        }

        #group-div {
          display: flex;
          flex-direction: row;
          cursor:pointer;
          background: none;
          padding-right: 7px;
        }

        #dna-select {
          width:auto;
          border:none;
          margin:0px 1px 0px 1px;
          background: none;
          padding-left: 5px;
          padding-right: 7px;
          margin-top:15px;
          margin-bottom:15px;
        }

        #group-div:hover,
        #dna-select:hover {
          /*background:red;*/
          /*font-weight: bold;*/
          z-index:0;
          /*box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;*/
          background: rgba(214, 226, 245, 0.8);
          /*outline: 1px solid darkblue;*/
        }
        .popover-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          margin-top: -20px;
          margin-left: -12px;
        }

        .flex-column {
          display: flex;
          flex-direction: column;
        }

        .popover-footer {
          display: flex;
          justify-content: flex-end;
          width: 100%;
          align-items: center;
          padding: 0.5rem 0;
        }

        .search-group-header {
          text-transform: uppercase;
          padding-top: 0px;
        }

        vines-input-bar {
          margin: 3px 10px 10px 10px;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;
          border-radius: 20px;
        }

      `,

    ];
  }
}
