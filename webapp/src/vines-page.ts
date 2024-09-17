import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {
  ActionId,
  delay,
  DnaElement,
  DnaId,
  EntryId,
  HappBuildModeType,
  HoloHashType,
  intoDhtId,
  isHashTypeB64
} from "@ddd-qc/lit-happ";
import QRCode from 'qrcode'

import "@ddd-qc/path-explorer";

/** @ui5/webcomponents-fiori */
import "@ui5/webcomponents-fiori/dist/NotificationListItem.js";
import "@ui5/webcomponents-fiori/dist/NotificationAction.js";
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
import "@ui5/webcomponents/dist/SegmentedButton.js";
import "@ui5/webcomponents/dist/SegmentedButtonItem.js";
import "@ui5/webcomponents/dist/StandardListItem.js";
import "@ui5/webcomponents/dist/Switch.js";
import "@ui5/webcomponents/dist/SuggestionItem.js";
import "@ui5/webcomponents/dist/Toast.js";
import "@ui5/webcomponents/dist/Token.js"
import "@ui5/webcomponents/dist/Tree.js"
import "@ui5/webcomponents/dist/TreeItem.js";
import "@ui5/webcomponents/dist/TreeItemCustom.js";

import Dialog from "@ui5/webcomponents/dist/Dialog";
import Popover from "@ui5/webcomponents/dist/Popover";
import Input from "@ui5/webcomponents/dist/Input";
import Menu from "@ui5/webcomponents/dist/Menu";
import Button from "@ui5/webcomponents/dist/Button";
import RadioButton from "@ui5/webcomponents/dist/RadioButton";
import SegmentedButtonItem from "@ui5/webcomponents/dist/SegmentedButtonItem";

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
import "@ui5/webcomponents-icons/dist/bell.js"
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
import "@ui5/webcomponents-icons/dist/menu2.js"
import "@ui5/webcomponents-icons/dist/message-success.js"
import "@ui5/webcomponents-icons/dist/marketing-campaign.js"
import "@ui5/webcomponents-icons/dist/navigation-down-arrow.js"
import "@ui5/webcomponents-icons/dist/nav-back.js"
import "@ui5/webcomponents-icons/dist/number-sign.js"
import "@ui5/webcomponents-icons/dist/open-command-field.js"
import "@ui5/webcomponents-icons/dist/org-chart.js"
import "@ui5/webcomponents-icons/dist/open-folder.js"
import "@ui5/webcomponents-icons/dist/overflow.js"
import "@ui5/webcomponents-icons/dist/paper-plane.js"
import "@ui5/webcomponents-icons/dist/person-placeholder.js"
import "@ui5/webcomponents-icons/dist/process.js"
import "@ui5/webcomponents-icons/dist/product.js"
import "@ui5/webcomponents-icons/dist/pdf-attachment.js"
import "@ui5/webcomponents-icons/dist/response.js"
import "@ui5/webcomponents-icons/dist/save.js"
import "@ui5/webcomponents-icons/dist/search.js"
import "@ui5/webcomponents-icons/dist/share-2.js"
import "@ui5/webcomponents-icons/dist/sys-add.js"
import "@ui5/webcomponents-icons/dist/show.js"
import "@ui5/webcomponents-icons/dist/synchronize.js"
import "@ui5/webcomponents-icons/dist/thing-type.js"
import "@ui5/webcomponents-icons/dist/user-edit.js"
import "@ui5/webcomponents-icons/dist/upload-to-cloud.js"
import "@ui5/webcomponents-icons/dist/unfavorite.js"
import "@ui5/webcomponents-icons/dist/warning.js"
import "@ui5/webcomponents-icons/dist/workflow-tasks.js"

/**  */
import {AgentId, Dictionary, LinkableId} from "@ddd-qc/cell-proxy";

import '@vaadin/grid/theme/lumo/vaadin-grid.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-selection-column.js';

import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";

import 'css-doodle';

import {SlDialog} from "@shoelace-style/shoelace";


import {
  beadJumpEvent,
  ChatThreadView,
  CommentRequest,
  CommentThreadView,
  ConfirmDialog,
  doodle_flowers,
  EditTopicRequest, FavoritesEvent, favoritesJumpEvent,
  filesContext,
  getThisAppletId,
  HideEvent,
  InputBar,
  JumpDestinationType,
  JumpEvent,
  NotifySetting,
  onlineLoadedContext,
  parseSearchInput,
  ParticipationProtocol,
  ProfilePanel,
  searchFieldStyleTemplate,
  ShowProfileEvent,
  SpecialSubjectType,
  Subject,
  THIS_APPLET_ID,
  threadJumpEvent,
  ThreadsDnaPerspective,
  ThreadsDvm,
  ThreadsEntryType,
  ThreadsPerspective,
  toasty,
  ViewEmbedDialog,
  ViewEmbedEvent,
  VinesInputEvent,
  weaveUrlToWal,
  weClientContext,
} from "@vines/elements";

import {WeServicesEx, wrapPathInSvg} from "@ddd-qc/we-utils";


import {NetworkInfo, Timestamp,} from "@holochain/client";

import {FrameNotification, GroupProfile, WAL, weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {consume} from "@lit/context";

import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm";
import {FileTableItem} from "@ddd-qc/files/dist/elements/file-table";
import {FilesDvm, prettyFileSize, splitFile, SplitObject} from "@ddd-qc/files";
import {StoreDialog} from "@ddd-qc/files/dist/elements/store-dialog";
import {HAPP_BUILD_MODE} from "@ddd-qc/lit-happ/dist/globals";
import {msg} from "@lit/localize";
import {setLocale} from "./localization";
import {composeNotificationTitle, renderAvatar} from "@vines/elements/dist/render";
import {mdiInformationOutline} from "@mdi/js";
import {CellIdStr} from "@ddd-qc/cell-proxy/dist/types";
import {AnyBeadMat} from "@vines/elements/dist/viewModels/threads.materialize";


// HACK: For some reason hc-sandbox gives the dna name as cell name instead of the role name...
const FILES_CELL_NAME = HAPP_BUILD_MODE == HappBuildModeType.Debug? 'dFiles' : 'rFiles';
console.log("<vines-page> FILES_CELL_NAME", FILES_CELL_NAME);


/**
 * @element
 */
@customElement("vines-page")
export class VinesPage extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    this.addEventListener('beforeunload', (e:any) => {
      console.log("<vines-page> beforeunload", e);
      // await this._dvm.threadsZvm.commitSearchLogs();
    });
  }

  /** -- Properties -- */

  @property() multi: boolean = false;

  @property({type: ActionId}) selectedThreadHash: ActionId | undefined = undefined;
  @property() selectedBeadAh: ActionId | undefined = undefined;

  @property({type: Object})
  networkInfoLogs: Record<CellIdStr, [Timestamp, NetworkInfo][]> = {};

  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({ context: filesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;

  @state() private _viewFileEh?: EntryId;

  @state() private _selectedCommentThreadHash?: LinkableId;
           private _selectedCommentThreadSubjectName: string = '';
  @state() private _createTopicHash: EntryId | undefined = undefined;

  @state() private _canShowComments = false;
  @state() private _canShowFavorites = false;
  @state() private _canShowSearchResults = false;
  @state() private _canShowDebug = false;
  @state() private _listerToShow: string | null = null;
  @state() private _canShowLeft = true;
  @state() private _canShowSearch = false;

  @state() private _canViewArchivedSubjects = false;
  @state() private _currentCommentRequest: CommentRequest | undefined = undefined;

  @state() private _splitObj: SplitObject | undefined = undefined;

  @state() private _replyToAh: ActionId | undefined = undefined;
  @state() private _hideFiles = true;

  private _lastKnownNotificationIndex = 0;

  @state() private _selectedAgent: AgentId | undefined = undefined; // for cross-view

  /** -- Getters -- */

  get createTopicDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("create-topic-dialog") as Dialog;
  }
  get editTopicDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("edit-topic-dialog") as Dialog;
  }

  get createThreadDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("create-thread-dialog") as Dialog;
  }

  get profileDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("profile-dialog") as Dialog;
  }

  get waitDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("wait-dialog") as Dialog;
  }


  /** -- Methods -- */

  /** Handle 'jump' event */
  override connectedCallback() {
    super.connectedCallback();
    // @ts-ignore
    this.addEventListener('popstate', this.onPopState);
    // @ts-ignore
    this.addEventListener('jump', this.onJump);
    // @ts-ignore
    this.addEventListener('show-profile', this.onShowProfile);
    this.addEventListener('edit-profile', this.onEditProfile);
    // @ts-ignore
    this.addEventListener('archive', this.onArchive);
    // @ts-ignore
    this.addEventListener('view-embed', this.onViewEmbed);
    // @ts-ignore
    this.addEventListener('favorites', this.onFavorites);

  }
  override disconnectedCallback() {
    super.disconnectedCallback();
    // @ts-ignore
    this.removeEventListener('popstate', this.onPopState);
    // @ts-ignore
    this.removeEventListener('jump', this.onJump);
    this.removeEventListener('edit-profile', this.onEditProfile);
    // @ts-ignore
    this.removeEventListener('show-profile', this.onShowProfile);
    // @ts-ignore
    this.removeEventListener('archive', this.onArchive);
    // @ts-ignore
    this.removeEventListener('view-embed', this.onViewEmbed);
    // @ts-ignore
    this.removeEventListener('favorites', this.onFavorites);
  }


  /** */
  getDeepestElemAt(x: number, y: number): HTMLElement {
    const elem = this.shadowRoot!.elementFromPoint(x, y) as HTMLElement;
    let shadow: HTMLElement = elem;
    let shadower: HTMLElement | undefined = undefined;
    do {
      shadower = undefined;
      if (shadow.shadowRoot) {
        shadower = shadow.shadowRoot!.elementFromPoint(x, y) as HTMLElement;
      }
      if (shadower) {
        shadow = shadower;
      }
    } while(shadower);
    return shadow;
  }


  /** */
  async onViewEmbed(e: CustomEvent<ViewEmbedEvent>) {
    const dialog = this.shadowRoot!.getElementById("view-embed") as ViewEmbedDialog;
    dialog.open(e.detail.blobUrl, e.detail.mime);
  }


  /** */
  async onArchive(e: CustomEvent<HideEvent>) {
    const verb = e.detail.hide? msg("Archive") : msg("Unarchive");
    const dialog = this.shadowRoot!.getElementById("confirm-hide-topic") as ConfirmDialog;
    /** DM */
    if (e.detail.address.hashType == HoloHashType.Agent) {
      const agentId = new AgentId(e.detail.address.b64)
      dialog.title = verb + " " + msg("DM channel") + "?";
      this.addEventListener('confirmed', async (_f) => {
        if (e.detail.hide) {
          await this._dvm.threadsZvm.hideDmThread(agentId);
          toasty(msg(`DM channel archived`));
        } else {
          await this._dvm.threadsZvm.unhideDmThread(agentId);
          toasty(msg("DM channel unarchived"));
        }
      });
      dialog.open();
      return;
    }
    /** Topic or Channel */
    const dhtId = intoDhtId(e.detail.address.b64);
    const type = e.detail.address.hashType == HoloHashType.Entry? msg("Topic") : msg("Channel");
    dialog.title = `${verb} ${type}?`;
    this.addEventListener('confirmed', async (_f) => {
      if (e.detail.hide) {
        await this._dvm.threadsZvm.hideSubject(dhtId);
        toasty(`${type} ${msg("archived")}`);
      } else {
        await this._dvm.threadsZvm.unhideSubject(dhtId);
        toasty(`${type} ${msg("Unarchived")}`);
      }
    });
    dialog.open();
  }


  /** */
  onShowProfile(e: CustomEvent<ShowProfileEvent>) {
    console.log("onShowProfile()", e.detail)
    const elem = this.getDeepestElemAt(e.detail.x, e.detail.y);
    //console.log("onShowProfile() elem", elem)
    const popover = this.shadowRoot!.getElementById("profilePop") as Popover;
    const sub = this.shadowRoot!.getElementById("profilePanel") as ProfilePanel;
    sub.hash = e.detail.agentId;
    sub.requestUpdate();
    popover.showAt(elem);
  }


  /** */
  onEditProfile(_e:any) {
    this.profileDialogElem.show();
  }



  /** -- Update -- */

  /** */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<vines-page>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    this.selectedThreadHash = undefined;
    this.selectedBeadAh = undefined;
    this._listerToShow = newDvm.cell.address.dnaId.b64;
  }


  /** -- Update -- */

  /** */
  async onCreateTopic(_e:any) {
    const input = this.shadowRoot!.getElementById("topicTitleInput") as HTMLInputElement;
    const name = input.value.trim();
    await this._dvm.threadsZvm.publishSemanticTopic(name);
    //console.log("onCreateList() res:", res)
    input.value = "";
    this.createTopicDialogElem.close();
  }


  /** */
  async onEditTopic(_e:any) {
    const input = this.shadowRoot!.getElementById("editTopicTitleInput") as HTMLInputElement;
    const name = input.value.trim();
    const topicHash = this.editTopicDialogElem.getAttribute('TopicHash');
    if (!topicHash) {
      throw Promise.reject("Missing TopicHash attribute");
    }
    await this._dvm.editSemanticTopic(new EntryId(topicHash), name);
    //console.log("onCreateList() res:", res)
    input.value = "";
    this.editTopicDialogElem.close();
  }


  /** */
  async onCreateThread(_e:any) {
    const input = this.shadowRoot!.getElementById("threadPurposeInput") as HTMLInputElement;
    const name = input.value.trim();
    if (name.length < 1) {
      return;
    }
    if (!this._createTopicHash) {
      console.warn("Missing topic hash");
      return;
    }
    const [_ts, ppAh] = await this._dvm.threadsZvm.publishThreadFromSemanticTopic(
      this.weServices? new EntryId(this.weServices.appletIds[0]!) : THIS_APPLET_ID,
      this._createTopicHash,
      name,
    );
    input.value = "";
    this.dispatchEvent(threadJumpEvent(ppAh));
    this.createThreadDialogElem.close(false);
  }


  /** */
  async onCreateTextMessage(inputText: string) {
    console.log("onCreateTextMessage", inputText, this._dvm.profilesZvm)
    let ppAh = this.selectedThreadHash;
    if (this._currentCommentRequest) {
      ppAh = await this.publishCommentThread(this._currentCommentRequest);
      this._currentCommentRequest = undefined;
    }
    if (!ppAh) {
      console.error("No thread selected");
      return;
    }
    let ah = await this._dvm.publishMessage(ThreadsEntryType.TextBead, inputText, ppAh, undefined, this._replyToAh, this.weServices);
    console.log("onCreateTextMessage() ah", ah, this._replyToAh);
  }


  /** */
  async onDmTextMessage(inputText: string) {
    console.log("onDmTextMessage()", inputText, this._dvm.profilesZvm)
    const sub = this.shadowRoot!.getElementById("profilePanel") as ProfilePanel;
    const otherAgent: AgentId = sub.hash;
    console.log("onDmTextMessage() otherAgent", otherAgent)
    let beadAh = await this._dvm.publishDm(otherAgent, ThreadsEntryType.TextBead, inputText, undefined, this.weServices);
    console.log("onDmTextMessage() beadAh", beadAh, this._dvm.threadsZvm.perspective.threads);
    this._replyToAh = undefined;
    this.selectedBeadAh = undefined;
    //await delay(1000);
    this.dispatchEvent(beadJumpEvent(beadAh));
  }


  /** */
  async onCreateHrlMessage(wal: WAL) {
    if (!wal || !this.selectedThreadHash) {
      return;
    }
    console.log("onCreateHrlMessage()", weaveUrlFromWal(wal));
    //const entryInfo = await this.weServices.entryInfo(maybeHrl.hrl);
    // TODO: make sure hrl is an entryHash
    let ah = await this._dvm.publishMessage(ThreadsEntryType.AnyBead, wal, this.selectedThreadHash, undefined, this._replyToAh, this.weServices);
    console.log("onCreateHrlMessage() ah", ah);
  }


  /** */
  async onCreateSemanticTopic(topic: string) {
    await this._dvm.threadsZvm.publishSemanticTopic(topic);
  }


  /** After first render only */
  override async firstUpdated() {
    console.log("<vines-page> firstUpdated()", this._dvm.threadsZvm.perspective.globalProbeLogTs);

    /** Generate test data */
    //await this._dvm.threadsZvm.generateTestData("");

    /** If no global commit log ; commit first one */
    if (!this._dvm.threadsZvm.perspective.globalProbeLogTs) {
      console.log("<vines-page> Calling commitFirstGlobalLog()");
      await this._dvm.threadsZvm.zomeProxy.commitFirstGlobalLog();
    }

    /** Do it here instead of in probeAll() because this can commit an entry */
    await this._dvm.threadsZvm.probeAllLatest();

    /** Select Topics */
    const topicsBtn = this.shadowRoot!.getElementById("topics-option") as SegmentedButtonItem;
    if (topicsBtn) {
      topicsBtn.pressed = true;
    }

    /** Fiddle with shadow parts CSS */
    const searchField = this.shadowRoot!.getElementById('search-field') as Input;
    console.log("search-field", searchField,searchField.shadowRoot);
    if (searchField) {
      searchField.shadowRoot!.appendChild(searchFieldStyleTemplate.content.cloneNode(true));
      this.requestUpdate();
    }
    /** Grab all AppletIds & GroupProfiles */
    if (this.weServices) {
      console.log("<vines-page> firstUpdated() calling pullAppletIds()", this.weServices);
      const appletIds = await this._dvm.threadsZvm.pullAppletIds();
      console.log("<vines-page> firstUpdated() appletIds", appletIds);
      for (const appletId of appletIds) {
        /* const _appletInfo = */ await this.weServices.cacheFullAppletInfo(appletId);
      }
      /** notifyFrame of some new content */
      const allCount = this._dvm.threadsZvm.perspective.unreadThreads.size + this._dvm.threadsZvm.perspective.newThreads.size;
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


  /** */
  protected override async updated(_changedProperties: PropertyValues) {
    /** ??? */
    try {
      const chatView = this.shadowRoot!.getElementById("chat-view") as ChatThreadView;
      const view = await chatView.updateComplete;
      //console.log("ChatView.parent.updated() ", view, chatView.scrollTop, chatView.scrollHeight, chatView.clientHeight)
      if (!view) {
        /** Request a new update for scrolling to work */
        chatView.requestUpdate();
      }
    } catch(e:any) {
      /** i.e. element not present */
    }


    /** Grab AssetInfo for all AnyBeads */
    for (const [beadInfo, typed] of this.threadsPerspective.beads.values()) {
      if (beadInfo.beadType != ThreadsEntryType.AnyBead) {
        continue;
      }
      const anyBead = typed as AnyBeadMat;
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
      console.log("<vines-pages> signaledNotifications", notif.author, notif);
      const maybeProfile = this._dvm.profilesZvm.perspective.getProfile(notif.author);
      const author =  maybeProfile? maybeProfile.nickname : "unknown";
      const canPopup = !notif.author.equals(this.cell.address.agentId) || HAPP_BUILD_MODE == HappBuildModeType.Debug;
      const [notifTitle, notifBody, jump] = composeNotificationTitle(notif, this._dvm.threadsZvm, this._filesDvm, this.weServices);
      let message = `${msg("from")} @${author}.` ;
      if (notifBody != "") {
        message = `"${notifBody}" ${msg("from")} @${author}.`;
      }
      /** in-app toast */
      if (canPopup) {
        toasty(notifTitle + " " + message, jump, this);
      }
      /** Weave Notification */
      if (this.weServices) {
        const myNotif: FrameNotification = {
          title: notifTitle,
          body: message,
          notification_type: notif.event,
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
    const avatar = profile.fields['avatar'];
    await this.setMyProfile(profile.nickname, avatar, color);
  }


  /** */
  async setMyProfile(nickname: string, avatar?: string, color?: string) {
    console.log("updateProfile() called:", nickname)
    const fields: Dictionary<string> = {};
    if (color) fields['color'] = color;
    if (avatar) fields['avatar'] = avatar;
    try {
      if (this._dvm.profilesZvm.perspective.getProfile(this._dvm.cell.address.agentId)) {
        await this._dvm.profilesZvm.updateMyProfile({nickname, fields});
      } else {
        await this._dvm.profilesZvm.createMyProfile({nickname, fields});
      }
    } catch (e:any) {
      console.log("createMyProfile() failed");
      console.log(e);
    }
  }


  /** */
  private async onSaveProfile(profile: ProfileMat) {
    console.log("onSaveProfile()", profile)
    try {
      await this._dvm.profilesZvm.updateMyProfile(profile);
    } catch(e:any) {
      await this._dvm.profilesZvm.createMyProfile(profile);
    }
    this.profileDialogElem.close(false);
    this.requestUpdate();
  }


  /** */
  async pingActiveOthers() {
    console.log("Pinging All Active");
    const currentPeers = this._dvm.allCurrentOthers(this._dvm.profilesZvm.perspective.agents);
    await this._dvm.pingPeers(null, currentPeers);
  }


  /** */
  async pingAllOthers() {
    const agents = this._dvm.profilesZvm.perspective.agents.filter((agentKey: AgentId) => !agentKey.equals(this.cell.address.agentId));
    console.log("Pinging All Others", agents);
    await this._dvm.pingPeers(null, agents);
  }


  /** */
  async onEditTopicClicked(e: CustomEvent<EditTopicRequest>) {
    console.log("onEditTopicClicked()", e.detail);
    const request = e.detail;
    const input = this.shadowRoot!.getElementById("editTopicTitleInput") as HTMLInputElement;
    input.value = request.subjectName;
    this.editTopicDialogElem.setAttribute('topicHash', request.topicHash.b64);
    this.editTopicDialogElem.open = true;
  }


  /** */
  async onReplyClicked(e: CustomEvent<ActionId>) {
    console.log("onReplyClicked()", e.detail);
    const beadAh = e.detail;
    const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
    this._replyToAh = beadAh;
    if (inputBar) {
      inputBar.focusInput();
    }
  }


  /** */
  async showSideCommentThread(commentThreadAh: ActionId, subjectName: string) {
    /** Save input field before switching */
    if (this._selectedCommentThreadHash && this._canShowComments) {
      const commentView = this.shadowRoot!.getElementById("comment-view") as CommentThreadView;
      if (commentView) {
        this._dvm.perspective.threadInputs.set(new ActionId(this._selectedCommentThreadHash.b64), commentView.value);
      }
    }
    /** */
    this._canShowComments = true;
    this._selectedCommentThreadHash = commentThreadAh;
    this._selectedCommentThreadSubjectName = subjectName;
  }


  /** */
  async onCommentingClicked(e: CustomEvent<CommentRequest>) {
    console.log("onCommentingClicked()", e.detail);
    const request = e.detail;

    if (request.viewType == "side") {
      if (!request.maybeCommentThread) {
        request.maybeCommentThread = await this.publishCommentThread(request);
      }
      await this.showSideCommentThread(request.maybeCommentThread, request.subjectName);
      return;
    }
    /** Main */
    if (!request.maybeCommentThread) {
      this._currentCommentRequest = request;
      return;
    }
  }


  /** */
  async publishCommentThread(request: CommentRequest) {
    const subject: Subject = {
        address: request.subjectId.b64,
        typeName: request.subjectType,
        appletId: getThisAppletId(this.weServices),
        dnaHashB64: this.cell.address.dnaId.b64,
    };
    const pp: ParticipationProtocol = {
        purpose: "comment",
        rules: "N/A",
        subject,
        subject_name: request.subjectName,
    };
    const [_ts, ppAh] = await this._dvm.threadsZvm.publishParticipationProtocol(pp);
    return ppAh;
  }


  /** */
  onListerSelected(id: string) {
    console.log("onListerSelected()", id);
    //const selectedOption = e.detail.selectedItem;
    //console.log("onListerSelected() selectedOption", selectedOption);
    if (id == "dm-option") {
      this._listerToShow = this.cell.address.agentId.b64;
      return;
    }
    if (id == "mine-option") {
      this._listerToShow = null;
      return;
    }
    if (id == "tools-option") {
      this._listerToShow = "__tools__";
      return;
    }
    if (id == "topics-option") {
      this._listerToShow = this.cell.address.dnaId.b64;
      return;
    }
    // if (selectedOption.id == "this-app-option" /*|| (this.weServices && selectedOption.id == this.weServices.appletId)*/) {
    //   this._listerToShow = THIS_APPLET_ID.b64;
    //   return;
    // }
    /* it's an appletId so display the applet lister */
    this._listerToShow = id;
    this.requestUpdate();
  }


  /** */
  async onCreateFileMessage(ppAh: ActionId, file: File) {
    console.log("onCreateFileMessage()", file.name, this._filesDvm);
    this._splitObj = await this._filesDvm.startPublishFile(file, [], this._dvm.profilesZvm.perspective.agents, async (eh) => {
      console.debug("<vines-page> startPublishFile callback", eh);
      let ah = await this._dvm.publishMessage(ThreadsEntryType.EntryBead, eh, ppAh, undefined, this._replyToAh, this.weServices);
      console.debug("onCreateFileMessage() ah", ah);
      this._splitObj = undefined;
    });
    console.debug("onCreateFileMessage()", this._splitObj);
  }


  // /** */
  // async onPopState(e: CustomEvent<PopStateEvent>) {
  //   console.log("onPopState()", e);
  // }


  /** */
  async onFavorites(e: CustomEvent<FavoritesEvent>) {
    if (e.detail.canAdd) {
      await this._dvm.threadsZvm.addFavorite(e.detail.beadAh);
      toasty(msg("Message added to favorites"), favoritesJumpEvent(), this);
    } else {
      await this._dvm.threadsZvm.removeFavorite(e.detail.beadAh);
      toasty(msg("Message removed from favorites"), favoritesJumpEvent(), this);
    }
  }


  /** */
  async onJump(e: CustomEvent<JumpEvent>) {
    console.log("<vines-page>.onJump()", e.detail, this.selectedThreadHash);
    const maybePrevThreadId = this.selectedThreadHash; // this.selectedThreadHash can change value during this function call (changed by other functions handling events I guess).
    this._replyToAh = undefined;
    this._selectedAgent = undefined;
    this._canShowFavorites = false;

    if (e.detail.type == JumpDestinationType.Favorites) {
      this._canShowFavorites = true;
    }
    /** */
    if (e.detail.type == JumpDestinationType.Thread || e.detail.type == JumpDestinationType.Bead || e.detail.type == JumpDestinationType.Dm) {
      if (e.detail.agent) {
        this._selectedAgent = e.detail.agent;
      }
      /** set lastProbeTime for current thread */
      if (maybePrevThreadId) {
        await this._dvm.threadsZvm.commitThreadProbeLog(maybePrevThreadId);
        /** Clear notifications on prevThread */
        const prevThreadNotifs = this._dvm.threadsZvm.perspective.getAllNotificationsForPp(maybePrevThreadId);
        for (const [linkAh, _notif] of prevThreadNotifs) {
          await this._dvm.threadsZvm.deleteNotification(linkAh);
        }
        /** Cache and reset input-bar */
        const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
        if (inputBar) {
          this._dvm.perspective.threadInputs.set(maybePrevThreadId, inputBar.value);
          inputBar.setValue("");
          // console.log("onJump() inputBar cached", this._dvm.perspective.threadInputs[prevThreadHash], prevThreadHash);
        }
      }
    }
    /** Close any opened popover */
    const popover = this.shadowRoot!.getElementById("notifPopover") as Popover;
    if (popover.isOpen()) {
      popover.close();
    }
    const pop = this.shadowRoot!.getElementById("notifSettingsPopover") as Popover;
    if (pop.isOpen()) {
      pop.close();
    }
    const searchPopElem = this.shadowRoot!.getElementById("searchPopover") as Popover;
    if (searchPopElem.isOpen()) {
      searchPopElem.close();
    }
    const profilePopElem = this.shadowRoot!.getElementById("profilePop") as Popover;
    if (profilePopElem.isOpen()) {
      profilePopElem.close();
    }
  }


  /** */
  onNotifSettingsChange() {
    console.log("onNotifSettingsChange()");
    if (!this.selectedThreadHash) {
      console.error("onNotifSettingsChange() failed. No thread selected")
      return;
    }
    const allRadio = this.shadowRoot!.getElementById("notifSettingsAll") as RadioButton;
    const mentionRadio = this.shadowRoot!.getElementById("notifSettingsMentions") as RadioButton;
    const neverRadio = this.shadowRoot!.getElementById("notifSettingsNever") as RadioButton;
    if (allRadio.checked) {
      this._dvm.threadsZvm.publishNotifSetting(this.selectedThreadHash, NotifySetting.AllMessages);
      //console.log("notifSetting checked", NotifySettingType.AllMessages);
      return;
    }
    if (mentionRadio.checked) {
      this._dvm.threadsZvm.publishNotifSetting(this.selectedThreadHash, NotifySetting.MentionsOnly);
      //console.log("notifSetting checked", NotifySettingType.MentionsOnly);
      return;
    }
    if (neverRadio.checked) {
      this._dvm.threadsZvm.publishNotifSetting(this.selectedThreadHash, NotifySetting.Never);
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
    const field = this.shadowRoot!.getElementById("search-field") as Input;
    let ws = "";
    if (field.value.length > 0 && field.value[field.value.length - 1] != " ") {
      ws = " "
    }
    field.value += ws + str;
    field.focus();
  }



  /** */
  override render() {
    console.log("<vines-page>.render()", this.onlineLoaded, this.selectedThreadHash, this._splitObj, /*this._dvm.profilesZvm,*/ this._dvm.threadsZvm.perspective);
    //console.log("<vines-page>.render() jump", this.perspective.threadInputs[this.selectedThreadHash], this.selectedThreadHash);

    let uploadState;
    if (this._splitObj) {
      uploadState = this._filesDvm.perspective.uploadStates[this._splitObj.dataHash];
    }

    /** */
    let primaryTitle = msg("No channel selected");
    let centerSide = html`${doodle_flowers}`;
    if (this._canShowFavorites) {
      centerSide = html`<favorites-view></favorites-view>`
      primaryTitle = msg("Favorites");
    }

    /** render selected thread */
    if (this.selectedThreadHash && !this._canShowFavorites) {
      const thread = this.threadsPerspective.threads.get(this.selectedThreadHash);
      if (!thread) {
        console.log("<vines-page>.render() fetchPp WARNING");
        /*await*/ this._dvm.threadsZvm.fetchPp(this.selectedThreadHash);
      } else {
        primaryTitle = thread.name;
        const dmThread = this._dvm.threadsZvm.isThreadDm(this.selectedThreadHash);
        if (dmThread) {
          console.log("<vines-page>.render() dmThread", dmThread);
          const profile = this._dvm.profilesZvm.perspective.getProfile(dmThread);
          primaryTitle = profile ? profile.nickname : "unknown";
        }
        /** Set input bar 'topic' */
        let topic = msg("Reply");
        if (isHashTypeB64(thread.pp.subject.address, HoloHashType.Entry)) {
          const maybeSemanticTopicTitle = this.threadsPerspective.semanticTopics.get(new EntryId(thread.pp.subject.address));
          if (maybeSemanticTopicTitle) {
            topic = maybeSemanticTopicTitle;
          }
        }
        /** Check uploading state */
        let pct = 100;
        if (uploadState) {
          /** auto refresh since we can't observe filesDvm */
          delay(5000).then(() => {this.requestUpdate()});
          pct = Math.ceil(uploadState.chunks.length / uploadState.splitObj.numChunks * 100)
        }

        let maybeReplyAuthorName = "unknown"
        if (this._replyToAh) {
          const beadInfo = this._dvm.threadsZvm.perspective.getBeadInfo(this._replyToAh);
          if (beadInfo) {
            const maybeProfile = this._dvm.profilesZvm.perspective.getProfile(beadInfo.author);
            if (maybeProfile) {
              maybeReplyAuthorName = maybeProfile.nickname;
            }
          }
        }

        const threadView = this.multi
            ?  html`<chat-thread-multi-view id="chat-view" .agent=${this._selectedAgent} .beadAh=${this.selectedBeadAh}></chat-thread-multi-view>`
            : html`<chat-thread-view id="chat-view" .threadHash=${this.selectedThreadHash} .beadAh=${this.selectedBeadAh}></chat-thread-view>`;

        centerSide = html`
            ${threadView}
            ${uploadState? html`
              <div id="uploadCard">
                <div style="padding:5px;">Uploading ${uploadState.file.name}</div>
                <ui5-progress-indicator style="width:100%;" value=${pct}></ui5-progress-indicator>
              </div>
            ` : html`
            <div class="reply-info" style="display: ${this._currentCommentRequest? "block" : "none"}">
              ${msg("Comments about")} "${this._currentCommentRequest? this._currentCommentRequest.subjectName : ''}"
              <ui5-button icon="delete" design="Transparent"
                          style="border:none; padding:0px"
                          @click=${(_e:any) => {this._currentCommentRequest = undefined;}}></ui5-button>
            </div>
            <div class="reply-to-div" style="display: ${this._replyToAh? "flex" : "none"}">
                ${msg("Replying to")} ${maybeReplyAuthorName}
                <div style="flex-grow: 1"></div>
                <ui5-button icon="decline" design="Transparent"
                            style="border:none; padding:0px"
                            @click=${(_e:any) => {this._replyToAh = undefined;}}></ui5-button>
            </div>
            <vines-input-bar id="input-bar"
                             .profilesZvm=${this._dvm.profilesZvm}
                             .topic=${topic}
                             .cachedInput=${this.perspective.threadInputs.get(this.selectedThreadHash)? this.perspective.threadInputs.get(this.selectedThreadHash) : ""}
                             .showHrlBtn=${!!this.weServices}
                             showFileBtn="true"
                             @input=${async (e: CustomEvent<VinesInputEvent>) => {
                               e.stopPropagation(); e.preventDefault(); 
                               if (e.detail.text) await this.onCreateTextMessage(e.detail.text);
                               if (e.detail.wal) await this.onCreateHrlMessage(e.detail.wal);
                               if (e.detail.file && this.selectedThreadHash) await this.onCreateFileMessage(this.selectedThreadHash, e.detail.file);                               
                               this._replyToAh = undefined;
                               this.selectedBeadAh = undefined;
                             }}
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

    const avatar = renderAvatar(this._dvm.profilesZvm, this.cell.address.agentId, "S");

    /** Render File View */
    if (!this._hideFiles) {
      primaryTitle = msg("Shared Files");
      console.log("dFiles this._filesDvm", this._filesDvm);
      const publicItems = Array.from(this._filesDvm.deliveryZvm.perspective.publicParcels.entries())
          .map(([ppEh, pprm]) => {
            const isLocal = !!this._filesDvm.deliveryZvm.perspective.localPublicManifests.get(ppEh);
            const profile = pprm.author? this._dvm.profilesZvm.perspective.getProfile(pprm.author) : undefined;
            return {ppEh: ppEh.b64, description: pprm.description, timestamp: pprm.creationTs, author: profile, isLocal, isPrivate: false} as FileTableItem;
          });
      console.log("dFiles dnaProperties", this._filesDvm.dnaProperties);
      console.log("dFiles filesDvm cell", this._filesDvm.cell);
      centerSide = html`
        <cell-context .cell=${this._filesDvm.cell} style="height: 100%">
            <div style="height: 100%; display: flex; flex-direction: column; gap: 10px; margin-left:10px;">
              <ui5-button design="Emphasized" style="max-width: 100px; margin-top:5px;" @click=${(_e:any) => this._hideFiles = true}>${msg("Close")}</ui5-button>           
              <!-- <button @click=${(_e:any) => {
                  const storeDialogElem = this.shadowRoot!.querySelector("store-dialog") as StoreDialog;
                  storeDialogElem.open(false);
              }}>Add Public file</button>
              <store-dialog></store-dialog> -->  
              <file-table type="group" notag view .items=${publicItems} style="height: 100%; display: block"
                          @view=${(e: CustomEvent<EntryId>) => {
                            console.log("view", e.detail.b64);
                            const dialog = this.shadowRoot!.getElementById("view-file-dialog") as SlDialog;
                            dialog.open = true;
                            this._viewFileEh = e.detail;
                          }}
                          @download=${(e: CustomEvent<EntryId>) => {console.log("download", e.detail.b64); this._filesDvm.downloadFile(e.detail)}}
              ></file-table>
              <!-- <activity-timeline></activity-timeline> -->
              <sl-dialog id="view-file-dialog" label=${msg("File Info")}>
                  <file-view .hash=${this._viewFileEh}></file-view>
              </sl-dialog>
            </div>
        </cell-context>          
      `;
    }

    const searchValue = this.shadowRoot!.getElementById("search-field")? (this.shadowRoot!.getElementById("search-field") as Input).value : "";
    const searchParameters = parseSearchInput(searchValue, this._dvm.profilesZvm.perspective);

    let notifSetting = NotifySetting.MentionsOnly; // default
    if (this.selectedThreadHash) {
      notifSetting = this._dvm.threadsZvm.perspective.getNotifSetting(this.selectedThreadHash, this.cell.address.agentId);
    }
    console.log("<vines-page>.render() notifSettings", notifSetting, this.selectedThreadHash);

    /** Group Info */
    let groupProfile: GroupProfile = {
      name: "Vines",
      icon_src: "icon.png",
    };

    /* Use weServices, otherise try from dna properties */
    if(this.weServices) {
      const appletInfo = this.weServices.appletInfoCached(new EntryId(this.weServices.appletIds[0]!));
      console.log("get appletInfo", appletInfo);
      if (appletInfo) {
        console.log("get groupProfile", appletInfo.groupsHashes[0]);
        const weGroup = this.weServices.groupProfileCached(new DnaId(appletInfo.groupsHashes[0]!));
        if (weGroup) {
          groupProfile = weGroup;
        }
      }
    } else {
      if (this._dvm.dnaProperties.groupName) {
        groupProfile.name = this._dvm.dnaProperties.groupName;
      }
      if (this._dvm.dnaProperties.groupSvgIcon) {
        groupProfile.icon_src = `data:image/svg+xml;base64,${this._dvm.dnaProperties.groupSvgIcon}`;
      }
    }

    /** Get network info for this cell */
    const sId = this.cell.address.str;
    const networkInfos = this.networkInfoLogs && this.networkInfoLogs[sId]? this.networkInfoLogs[sId] : [];
    const networkInfo = networkInfos && networkInfos.length > 0 ? networkInfos[networkInfos.length - 1]![1] : null;

    let lister= html`<applet-lister></applet-lister>`
    if (this._listerToShow == this.cell.address.agentId.b64 || this.multi) {
      lister = this.multi? html`
          <dm-multi-lister
                  .showArchived=${this._canViewArchivedSubjects}
                  .selectedThreadHash=${this.selectedThreadHash}
                  @createNewDm=${(_e:any) => {
                      const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                      dialog.show();
                  }}
          ></dm-multi-lister>
      ` : html`
          <dm-lister
                  .showArchived=${this._canViewArchivedSubjects}
                  .selectedThreadHash=${this.selectedThreadHash}
                  @createNewDm=${(_e:any) => {
                      const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                      dialog.show();
                  }}
          ></dm-lister>
      `;
    } else if (this._listerToShow == this.cell.address.dnaId.b64) {
      lister = html`
          <topics-lister 
                         .showArchivedTopics=${this._canViewArchivedSubjects}
                         .selectedThreadHash=${this.selectedThreadHash}
                         @createNewTopic=${(_e : CustomEvent<boolean>) => this.createTopicDialogElem.show()}
                         @createThreadClicked=${(e: CustomEvent<EntryId>) => {
                             this._createTopicHash = e.detail;
                             this.createThreadDialogElem.show();
                         }}
          ></topics-lister>
      `;
    } else if (this._listerToShow == null) {
      lister = html`
          <my-threads-lister 
                         .showArchivedSubjects=${this._canViewArchivedSubjects}
                         .selectedThreadHash=${this.selectedThreadHash}
                         @createNewTopic=${(_e: CustomEvent<boolean>) => this.createTopicDialogElem.show()}
                         @createThreadClicked=${(e : CustomEvent<EntryId>) => {
                          this._createTopicHash = e.detail;
                          this.createThreadDialogElem.show()
                        }}
          ></my-threads-lister>
      `;
    }

    const toggleLeftBtn = html`
        <ui5-button icon="menu2" class="${this._canShowLeft? "pressed" : ""}
                    tooltip=${this._canShowLeft? msg("Hide side panel"): msg("Show side panel")}
                    slot="startButton"
                    style="margin-right:5px;"
                    @click=${(_e:any) => this._canShowLeft = !this._canShowLeft}>
        </ui5-button>
    `;

    let maybeBackBtn = html``;
    if (this.selectedThreadHash) {
      const thread = this.threadsPerspective.threads.get(this.selectedThreadHash);
      if (thread && (
        thread.pp.subject.typeName == SpecialSubjectType.EntryBead
      || thread.pp.subject.typeName == SpecialSubjectType.TextBead
      || thread.pp.subject.typeName == SpecialSubjectType.AnyBead
      || thread.pp.subject.typeName == SpecialSubjectType.EncryptedBead)) {
        const subjectAh = new ActionId(thread.pp.subject.address);
        const subjectBead = this._dvm.threadsZvm.perspective.getBeadInfo(subjectAh);
        if (subjectBead) {
          maybeBackBtn = html`<ui5-button icon="nav-back" slot="startButton" @click=${(_e:any) => this.dispatchEvent(beadJumpEvent(subjectAh))}></ui5-button>`;
        }
      }
    }

    const profileCount = this._dvm.profilesZvm.perspective.agents.length;

    /** Show Cross-view or group-view */
    const topLeft = this.multi? html`
                <div style="display: flex; flex-direction: column; align-items: stretch;padding-top:12px;margin-left:5px;flex-grow: 1;min-width: 0;">
                    <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis;font-size:1.25rem">${msg("DMs Cross View")}</div>
                </div>
    ` : html`
                <div id="group-div">
                    <ui5-avatar size="S" class="chatAvatar"
                                @click=${() => {
                            const popover = this.shadowRoot!.getElementById("networkPopover") as Popover;
                            const btn = this.shadowRoot!.getElementById("group-div") as HTMLElement;
                            popover.showAt(btn);
                          }}>
                        <img src=${groupProfile.icon_src} style="background: #fff; border: 1px solid #66666669;">
                    </ui5-avatar>
                    <div style="display: flex; flex-direction: column; align-items: stretch;padding-top:12px;margin-left:5px;flex-grow: 1;min-width: 0;"
                         @click=${() => {
                          const popover = this.shadowRoot!.getElementById("networkPopover") as Popover;
                          const btn = this.shadowRoot!.getElementById("group-div") as HTMLElement;
                          popover.showAt(btn);
                        }}>
                        <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis;font-size:1.25rem;color:#1B2A39DB">${groupProfile.name}</div>
                        <div style="font-size: 0.66rem;color:grey; text-decoration: underline;"><ui5-icon name="group" style="height: 0.75rem;margin-right:3px"></ui5-icon>
                            ${networkInfo? /*networkInfo.total_network_peers*/ profileCount : 1} ${msg('Members')}
                        </div>
                    </div>
                    <ui5-button id="groupBtn" style="margin-top:10px;" tooltip
                                design="Transparent" icon="navigation-down-arrow"
                                @click=${(e:any) => {
                                  e.preventDefault();
                                  //console.log("onSettingsMenu()", e);
                                  const menu = this.shadowRoot!.getElementById("groupMenu") as Menu;
                                  const btn = this.shadowRoot!.getElementById("groupBtn") as Button;
                                  menu.showAt(btn);
                                }}>
                    </ui5-button>
                    <ui5-menu id="groupMenu" @item-click=${this.onGroupMenu}>
                        <ui5-menu-item id="createTopic" icon="add" text=${msg("Create new Topic")}></ui5-menu-item>
                        ${this._canViewArchivedSubjects
                          ? html`<ui5-menu-item id="viewArchived" text=${msg("Hide Archived items")} icon="hide"></ui5-menu-item>`
                          : html`<ui5-menu-item id="viewArchived" text=${msg("View Archived items")} icon="show"></ui5-menu-item>
                        `}
                        <ui5-menu-item id="viewFiles" icon="documents" text=${msg("View Files")}></ui5-menu-item>
                        <ui5-menu-item id="markAllRead" text=${msg("Mark all as read")}></ui5-menu-item>
                    </ui5-menu>
                </div>

                <!-- <ui5-segmented-button-item id="dm-option">${msg('DMs')}</ui5-segmented-button-item> -->
                <!-- 
                <ui5-segmented-button @selection-change=${this.onListerSelected} style="margin:auto; padding-top: 7px; padding-bottom: 7px;">
                    <ui5-segmented-button-item id="topics-option">${msg('Topics')}</ui5-segmented-button-item>
                    <ui5-segmented-button-item id="tools-option">${msg('Tools')}</ui5-segmented-button-item>
                    <ui5-segmented-button-item id="mine-option">${msg('My')}</ui5-segmented-button-item>
                </ui5-segmented-button> -->
                
                <div style="display: flex; flex-direction: row; gap:3px; background: #D2D2D2; height: 30px; margin: 10px 10px 10px 10px; border-radius: 5px; padding: 3px;">
                    <div id="topicsBtn" class="listerbtn selected" @click=${(e:any) => {
                        e.preventDefault(); e.stopPropagation();
                        this.onListerSelected("topics-option");
                        const topicsBtn = this.shadowRoot!.getElementById("topicsBtn") as HTMLElement;
                        topicsBtn.classList.add("selected");
                        const toolsBtn = this.shadowRoot!.getElementById("toolsBtn") as HTMLElement;
                        toolsBtn.classList.remove("selected");
                        const mineBtn = this.shadowRoot!.getElementById("mineBtn") as HTMLElement;
                        mineBtn.classList.remove("selected");
                    }}>${msg('Topics')}</div>
                    <div id="toolsBtn" class="listerbtn" @click=${(e:any) => {
                        e.preventDefault(); e.stopPropagation();
                        this.onListerSelected("tools-option");
                        const topicsBtn = this.shadowRoot!.getElementById("topicsBtn") as HTMLElement;
                        topicsBtn.classList.remove("selected");
                        const toolsBtn = this.shadowRoot!.getElementById("toolsBtn") as HTMLElement;
                        toolsBtn.classList.add("selected");
                        const mineBtn = this.shadowRoot!.getElementById("mineBtn") as HTMLElement;
                        mineBtn.classList.remove("selected");                        
                    }}>${msg('Tools')}</div>
                    <div id="mineBtn" class="listerbtn" @click=${(e:any) => {
                        e.preventDefault(); e.stopPropagation();
                        this.onListerSelected("mine-option");
                        const topicsBtn = this.shadowRoot!.getElementById("topicsBtn") as HTMLElement;
                        topicsBtn.classList.remove("selected");
                        const toolsBtn = this.shadowRoot!.getElementById("toolsBtn") as HTMLElement;
                        toolsBtn.classList.remove("selected");
                        const mineBtn = this.shadowRoot!.getElementById("mineBtn") as HTMLElement;
                        mineBtn.classList.add("selected");                        
                    }}>${msg('My')}</div>                    
                </div>                
    `;


    /** Render all */
    return html`
        <div id="mainDiv" 
             @commenting-clicked=${this.onCommentingClicked}
             @reply-clicked=${this.onReplyClicked}
             @edit-topic-clicked=${this.onEditTopicClicked}>
            
            <div id="leftSide" style="display: ${this._canShowLeft? "flex": "none"}"
                 @contextmenu=${(e:any) => {
                    console.log("LeftSide contextmenu", e);
                  // e.preventDefault();
                  // const menu = this.shadowRoot!.getElementById("groupMenu") as Menu;
                  // const btn = this.shadowRoot!.getElementById("groupBtn") as Button;
                  // menu.showAt(btn);
                  // //menu.style.top = e.clientY + "px";
                  // //menu.style.left = e.clientX + "px";
                }}>
                
                ${topLeft}
                ${lister}
                <!-- Messages -->
                <div style="display: flex; flex-direction: row; gap: 10px;align-items: center; margin-left: 10px; color: grey;">
                    <ui5-icon style="width: 1.2rem; height: 1.2rem" name="paper-plane"></ui5-icon>
                    <span style="width: 1.2rem; height: 1.2rem">${msg("Messages")}</span>
                    <span style="flex-grow: 1"></span>
                    <ui5-button icon="add" tooltip=${msg("Message a peer")}
                                design="Transparent"
                                style="color:grey; margin-right: 8px;"
                                @click=${async (e:any) => {
                                    e.stopPropagation(); 
                                    await this.updateComplete;
                                    const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                                    dialog.show();
                                }}>
                    </ui5-button>
                </div>
                <dm-lister nobtn
                        .showArchived=${this._canViewArchivedSubjects}
                        .selectedThreadHash=${this.selectedThreadHash}
                ></dm-lister>
                
                    <!--
                <div style="display:flex; flex-direction:row; height:44px; border:1px solid #fad0f1;background:#f1b0b0">
                    <ui5-button design="Transparent" icon="action-settings" tooltip="Go to settings"
                                @click=${async () => {
                    await this.updateComplete;
                    this.dispatchEvent(new CustomEvent<boolean>('debug', {detail: true, bubbles: true, composed: true}));
                }}
                    ></ui5-button>
                    <ui5-button icon="activate" tooltip="Commit logs" design="Transparent"
                                @click=${this.onCommitBtn}></ui5-button>
                </div> -->
                <div id="profile-row">
                    <div id="profile-div" 
                         style="display: flex; flex-direction: row; cursor:pointer;flex-grow:1;min-width: 0;"
                         @click=${(e:any) => {
                             e.stopPropagation();
                             this.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {detail: {agentId: this.cell.address.agentId, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));}}>
                      ${avatar}
                      <div style="display: flex; flex-direction: column; align-items: stretch;padding-top:18px;margin-left:5px;flex-grow:1;min-width: 0;">
                          <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis;color:#1B2A39ED;"><abbr title=${this.cell.address.agentId.b64}>${myProfile.nickname}</abbr></div>
                              <!-- <div style="font-size: small">${this.cell.address.agentId.b64}</div> -->
                      </div>
                    </div>
                    <ui5-button id="shareBtn" style="margin-top:10px;"
                                design="Transparent" icon="share-2" tooltip=${msg("Share Network")}
                                @click=${async (_e:any) => {
                                    const popover = this.shadowRoot!.getElementById("shareNetworkPopover") as Popover;
                                    const btn = this.shadowRoot!.getElementById("shareBtn") as HTMLElement;
                                    /** Generate and add QR code */
                                    const existingImg = popover.querySelector('img')
                                    if (!existingImg) {
                                      let generateQR: string;
                                      try {
                                        generateQR = await QRCode.toDataURL(this.cell.shareCode);
                                        const img = document.createElement('img');
                                        img.src = generateQR;
                                        popover.append(img);
                                      } catch (err) {
                                        console.error(err);
                                      }
                                    }
                                    popover.showAt(btn);
                                }}>
                    </ui5-button>                    
                    <ui5-button id="settingsBtn" style="margin-top:10px;"
                                design="Transparent" icon="action-settings" tooltip=${msg("Settings")}
                                @click=${(_e:any) => {
                                    const settingsMenu = this.shadowRoot!.getElementById("settingsMenu") as Menu;
                                    const settingsBtn = this.shadowRoot!.getElementById("settingsBtn") as Button;
                                    settingsMenu.showAt(settingsBtn);
                                }}>
                    </ui5-button>
                    <ui5-menu id="settingsMenu" header-text=${msg("Settings")} 
                              @item-click=${(e:any) => this.onSettingsMenu(e)}>
                        <ui5-menu-item id="editProfileItem" text=${msg("Edit Profile")} icon="user-edit"></ui5-menu-item>
                        <ui5-menu-item id="exportItem" text="Export Local" icon="save" starts-section></ui5-menu-item>
                        <ui5-menu-item id="exportAllItem" text=${msg("Export All")} icon="save" starts-section></ui5-menu-item>
                        <ui5-menu-item id="uploadFileItem" text=${msg("Import File")} icon="upload-to-cloud"></ui5-menu-item>
                        <ui5-menu-item id="importCommitItem" text=${msg("Import and commit")} icon="open-folder" ></ui5-menu-item>
                        <ui5-menu-item id="importOnlyItem" text=${msg("Import only")} icon="open-folder" ></ui5-menu-item>
                        <ui5-menu-item id="bugItem" text=${msg("Report Bug")} icon="marketing-campaign" starts-section></ui5-menu-item>
                        <ui5-menu-item id="dumpItem" text="Dump Threads logs"></ui5-menu-item>
                        <ui5-menu-item id="dumpFilesItem" text="Dump Files logs"></ui5-menu-item>
                        <ui5-menu-item id="dumpNetworkItem" text="Dump Network logs"</ui5-menu-item>
                    </ui5-menu>
                    <!-- Network Health Panel -->
                    <ui5-popover id="networkPopover">
                        <div slot="header" style="display:flex; flex-direction:row; width:100%; margin:5px; font-weight: bold;">
                            <abbr title=${this.cell.address.dnaId.b64}>${msg("Network Health")}</abbr>
                            <div style="flex-grow: 1;"></div>
                        </div>
                        <network-health-panel></network-health-panel>
                        <div slot="footer" style="display:flex; flex-direction:row; width:100%; margin:5px; margin-right:0px;">
                          <div style="flex-grow: 1;"></div>
                          <ui5-button slot="footer" design="Emphasized" @click=${() => {
                                      const popover = this.shadowRoot!.getElementById("networkPopover") as Popover;
                                      if (popover.isOpen()) {
                                          popover.close();
                                      }
                                  }}
                          >${msg('Close')}</ui5-button>
                        </div>
                    </ui5-popover>
                    <!-- Share Network -->
                    <ui5-popover id="shareNetworkPopover">
                        <div slot="header" style="display:flex; flex-direction:row; width:100%; margin:5px; font-weight: bold;">
                            ${msg("Share Network")}
                            <div style="flex-grow: 1;"></div>
                        </div>
                        <div>${msg('Share this code with a peer to grant them access to this Network')} (<b>${this.cell.name})</b></div>
                        <ui5-textarea .value=${this.cell.shareCode}></ui5-textarea>
                        <div slot="footer" style="display:flex; flex-direction:row; width:100%; margin:5px; margin-right:0px;">
                            <div style="flex-grow: 1;"></div>
                            <ui5-button slot="footer" design="Emphasized" @click=${() => {
                                navigator.clipboard.writeText(this.cell.shareCode);
                                toasty(msg("Copied share code to clipboard"));
                                const popover = this.shadowRoot!.getElementById("shareNetworkPopover") as Popover;
                                if (popover.isOpen()) {
                                    popover.close();
                                }
                            }}
                            >${msg('Copy Joining Code')}</ui5-button>
                        </div>
                    </ui5-popover>
                  <!-- <ui5-button style="margin-top:10px;"
                                design="Transparent" icon="synchronize" tooltip="Refresh"
                                @click=${this.refresh}></ui5-button>  -->
                </div>
            </div>
            <div id="mainSide">
              <div id="topicBar">
                  ${toggleLeftBtn}
                  ${maybeBackBtn}
                  <div id="primaryTitle" style="font-size: 20px">${primaryTitle}</div>
                  <div style="flex-grow: 1"></div>
                  <div id="topBarBtnGroup">
                    <ui5-input id="search-field" placeholder=${msg('Search')} show-clear-icon
                             style="display: ${this._canShowSearch? "flex" : "none"}"
                             @input=${(e:any) => {
                                 console.log("<search-field> @input", e.keyCode, e);
                                 let searchElem = this.shadowRoot!.getElementById("search-field") as Input;
                                 let searchPopElem = this.shadowRoot!.getElementById("searchPopover") as Popover;
                                 if (searchElem.value == "") {
                                   searchPopElem.close();
                                   this._canShowSearchResults = false;
                                   this.requestUpdate(); // important
                                   return;
                                 }
                                 searchPopElem.showAt(searchElem, true);
                                 searchPopElem.headerText = `${msg("SEARCH FOR")}: ${searchElem.value}`;
                             }}
                             @keypress=${(e:any) => {
                               console.log("<search-field> @keypress", e.keyCode, e);
                               let searchElem = this.shadowRoot!.getElementById("search-field") as Input;
                               let searchPopElem = this.shadowRoot!.getElementById("searchPopover") as Popover;
                               //let searchResultElem = this.shadowRoot!.getElementById("search-result-panel") as Popover;
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
                  <ui5-button icon="search" class="${this._canShowSearch? "pressed" : ""}" @click=${() => {this._canShowSearch = !this._canShowSearch;}}></ui5-button>

                      ${this.selectedThreadHash === undefined ? html`` :
                          html`<ui5-button id="notifSettingsBtn" 
                                           icon="bell" 
                                           tooltip=${msg('Notifications Settings')} 
                                           @click=${() => {
                                             console.log("notifSettingsBtn.click()");
                                            const popover = this.shadowRoot!.getElementById("notifSettingsPopover") as Popover;
                                            if (popover.isOpen()) {
                                                popover.close();
                                                return;
                                            }
                                            const shellbar = this.shadowRoot!.getElementById("topicBar");
                                            if (!shellbar) {
                                              console.error("Missing topicBar HTML Element");
                                            }
                                            popover.showAt(shellbar!);
                                        }}>
                          </ui5-button>`
                  }
                    <ui5-button icon="favorite-list" class="${this._canShowFavorites? "pressed" : ""}" @click=${() => {                       
                          this._canShowFavorites = !this._canShowFavorites;
                          if (this._canShowFavorites) {
                            this._replyToAh = undefined;
                            this._selectedAgent = undefined;
                            this.selectedThreadHash = undefined;
                          }
                        }
                    }></ui5-button>
                    <ui5-button icon="comment" class="${this._canShowComments? "pressed" : ""}" @click=${() => {this._canShowComments = !this._canShowComments;}}></ui5-button>
                    <div class="notification-button">
                      <ui5-button icon="inbox"
                                         @click=${() => {
                                            console.log("inboxButton.click()")
                                            const popover = this.shadowRoot!.getElementById("notifPopover") as Popover;
                                            if (popover.isOpen()) {
                                                popover.close();
                                                return;
                                            }
                                            const shellbar = this.shadowRoot!.getElementById("topicBar");
                                            popover.showAt(shellbar!);
                                        }}>
                      </ui5-button>
                      <span class="numberBadge">${this._dvm.threadsZvm.perspective.inbox.size? this._dvm.threadsZvm.perspective.inbox.size : ""}</span>
                    </div>
                  </div>
              </div>

                <ui5-popover id="searchPopover" header-text="SEARCH FOR: " hide-arrow placement-type="Bottom" horizontal-align="Stretch">
                    <div class="popover-content">
                        <ui5-list mode="None" separators="None">
                            <ui5-li-groupheader class="search-group-header">${msg("Search Options")}</ui5-li-groupheader>
                            <ui5-li @click=${(_e:any) => this.addSearch("in:")}><b>in:</b> <i>thread</i></ui5-li>
                            <ui5-li @click=${(_e:any) => this.addSearch("from:")}><b>from:</b> <i>user</i></ui5-li>
                            <ui5-li @click=${(_e:any) => this.addSearch("mentions:")}><b>mentions:</b> <i>user</i></ui5-li>
                            <ui5-li @click=${(_e:any) => this.addSearch("before:")}><b>before:</b> <i>date</i></ui5-li>
                            <ui5-li @click=${(_e:any) => this.addSearch("after:")}><b>after:</b> <i>date</i></ui5-li>
                        </ui5-list>
                    </div>
                </ui5-popover>

                <ui5-popover id="notifPopover" header-text="Inbox" placement-type="Bottom" horizontal-align="Right" hide-arrow style="max-width: 500px">
                    <notification-list></notification-list>
                </ui5-popover>

                <ui5-popover id="notifSettingsPopover" placement-type="Bottom" horizontal-align="Right" hide-arrow header-text=${msg("Notification settings for this channel")}>
                    <div  style="flex-direction: column; display: flex">
                        <ui5-radio-button id="notifSettingsAll" name="GroupA" text=${msg("All Messages")} @change=${(_e:any) => this.onNotifSettingsChange()} ?checked=${(notifSetting == NotifySetting.AllMessages) as Boolean}><</ui5-radio-button>
                        <ui5-radio-button id="notifSettingsMentions" name="GroupA" text=${msg("Mentions and Replies Only")} @change=${(_e:any) => this.onNotifSettingsChange()} ?checked=${(notifSetting == NotifySetting.MentionsOnly) as Boolean}></ui5-radio-button>
                        <ui5-radio-button id="notifSettingsNever" name="GroupA" text=${msg("Never")} @change=${(_e:any) => this.onNotifSettingsChange()} ?checked=${(notifSetting == NotifySetting.Never) as Boolean}></ui5-radio-button>
                    </div>
                </ui5-popover>

              <div id="lowerSide">
                <div id="centerSide">
                    ${centerSide}
                </div>
                  ${this._canShowComments? html`
                <div id="commentSide">
                    <comment-thread-view id="comment-view" .threadHash=${this._selectedCommentThreadHash} showInput="true"
                                         .subjectName="${this._selectedCommentThreadSubjectName}"></comment-thread-view>
                </div>` : html``}
                  ${this._canShowSearch && this._canShowSearchResults? html`
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
        <ui5-dialog id="pick-agent-dialog" header-text=${msg('Select a peer')}>
            <peer-list @avatar-clicked=${async (e:any) => {
                console.log("@avatar-clicked", e.detail)
                const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                dialog.close();
                const ppAh = await this._dvm.threadsZvm.createDmThread(e.detail, this.weServices);
                this.dispatchEvent(threadJumpEvent(ppAh));
            }}></peer-list>
            <ui5-button 
                    style="margin-top: 10px; float: right;"
                    @click=${(_e:any) => {const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog; dialog.close()}}>
                Cancel
            </ui5-button>
        </ui5-dialog>
        <!-- Profile Dialog/Popover -->
        <ui5-popover id="profilePop" hide-arrow allow-target-overlap placement-type="Right" style="min-width: 0px;">
            <profile-panel id="profilePanel" 
                           @edit-profile=${(_e:any) => (this.shadowRoot!.getElementById("profilePop") as Popover).close()}
                           @input=${(e: CustomEvent<VinesInputEvent>) => {
                             e.preventDefault();
                             if (!e.detail.text) throw Error("Missing text in input event");
                             this.onDmTextMessage(e.detail.text);
                             const profilePopElem = this.shadowRoot!.getElementById("profilePop") as Popover;
                             if (profilePopElem.isOpen()) {
                                 profilePopElem.close();
                             }                             
                           }}
            ></profile-panel>
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
        <!-- Confirm Dialog -->
        <confirm-dialog id="confirm-hide-topic" @confirmed=${(_e:any) => {}}></confirm-dialog>
        <!-- View Embed Dialog -->
        <view-embed-dialog id="view-embed"></view-embed-dialog>
        <!-- Create Topic Dialog -->
        <ui5-dialog id="create-topic-dialog" header-text=${msg('Create Topic')}>
            <section>
                <div>
                    <ui5-label for="topicTitleInput" required>${msg("Title")}:</ui5-label>
                    <ui5-input id="topicTitleInput" @keydown=${(e:any) => {
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
                    <ui5-label for="editTopicTitleInput" required>${msg("Title")}:</ui5-label>
                    <ui5-input id="editTopicTitleInput" @keydown=${(e:any) => {
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
        <ui5-dialog id="create-thread-dialog" header-text=${msg("Create new channel")}>
            <section>
                <div>
                    <ui5-label for="threadPurposeInput" required>${msg("Purpose")}:</ui5-label>
                    <ui5-input id="threadPurposeInput" 
                               @keydown=${async (e:any) => {
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
                        @click=${async (e:any) => await this.onCreateThread(e)} >
                ${msg("Create")}
            </ui5-button>
            <ui5-button style="margin-top:5px" @click=${(_e:any) => this.createThreadDialogElem.close(false)}>Cancel
            </ui5-button>
            </div>
        </ui5-dialog>
    `;
  }


  private importDvm(canPublish: boolean) {
    console.log("importDvm()");
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
      reader.onload = (_e:any) => {
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
      const maybeSplitObj = await this._filesDvm.startPublishFile(file, []/*this._selectedTags*/, this._dvm.profilesZvm.perspective.agents, (_manifestEh) => {
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
  async onGroupMenu(e:any): Promise<void> {
    console.log("onGroupMenu item-click", e)
    switch (e.detail.item.id) {
      case "createTopic": this.createTopicDialogElem.show(); break;
      case "viewArchived": this.onShowArchiveTopicsBtn(e); break;
      case "markAllRead": this.onCommitBtn(e); break;
      case "viewFiles": this._hideFiles = !this._hideFiles; break;
    }
  }



  /** */
  async onSettingsMenu(e:any): Promise<void> {
    console.log("item-click", e);
    this.waitDialogElem.show();
    let content = "";
    switch (e.detail.item.id) {
      case "uploadFileItem": this.openFile(); break;
      case "editProfileItem": this.profileDialogElem.show(); break;
      // @ts-ignore
      case "exportAllItem":
        if (content == "") content = await this._dvm.exportAllPerspective();
      case "exportItem":
        const files_json = await this._filesDvm.exportPerspective();
        this.downloadTextFile("dump_files.json", files_json);
        if (content == "") content = this._dvm.exportPerspective();
        this.downloadTextFile("dump_threads.json", content);
        toasty(msg(`Exported data to json in Downloads folder`));
        break;
      case "importCommitItem": this.importDvm(true); break;
      case "importOnlyItem": this.importDvm(false); break;
      case "bugItem": window.open(`https://github.com/lightningrodlabs/threads/issues/new`, '_blank'); break;
      case "dumpItem": this._dvm.dumpCallLogs(); this._dvm.dumpSignalLogs(); break;
      case "dumpFilesItem": this._filesDvm.dumpCallLogs(); this._filesDvm.dumpSignalLogs(); break;
      case "dumpNetworkItem": this.dispatchEvent(new CustomEvent('dumpNetworkLogs', {detail: null, bubbles: true, composed: true})); break;
    }
    this.waitDialogElem.close();
  }


  /** */
  async refresh(_e?: any) {
    await this._dvm.threadsZvm.zomeProxy.probeInbox();
    console.log("Inbox:", this._dvm.threadsZvm.perspective.inbox.size);
  }


  /** */
  async onCommitBtn(_e?: any) {
    toasty(msg("All marked 'read' and cleared Inbox"));
    await this._dvm.threadsZvm.commitAllProbeLogs();
    await this._dvm.threadsZvm.flushInbox();
  }


  /** */
  onShowArchiveTopicsBtn(_e?: any) {
    this._canViewArchivedSubjects = !this._canViewArchivedSubjects;
  }


  /** */
  static override get styles() {
    return [
      css`
        :host {
          /*background: #FBFCFD;*/
          display: block;
          height: 100vh;
          width: 100vw;
          background: #F6FAFC;
        }

        abbr {
          text-decoration: none;
        }

        #profile-div:hover {
          /*background: rgba(214, 226, 245, 0.8);*/
          outline: 1px solid #1010a6;
        }

        .reply-info {
          /*background: #b4c4be;*/
          margin: 0px 10px -9px 10px;
          padding: 5px;
          border: 1px solid black;
        }

        .reply-to-div {
          flex-direction: row;
          /*background: rgb(208, 208, 208);*/
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
          /*background: linear-gradient(to right, rgba(242,242,242,0) 0%,rgba(242,242,242,0.36) 80%,rgba(43, 43, 43, 0.09) 100%); */
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
          margin-bottom: 2px;
          padding-right: 5px;
          background: rgba(221, 233, 240, 0.68);
          box-shadow: -1px -18px 14px -2px rgba(0, 0, 0, 0.08);
        }

        #mainSide {
          overflow: auto;
          display: flex;
          flex-grow: 1;
          flex-direction: column;
          z-index: 1;
          /*box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;*/
          box-shadow: -22px 0px 20px -2px rgba(0, 0, 0, 0.08);
        }

        #lowerSide {
          background: linear-gradient(0deg, #F4F9FC 95%, hsl(0, 0%, 87.1%) 100%);
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
        }

        #favoritesSide {
          flex-direction: column;
          min-width: 350px;
          max-width: 350px;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;
        }

        #rightSide {
          width: 500px;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;
        }

        #commentSide {
          flex-direction: column;
          min-width: 350px;
          max-width: 350px;
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
          cursor: pointer;
          background: none;
          padding-right: 7px;
          border-bottom: 1px solid #c6c6c6;
        }

        #lister-select {
          width: auto;
          border: none;
          background: none;
          padding-left: 5px;
          padding-right: 7px;
          margin: 15px 1px 5px 1px;
        }

        #group-div:hover,
        #lister-select:hover {
          /*background:red;*/
          /*font-weight: bold;*/
          z-index: 0;
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

        #topicBar {
          background: white;
          padding: 0px 8px 0px 2px;
          height: 44px;
          /*box-shadow: rgba(0, 0, 0, 0.2) 0px 8px 30px 0px;*/
          display: flex;
          flex-direction: row;
          color: #392D1B;
          align-items: center;
          z-index: inherit;
        }

        #topicBar ui5-button {
          color: #464646;
          border: none;
        }

        #topicBar ui5-button.pressed {
          /*box-shadow: inset 2px 2px 1px #7b7878, inset 2px 3px 5px rgba(0, 0, 0, 0.3), inset -2px -3px 5px rgba(255, 255, 255, 0.5);*/
          box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.3), inset -3px -3px 8px rgba(255, 255, 255, 0.3);

        }


        #topicBar ui5-button:hover {
          background: #e6e6e6;
        }

        #topBarBtnGroup {
          display: flex;
          flex-direction: row;
          gap: 3px;
          align-items: center
        }

        .numberBadge {
          position: absolute;
          top: 5px;
          right: 8px;
          background-color: #33A000;
          color: white;
          border-radius: 50%;
          padding: 2px 5px;
          font-size: 10px;
          font-weight: bold;
          /*min-width: 18px;*/
          text-align: center;
        }

        .numberBadge:empty {
          display: none;
        }

        .listerbtn:hover {
          cursor: pointer;
          outline: 2px solid rgba(49, 95, 252, 0.61);
        }

        .listerbtn {
          display: grid;
          place-items: center;
          flex-grow: 1;
          border-radius: 10px;
          padding: 3px 0px 3px 0px;
          color: #4D4D4D;
        }

        .listerbtn.selected {
          background: white;
          font-weight: bold;
          box-shadow: 0px 3px 13px -7px #000000, -18px 0px 22px -2px rgba(197,209,208,0)
        }
      `,

    ];
  }
}
