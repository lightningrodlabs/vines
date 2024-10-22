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
import "@ui5/webcomponents-icons/dist/alphabetical-order.js"
import "@ui5/webcomponents-icons/dist/attachment.js"
import "@ui5/webcomponents-icons/dist/attachment-text-file.js"
import "@ui5/webcomponents-icons/dist/attachment-photo.js"
import "@ui5/webcomponents-icons/dist/attachment-video.js"
import "@ui5/webcomponents-icons/dist/attachment-audio.js"
import "@ui5/webcomponents-icons/dist/attachment-zip-file.js"
import "@ui5/webcomponents-icons/dist/arrow-bottom.js"
import "@ui5/webcomponents-icons/dist/bell.js"
import "@ui5/webcomponents-icons/dist/bookmark.js"
import "@ui5/webcomponents-icons/dist/copy.js"
import "@ui5/webcomponents-icons/dist/chain-link.js"
import "@ui5/webcomponents-icons/dist/close-command-field.js"
import "@ui5/webcomponents-icons/dist/cloud.js"
import "@ui5/webcomponents-icons/dist/collapse-all.js"
import "@ui5/webcomponents-icons/dist/comment.js"
import "@ui5/webcomponents-icons/dist/customer.js"
import "@ui5/webcomponents-icons/dist/document.js"
import "@ui5/webcomponents-icons/dist/document-text.js"
import "@ui5/webcomponents-icons/dist/download-from-cloud.js"
import "@ui5/webcomponents-icons/dist/decline.js"
import "@ui5/webcomponents-icons/dist/delete.js"
import "@ui5/webcomponents-icons/dist/developer-settings.js"
import "@ui5/webcomponents-icons/dist/discussion.js"
import "@ui5/webcomponents-icons/dist/documents.js"
import "@ui5/webcomponents-icons/dist/dropdown.js"
import "@ui5/webcomponents-icons/dist/download.js"
import "@ui5/webcomponents-icons/dist/edit.js"
import "@ui5/webcomponents-icons/dist/email.js"
import "@ui5/webcomponents-icons/dist/error.js"
import "@ui5/webcomponents-icons/dist/expand-all.js"
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
import "@ui5/webcomponents-icons/dist/picture.js"
import "@ui5/webcomponents-icons/dist/process.js"
import "@ui5/webcomponents-icons/dist/product.js"
import "@ui5/webcomponents-icons/dist/pdf-attachment.js"
import "@ui5/webcomponents-icons/dist/response.js"
import "@ui5/webcomponents-icons/dist/save.js"
import "@ui5/webcomponents-icons/dist/search.js"
import "@ui5/webcomponents-icons/dist/sort.js"
import "@ui5/webcomponents-icons/dist/slim-arrow-left.js"
import "@ui5/webcomponents-icons/dist/slim-arrow-right.js"
import "@ui5/webcomponents-icons/dist/share-2.js"
import "@ui5/webcomponents-icons/dist/sys-add.js"
import "@ui5/webcomponents-icons/dist/show.js"
import "@ui5/webcomponents-icons/dist/synchronize.js"
import "@ui5/webcomponents-icons/dist/time-account.js"
import "@ui5/webcomponents-icons/dist/thing-type.js"
import "@ui5/webcomponents-icons/dist/user-edit.js"
import "@ui5/webcomponents-icons/dist/upload-to-cloud.js"
import "@ui5/webcomponents-icons/dist/unfavorite.js"
import "@ui5/webcomponents-icons/dist/warning.js"
import "@ui5/webcomponents-icons/dist/workflow-tasks.js"

/**  */
import {AgentId, AppProxy, Dictionary, LinkableId} from "@ddd-qc/cell-proxy";

import '@vaadin/grid/theme/lumo/vaadin-grid.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-selection-column.js';

import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";

import 'css-doodle';

import {SlDialog} from "@shoelace-style/shoelace";
import ValueState from "@ui5/webcomponents-base/dist/types/ValueState.js";

import {
  beadJumpEvent,
  ChatThreadView,
  CommentRequest,
  CommentThreadView,
  ConfirmDialog,
  doodle_flowers,
  EditTopicRequest,
  FavoritesEvent,
  favoritesJumpEvent,
  filesContext,
  filesJumpEvent,
  getThisAppletId,
  HideEvent,
  InputBar,
  JumpEvent, latestThreadName,
  MainViewType, multiJumpEvent,
  NotifiableEvent,
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
  ThreadsEntryType, ThreadsPerspective,
  toasty,
  ViewEmbedDialog,
  ViewEmbedEvent,
  VinesInputEvent,
  weaveUrlToWal,
  weClientContext,
} from "@vines/elements";

import {intoHrl, WeServicesEx, wrapPathInSvg} from "@ddd-qc/we-utils";

import {FrameNotification, GroupProfile, WAL, weaveUrlFromWal} from "@theweave/api";
import {consume} from "@lit/context";

import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm";
import {FileTableItem} from "@ddd-qc/files/dist/elements/file-table";
// @ts-ignore
import {FileButton} from "@ddd-qc/files/dist/elements/file-button";
import {FilesDvm, FileView, prettyFileSize, splitFile, SplitObject} from "@ddd-qc/files";
//import {StoreDialog} from "@ddd-qc/files/dist/elements/store-dialog";
import {HAPP_BUILD_MODE} from "@ddd-qc/lit-happ/dist/globals";
import {msg} from "@lit/localize";
import {setLocale} from "./localization";
import {composeNotificationTitle, renderAvatar} from "@vines/elements/dist/render";
import {mdiInformationOutline} from "@mdi/js";
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
    window.addEventListener('beforeunload', async (_e:any) => {
      if (!this.weServices) {
        this.onBeforeUnload();
      }
    });
  }


  /** -- Properties -- */

  @property() appProxy!: AppProxy; // for network info

  @consume({ context: filesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @property() multi: boolean = false;


  /** -- Private state -- */

  /** Left & Lister */
  @state() private _canShowLeft = true;
  @state() private _listerToShow: string | null = "topics-option";
  @state() private _collapseAll: boolean = false;
  @state() private _canAlphabetical: boolean = false;
  @state() private _canViewArchivedSubjects = false;
  @state() private _selectedAgent: AgentId | undefined = undefined; // for cross-view only since we don't know which thread from which tool to use
  @state() private _createTopicHash: ActionId | undefined = undefined;

  /** Right panels */
  @state() private _canShowComments = false;
  @state() private _canShowSearchResults = false;
  @state() private _canShowDebug = false;

  /** Main */
  @state() private _mainView: MainViewType | undefined = undefined;
  @state() private _replyToAh: ActionId | undefined = undefined;
  @state() private _selectedThreadHash: ActionId | undefined = undefined;
  @state() private _selectedBeadAh: ActionId | undefined = undefined;
  @state() private _currentCommentRequest: CommentRequest | undefined = undefined;
  @state() private _selectedCommentThreadHash: LinkableId | undefined = undefined
           private _selectedCommentThreadSubjectName: string = '';

  // @ts-ignore
  private _isDmListVisible: boolean = true;

  private _dmListObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      this._isDmListVisible = entry.isIntersecting;
      const dmSign = this.shadowRoot!.getElementById("dmSign") as HTMLElement;
      if (dmSign) {
        dmSign.style.display = this._isDmListVisible? "none" : "flex";
      }
      // if (entry.isIntersecting) {
      //   console.log('The div is visible');
      // } else {
      //   console.log('The div is not visible');
      // }
    });
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.05
  });


  /** File upload */
  @state() private _splitObj: SplitObject | undefined = undefined;

  /** Notifications */
  private _lastKnownNotificationIndex = 0;


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


  /** */
  async onBeforeUnload() {
    console.warn("<vines-page>.onBeforeUnload()");
    await this._dvm.setLocation(null);
  }

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
    // @ts-ignore
    this.addEventListener('view', this.onViewFile);
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
    // @ts-ignore
    this.removeEventListener('view', this.onViewFile);
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


  /** In dvmUpdated() this._dvm is not already set! */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    //console.log("<vines-page>.dvmUpdated()", this.hash, newDvm.cell.address.dnaId.b64);
    /* Subscribe to ThreadsZvm */
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
  }


  /** */
  async onViewFile(e: CustomEvent<EntryId>) {
    const dialog = this.shadowRoot!.getElementById("view-file-dialog") as SlDialog;
    const fileView = this.shadowRoot!.getElementById("file-viewer") as FileView;
    console.log("FileDvm list:", this._filesDvm.zomeNames.join(", "))
    fileView.hash = e.detail;
    dialog.open = true;
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

   /** DEBUG */
   protected override async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
     console.log("<vines-page>.willUpdate()", changedProperties);
   }


  /** -- Update -- */


  private validateTopic(inputId: string): string | undefined {
    const input = this.shadowRoot!.getElementById(inputId) as Input;
    const name = input.value.trim();
    let childDivs = input.querySelectorAll('div');
    if (name.length < 3) {
      input.valueState = ValueState.Error;
      /** Works even though Lit throws an error when inputing a valid name afterwords */
      childDivs[0]!.innerText = msg("Minimum 3 characters");
      return;
    }
    const regex = new RegExp(`^["a-zA-Z0-9-_ "]+$`);
    const isValid = regex.test(name);
    if (!isValid) {
      input.valueState = ValueState.Error;
      childDivs[0]!.innerText = msg("Invalid characters");
      return;
    }
    //console.log("validateTopic() success", childDivs);
    input.valueState = ValueState.None;
    input.value = "";
    return name;
  }


  /** */
  async onCreateTopic(_e:any) {
    const name = this.validateTopic("topicTitleInput");
    if (!name) {
      return;
    }
    await this._dvm.threadsZvm.publishSemanticTopic(name);
    this.createTopicDialogElem.close();
  }


  /** */
  async onEditTopic(_e:any) {
    const name = this.validateTopic("editTopicTitleInput");
    if (!name) {
      return;
    }
    // TODO: Dont allow new name to be equal to current value
    const topicHash = this.editTopicDialogElem.getAttribute('TopicHash');
    if (!topicHash) {
      throw Promise.reject("Missing TopicHash attribute");
    }
    await this._dvm.editSemanticTopic(new ActionId(topicHash), name);
    this.editTopicDialogElem.close();
  }


  /** */
  async onCreateThread(_e:any) {
    const input = this.shadowRoot!.getElementById("threadPurposeInput") as Input;
    const name = input.value.trim();
    if (name.length < 1) {
      input.valueState = ValueState.Error;
      return;
    }
    const regex = new RegExp(`^["a-zA-Z0-9-_ "]+$`);
    const isValid = regex.test(name);
    if (!isValid) {
      input.valueState = ValueState.Error;
      const errorMsg = this.shadowRoot!.getElementById("channelErrorMsg") as HTMLElement;
      console.log("ValidateTopic() channel", errorMsg);
      errorMsg.textContent = msg("Invalid characters");
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
    let ppAh = this._selectedThreadHash;
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
    this._selectedBeadAh = undefined;
    //await delay(1000);
    this.dispatchEvent(beadJumpEvent(beadAh));
  }


  /** */
  async onCreateHrlMessage(wal: WAL) {
    if (!wal || !this._selectedThreadHash) {
      return;
    }
    console.log("onCreateHrlMessage()", weaveUrlFromWal(wal));
    //const entryInfo = await this.weServices.entryInfo(maybeHrl.hrl);
    // TODO: make sure hrl is an entryHash
    let ah = await this._dvm.publishMessage(ThreadsEntryType.AnyBead, wal, this._selectedThreadHash, undefined, this._replyToAh, this.weServices);
    console.log("onCreateHrlMessage() ah", ah);
  }


  /** */
  async onCreateSemanticTopic(topic: string) {
    await this._dvm.threadsZvm.publishSemanticTopic(topic);
  }


  /** After first render only */
  override async firstUpdated() {
    console.log("<vines-page> firstUpdated()", this._dvm.threadsZvm.perspective.globalProbeLogTs);

    /** Start observing the div */
    const dmList = this.shadowRoot!.getElementById("dmLister") as HTMLElement;
    if (dmList) {
      this._dmListObs.observe(dmList);
    }

    /** Generate test data */
    //await this._dvm.threadsZvm.generateTestData("");

    /** If no global commit log ; commit first one */
    if (!this._dvm.threadsZvm.perspective.globalProbeLogTs) {
      console.log("<vines-page> Calling commitFirstGlobalLog()");
      await this._dvm.threadsZvm.zomeProxy.commitFirstGlobalLog();
    }

    /** WARN: this can commit an entry */
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
      console.log("<vines-page>.firstUpdated() cacheFullAppletInfo", this.weServices);
      //const appletIds = await this._dvm.threadsZvm.pullAppletIds();
      //console.log("<vines-page> firstUpdated() appletIds", appletIds);
      for (const appletId of this._dvm.threadsZvm.perspective.appletIds) {
        /* const _appletInfo = */ await this.weServices.cacheFullAppletInfo(appletId);
      }
      /** Register callback */
      this.weServices.onBeforeUnload(() => this.onBeforeUnload());
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
    if (this.weServices) {
      for (const [beadInfo, typed] of this._dvm.threadsZvm.perspective.beads.values()) {
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
      /** notifyFrame of some new content: FIXME move to zvm? */
      const allCount = this._dvm.threadsZvm.perspective.unreadThreads.size + this._dvm.threadsZvm.perspective.newThreads.size;
      //console.warn("<vines-page>.updated() weServices", allCount);
      if (allCount > 0) {
        this.weServices.notifyFrame([{
          title: "Unread content",
          body: "",
          notification_type: "content",
          icon_src: wrapPathInSvg(mdiInformationOutline),
          urgency: 'medium',
          timestamp: Date.now(),
        }]);
      }
    }

    /** Create popups from signaled Notifications */
    const weNotifs = [];
    for (const notif of this.perspective.signaledNotifications.slice(this._lastKnownNotificationIndex)) {
      //console.log("<vines-page> signaledNotifications", notif.author, notif);
      /* Skip New DM Notif. Used only for code not UI */
      if (notif.event == NotifiableEvent.NewDmThread) {
        continue;
      }
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
          aboutWal: {hrl: intoHrl(this.cell.address.dnaId, notif.content)},
          fromAgent: notif.author.hash,
          //forAgents?: AgentPubKey[];
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
    await delay(100); // Necessary to make sure our new profile is displayed since vines-page is not reactive to ProfilesZome
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
        name: request.subjectName,
        typeName: request.subjectType,
        appletId: getThisAppletId(this.weServices),
        dnaHashB64: this.cell.address.dnaId.b64,
    };
    const pp: ParticipationProtocol = {
        purpose: "comment",
        rules: "N/A",
        subject,
    };
    const [_ts, ppAh] = await this._dvm.threadsZvm.publishParticipationProtocol(pp);
    return ppAh;
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
    console.log("<vines-page>.onJump()", e.detail, this._selectedThreadHash);
    this.closePopups();

    const maybePrevThreadId = this._selectedThreadHash; // this.selectedThreadHash can change value during this function call (changed by other functions handling events I guess).

    /** Reset state */
    this._replyToAh = undefined;
    this._selectedAgent = undefined;


    /** Cache and reset input-bar */
    const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
    if (inputBar && maybePrevThreadId) {
      //console.warn("<vines-page>.onJump() Storing input-bar:", inputBar.value, maybePrevThreadId.short)
      this._dvm.perspective.threadInputs.set(maybePrevThreadId, inputBar.value);
      inputBar.setValue("");
    }

    /** Set new state */
    this._mainView = e.detail.type;
    switch(e.detail.type) {
      case MainViewType.Favorites:
      case MainViewType.Files:
        this._selectedThreadHash = undefined;
        this._selectedBeadAh = undefined;
        this._selectedAgent = undefined;
        break;
      case MainViewType.MultiThread:
      case MainViewType.Thread:
        /** set lastProbeTime for current thread */
        if (maybePrevThreadId) {
          await this._dvm.threadsZvm.commitThreadProbeLog(maybePrevThreadId);
          /** Clear notifications on prevThread */
          const prevThreadNotifs = this._dvm.threadsZvm.perspective.getAllNotificationsForPp(maybePrevThreadId);
          for (const [linkAh, _notif] of prevThreadNotifs) {
            await this._dvm.threadsZvm.deleteNotification(linkAh);
          }
        }
        if (!e.detail.thread && e.detail.bead) {
          const beadInfo = this._dvm.threadsZvm.perspective.getBeadInfo(e.detail.bead);
          this._selectedThreadHash = beadInfo!.bead.ppAh;
        } else {
          this._selectedThreadHash = e.detail.thread;
        }
        this._selectedBeadAh = e.detail.bead;
        this._selectedAgent = e.detail.agent;
      break;
    }
    /*await*/ this._dvm.setLocation(this._selectedThreadHash? this._selectedThreadHash : null);
  }


  /* */
  closePopups() {
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
    const netPopElem = this.shadowRoot!.getElementById("networkPopover") as Popover;
    if (netPopElem.isOpen()) {
      netPopElem.close();
    }
    const sharePopElem = this.shadowRoot!.getElementById("shareNetworkPopover") as Popover;
    if (sharePopElem.isOpen()) {
      sharePopElem.close();
    }
  }


  /** */
  onNotifSettingsChange() {
    console.log("onNotifSettingsChange()");
    if (!this._selectedThreadHash) {
      console.error("onNotifSettingsChange() failed. No thread selected")
      return;
    }
    const allRadio = this.shadowRoot!.getElementById("notifSettingsAll") as RadioButton;
    const mentionRadio = this.shadowRoot!.getElementById("notifSettingsMentions") as RadioButton;
    const neverRadio = this.shadowRoot!.getElementById("notifSettingsNever") as RadioButton;
    if (allRadio.checked) {
      this._dvm.threadsZvm.publishNotifSetting(this._selectedThreadHash, NotifySetting.AllMessages);
      //console.log("notifSetting checked", NotifySettingType.AllMessages);
      return;
    }
    if (mentionRadio.checked) {
      this._dvm.threadsZvm.publishNotifSetting(this._selectedThreadHash, NotifySetting.MentionsOnly);
      //console.log("notifSetting checked", NotifySettingType.MentionsOnly);
      return;
    }
    if (neverRadio.checked) {
      this._dvm.threadsZvm.publishNotifSetting(this._selectedThreadHash, NotifySetting.Never);
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
    console.log("<vines-page>.render()", this.onlineLoaded, this._mainView, this._selectedThreadHash, this._selectedAgent, this._splitObj, /*this._dvm.profilesZvm,*/ this._dvm.threadsZvm.perspective);
    //console.log("<vines-page>.render() jump", this.perspective.threadInputs[this.selectedThreadHash], this.selectedThreadHash);

    if (this.perspective.importing) {
      return html`
          <ui5-busy-indicator delay="0" size="Large" active
                              style="margin:auto; width:100%; height:100%; color:#05b92f"
          ></ui5-busy-indicator>`;
    }

    let uploadState;
    if (this._splitObj) {
      uploadState = this._filesDvm.perspective.uploadStates[this._splitObj.dataHash];
    }

    /** */
    let primaryTitle = msg("No channel selected");
    let centerSide = html`${doodle_flowers}`;
    if (this._mainView == MainViewType.Favorites) {
      centerSide = html`<favorites-view></favorites-view>`
      primaryTitle = msg("Favorites");
    }

    /** render selected thread */
    if (this._selectedThreadHash && (this._mainView == MainViewType.Thread || this._mainView == MainViewType.MultiThread)) {
      const thread = this._dvm.threadsZvm.perspective.threads.get(this._selectedThreadHash);
      //console.warn("<vines-page>.render() thread", !!thread, this._selectedThreadHash.short);
      if (!thread) {
        console.log("<vines-page>.render() fetchPp WARNING");
        /*await*/ this._dvm.threadsZvm.fetchPp(this._selectedThreadHash);
      } else {
        primaryTitle = latestThreadName(thread.pp, this._dvm.threadsZvm);
        const dmThread = this._dvm.threadsZvm.isThreadDm(this._selectedThreadHash);
        if (dmThread) {
          console.log("<vines-page>.render() dmThread", dmThread);
          const profile = this._dvm.profilesZvm.perspective.getProfile(dmThread);
          primaryTitle = profile ? profile.nickname : "unknown";
        }
        /** Set input bar 'topic' */
        let topic = msg("Reply");
        if (thread.pp.subject.typeName == SpecialSubjectType.SemanticTopic) {
          const pair = this._dvm.threadsZvm.perspective.semanticTopics.get(new ActionId(thread.pp.subject.address));
          if (pair) {
            topic = pair[0];
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
            ?  html`<chat-thread-multi-view id="chat-view" .agent=${this._selectedAgent} .beadAh=${this._selectedBeadAh}></chat-thread-multi-view>`
            : html`<chat-thread-view id="chat-view" .threadHash=${this._selectedThreadHash} .beadAh=${this._selectedBeadAh}></chat-thread-view>`;

        centerSide = html`
            <presence-panel .hash=${this._selectedThreadHash}></presence-panel>
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
            <div class="reply-to-div" style="display: ${this._replyToAh? "flex" : "none"}; background: #6f6f6f2e;">
                ${msg("Replying to")}<span style="font-weight: bold; color:#4270A8; margin-left:3px;">${maybeReplyAuthorName}</span>
                <div style="flex-grow: 1"></div>
                <ui5-button icon="decline" design="Transparent"
                            style="border:none; padding:0px"
                            @click=${(_e:any) => {this._replyToAh = undefined;}}></ui5-button>
            </div>
            <vines-input-bar id="input-bar" contenteditable="true"
                             .profilesZvm=${this._dvm.profilesZvm}
                             .topic=${topic}
                             .cachedInput=${this.perspective.threadInputs.get(this._selectedThreadHash)? this.perspective.threadInputs.get(this._selectedThreadHash) : ""}
                             .showHrlBtn=${!!this.weServices}
                             showFileBtn="true"
                             @input=${async (e: CustomEvent<VinesInputEvent>) => {
                               e.stopPropagation(); e.preventDefault(); 
                               if (e.detail.text) await this.onCreateTextMessage(e.detail.text);
                               if (e.detail.wal) await this.onCreateHrlMessage(e.detail.wal);
                               if (e.detail.file && this._selectedThreadHash) await this.onCreateFileMessage(this._selectedThreadHash, e.detail.file);                               
                               this._replyToAh = undefined;
                               this._selectedBeadAh = undefined;
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
    if (this._mainView == MainViewType.Files) {
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
            <div style="height: 100%; display: flex; flex-direction: column; gap: 10px; margin-left:10px; margin-top:10px;">
              <div style="display: flex; flex-direction: row; gap:15px;">
                  <ui5-button icon="upload-to-cloud" design="Emphasized" @click=${(_e:any) => this.openFile()}>${msg("Upload File")}</ui5-button>
              </div>
              <file-table type="group" notag view
                          style="flex-grow: 1;"
                          .items=${publicItems}
                          @download=${(e: CustomEvent<EntryId>) => {console.log("download", e.detail.b64); this._filesDvm.downloadFile(e.detail)}}
              ></file-table>
            </div>
        </cell-context>          
      `;
    }

    const searchValue = this.shadowRoot!.getElementById("search-field")? (this.shadowRoot!.getElementById("search-field") as Input).value : "";
    const searchParameters = parseSearchInput(searchValue, this._dvm.profilesZvm.perspective);

    let notifSetting = NotifySetting.MentionsOnly; // default
    if (this._selectedThreadHash) {
      notifSetting = this._dvm.threadsZvm.perspective.getNotifSetting(this._selectedThreadHash, this.cell.address.agentId);
    }
    //console.log("<vines-page>.render() notifSettings", notifSetting, this._selectedThreadHash);

    /** Group Info */
    let groupProfile: GroupProfile = {
      name: "Vines",
      icon_src: "icon.png",
    };

    /* Use weServices, otherise try from dna properties */
    if(this.weServices) {
      const appletInfo = this.weServices.appletInfoCached(new EntryId(this.weServices.appletIds[0]!));
      //console.log("get appletInfo", appletInfo);
      if (appletInfo) {
        //console.log("get groupProfile", appletInfo.groupsHashes[0]);
        const weGroup = this.weServices.groupProfileCached(new DnaId(appletInfo.groupsHashes[0]!));
        if (weGroup) {
          groupProfile = weGroup;
        }
      }
    } else {
      if (this._dvm.dnaProperties.groupName && this._dvm.dnaProperties.groupName != "MyTeam") {
        groupProfile.name = this._dvm.dnaProperties.groupName;
      }
      if (groupProfile.name == "Vines" && this._dvm.cell.dnaModifiers.network_seed) {
        groupProfile.name = this._dvm.cell.dnaModifiers.network_seed;
      }
      if (this._dvm.dnaProperties.groupSvgIcon) {
        groupProfile.icon_src = `data:image/svg+xml;base64,${this._dvm.dnaProperties.groupSvgIcon}`;
      }
    }

    /** Get network info for this cell */
    //const sId = this.cell.address.str;
    //const networkInfos = this.appProxy && this.appProxy.networkInfoLogs[sId]? this.appProxy.networkInfoLogs[sId] : [];
    //const networkInfo = networkInfos && networkInfos.length > 0 ? networkInfos[networkInfos.length - 1]![1] : null;

    let lister= html``;

    switch (this._listerToShow) {
      case "tools-option":
        lister = html`<tool-lister ?collapsed=${this._collapseAll}></tool-lister>`;
      break;
      case "mine-option":
        lister = html`
          <my-threads-lister ?collapsed=${this._collapseAll}
                         .showArchivedSubjects=${this._canViewArchivedSubjects}
                         .selectedThreadHash=${this._selectedThreadHash}
                         @createThreadClicked=${(e : CustomEvent<ActionId>) => {
          this._createTopicHash = e.detail;
          this.createThreadDialogElem.show()
          }}></my-threads-lister>
        `;
      break;
      case "topics-option":
        lister = this.multi? html`` : html`
            <topics-lister ?collapsed=${this._collapseAll} ?alphabetical=${this._canAlphabetical}
                           .showArchivedTopics=${this._canViewArchivedSubjects}
                           .selectedThreadHash=${this._selectedThreadHash}
                           @createThreadClicked=${(e: CustomEvent<ActionId>) => {
                               this._createTopicHash = e.detail;
                               this.createThreadDialogElem.show();
                           }}></topics-lister>
        `;
        break;
    }

    const dmLister = this.multi? html`
        <dm-multi-lister nobtn
                .showArchived=${this._canViewArchivedSubjects}
                .selectedThreadHash=${this._selectedThreadHash}
                @createNewDm=${(_e:any) => {
                    const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                    dialog.show();
                }}
        ></dm-multi-lister>
    ` : html`
        <dm-lister id="dmLister" nobtn
                .showArchived=${this._canViewArchivedSubjects}
                .selectedThreadHash=${this._selectedThreadHash}
                @createNewDm=${(_e:any) => {
                    const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                    dialog.show();
                }}
        ></dm-lister>
    `;


    const toggleLeftBtn = html`
        <ui5-button icon="menu2" tooltip=${msg("Show side panel")}
                    class="${this._canShowLeft? "pressed" : ""}                    
                    slot="startButton"
                    style="margin-right:5px; display: ${this._canShowLeft? "none" : ""}"
                    @click=${(_e:any) => this._canShowLeft = true} >
        </ui5-button>
    `;

    let maybeBackBtn = html``;
    if (this._selectedThreadHash) {
      const thread = this._dvm.threadsZvm.perspective.threads.get(this._selectedThreadHash);
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
                <div style="display: flex; flex-direction: column; align-items: stretch; padding-top:12px; margin-left:10px; flex-grow:1; min-width:0; margin-bottom: 5px">
                    <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:1.25rem">${msg("DMs Cross View")}</div>
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
                            ${profileCount} ${msg('Members')}
                        </div>
                    </div>
                    <ui5-button id="shareBtn" icon="share-2" tooltip=${msg("Share Network")}
                                design="Transparent"  style="margin-top:10px;"
                                @click=${ async (e:any) => {
                                  e.preventDefault(); e.stopPropagation();
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
                    <ui5-button design="Transparent" tooltip=${msg('Close side panel')}
                                icon="slim-arrow-left"
                                style="margin-top:10px;"
                                @click=${(_e:any) => this._canShowLeft = false}>
                    </ui5-button>
                </div>
                
                <!-- Custom Segmented buttons -->
                <div style="display: flex; flex-direction: row; gap:3px; background: #D2D2D2; height: 30px; margin: 10px 10px 10px 10px; border-radius: 5px; padding: 3px;">
                    <div id="topicsBtn" class="listerbtn selected" @click=${(e:any) => {
                        e.preventDefault(); e.stopPropagation();
                        this._listerToShow = "topics-option";
                        const topicsBtn = this.shadowRoot!.getElementById("topicsBtn") as HTMLElement;
                        topicsBtn.classList.add("selected");
                        const toolsBtn = this.shadowRoot!.getElementById("toolsBtn") as HTMLElement;
                        toolsBtn.classList.remove("selected");
                        const mineBtn = this.shadowRoot!.getElementById("mineBtn") as HTMLElement;
                        mineBtn.classList.remove("selected");
                        this.requestUpdate();
                    }}>${msg('Topics')}</div>
                    <div id="toolsBtn" class="listerbtn" @click=${(e:any) => {
                        e.preventDefault(); e.stopPropagation();
                        this._listerToShow = "tools-option";
                        const topicsBtn = this.shadowRoot!.getElementById("topicsBtn") as HTMLElement;
                        topicsBtn.classList.remove("selected");
                        const toolsBtn = this.shadowRoot!.getElementById("toolsBtn") as HTMLElement;
                        toolsBtn.classList.add("selected");
                        const mineBtn = this.shadowRoot!.getElementById("mineBtn") as HTMLElement;
                        mineBtn.classList.remove("selected");
                        this.requestUpdate();
                    }}>${msg('Tools')}</div>
                    <div id="mineBtn" class="listerbtn" @click=${(e:any) => {
                        e.preventDefault(); e.stopPropagation();
                        this._listerToShow = "mine-option";
                        const topicsBtn = this.shadowRoot!.getElementById("topicsBtn") as HTMLElement;
                        topicsBtn.classList.remove("selected");
                        const toolsBtn = this.shadowRoot!.getElementById("toolsBtn") as HTMLElement;
                        toolsBtn.classList.remove("selected");
                        const mineBtn = this.shadowRoot!.getElementById("mineBtn") as HTMLElement;
                        mineBtn.classList.add("selected");
                        this.requestUpdate();
                    }}>${msg('My')}</div>                    
                </div>

                <!-- Action buttons -->
                <div style="display:flex; flex-direction:row; margin-right: 5px;">
                    <div style="flex-grow: 1;"></div>
                    <div style="display:flex; flex-direction:row;border-bottom: 1px solid #d2d2d2; border-radius: 10px; margin-right: 5px">
                    <ui5-button icon="expand-all" design="Transparent" style="height:18px;" tooltip=${msg("Expand All")} @click=${(_e:any) => this._collapseAll = false}></ui5-button>                    
                    <ui5-button icon="collapse-all" design="Transparent" style="height:18px;" tooltip=${msg("Collapse All")} @click=${(_e:any) => this._collapseAll = true}></ui5-button>
                    <ui5-button icon=${this._canAlphabetical? "time-account" : "alphabetical-order"} design="Transparent" style="height:18px;" tooltip=${this._canAlphabetical? msg("Sort by creation time"): msg("Sort alphabetically")} @click=${(_e:any) => this._canAlphabetical = !this._canAlphabetical}></ui5-button>                    
                    <ui5-button icon=${this._canViewArchivedSubjects? "hide" : "show"} design="Transparent" style="height:18px;" tooltip=${msg("View/Hide Archived")} @click=${(_e:any) => this._canViewArchivedSubjects = !this._canViewArchivedSubjects}></ui5-button>
                    <ui5-button icon="accept" design="Transparent" style="height:18px;" tooltip=${msg("Mark all as read")} @click=${this.onCommitBtn}></ui5-button>
                    ${this._listerToShow == "topics-option" ? html`
                        <ui5-button icon="add" design="Transparent" style="height:18px;" tooltip=${msg("Create new Topic")} 
                                    @click=${(_e:any) => this.createTopicDialogElem.show()}></ui5-button>` : html``}
                    </div>
                </div>
    `;


    const filteredInbox = this._dvm.threadsZvm.perspective.filteredInbox();
    //console.log("filteredInbox", filteredInbox);

    /** Render all */
    return html`
        <div id="mainDiv"
             @commenting-clicked=${this.onCommentingClicked}
             @reply-clicked=${this.onReplyClicked}
             @edit-topic-clicked=${this.onEditTopicClicked}>

            <div id="leftSide" style="display: ${this._canShowLeft ? "flex" : "none"}; position: relative"
                 @contextmenu=${(e: any) => {
                     console.log("LeftSide contextmenu", e);
                     // e.preventDefault();
                     // const menu = this.shadowRoot!.getElementById("groupMenu") as Menu;
                     // const btn = this.shadowRoot!.getElementById("groupBtn") as Button;
                     // menu.showAt(btn);
                     // //menu.style.top = e.clientY + "px";
                     // //menu.style.left = e.clientX + "px";
                 }}>

                <div id="dmSign"><ui5-icon name="arrow-bottom" style="color: #373535;margin-right: 3px;"></ui5-icon><div>${msg("DMs")}</div></div>
                
                ${topLeft}
                
                <div id="listerGroup" style="display: flex; flex-direction: column; overflow: auto">
                  ${lister}
                  <!-- Messages -->
                  <div style="display: flex; flex-direction: row; gap: 10px;align-items: center; margin-left: 10px; color: grey;">
                      <ui5-icon style="width: 1.2rem; height: 1.2rem" name="paper-plane"></ui5-icon>
                      <span style="width: 1.2rem; height: 1.2rem">${msg("Messages")}</span>
                      <span style="flex-grow: 1"></span>
                      <ui5-button icon="add" tooltip=${msg("Message a peer")}
                                  design="Transparent"
                                  style="color:grey; margin-right: 8px;"
                                  @click=${async (e: any) => {
                                      e.stopPropagation();
                                      await this.updateComplete;
                                      const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                                      dialog.show();
                                  }}>
                      </ui5-button>
                  </div>
                  ${dmLister}
                  <div style="min-height: 50px"></div>
                </div>
                <div style="flex-grow: 1"></div>
                    <!--
                <div style="display:flex; flex-direction:row; height:44px; border:1px solid #fad0f1;background:#f1b0b0">
                    <ui5-button design="Transparent" icon="action-settings" tooltip="Go to settings"
                                @click=${async () => {
                    await this.updateComplete;
                    this.dispatchEvent(new CustomEvent<boolean>('debug', {
                        detail: true,
                        bubbles: true,
                        composed: true
                    }));
                }}
                    ></ui5-button>
                    <ui5-button icon="activate" tooltip="Commit logs" design="Transparent"
                                @click=${this.onCommitBtn}></ui5-button>
                </div> -->
                <div id="profile-row">
                    <div id="profile-div"
                         style="display: flex; flex-direction: row; cursor:pointer;flex-grow:1;min-width: 0; margin-left:2px"
                         @click=${(e: any) => {
                             e.stopPropagation();
                             this.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {
                                 detail: {
                                     agentId: this.cell.address.agentId,
                                     x: e.clientX,
                                     y: e.clientY
                                 }, bubbles: true, composed: true
                             }));
                         }}>
                        ${avatar}
                        <div style="display: flex; flex-direction: column; align-items: stretch;padding-top:18px;margin-left:5px;flex-grow:1;min-width: 0;">
                            <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis;color:#1B2A39ED;">
                                <abbr title=${this.cell.address.agentId.b64}>${myProfile.nickname}</abbr></div>
                                <!-- <div style="font-size: small">${this.cell.address.agentId.b64}</div> -->
                        </div>
                    </div>
                    <ui5-button icon="picture" design="Transparent"  tooltip=${msg("View Files")}
                                style="margin-top:10px; ${this._mainView == MainViewType.Files ? "background: #4684FD; color: white;" : ""}"
                                @click=${() => this.dispatchEvent(filesJumpEvent())}>
                    </ui5-button>                     
                    <ui5-button icon="favorite-list" design="Transparent" tooltip=${msg("View Favorites")}
                                style="margin-top:10px; ${this._mainView == MainViewType.Favorites ? "background: #4684FD; color: white;" : ""}"
                                @click=${() => this.dispatchEvent(favoritesJumpEvent())}>
                    </ui5-button>
                    <ui5-button id="settingsBtn" style="margin-top:10px;"
                                design="Transparent" icon="action-settings" tooltip=${msg("Settings")}
                                @click=${(_e: any) => {
                                    const settingsMenu = this.shadowRoot!.getElementById("settingsMenu") as Menu;
                                    const settingsBtn = this.shadowRoot!.getElementById("settingsBtn") as Button;
                                    settingsMenu.showAt(settingsBtn);
                                }}>
                    </ui5-button>
                    <ui5-menu id="settingsMenu" header-text=${msg("Settings")}
                              @item-click=${(e: any) => this.onSettingsMenu(e)}>
                        <ui5-menu-item id="editProfileItem" text=${msg("Edit Profile")}
                                       icon="user-edit"></ui5-menu-item>
                        <ui5-menu-item id="syncItem" text=${msg("Probe peers for content")} icon="download-from-cloud" starts-section></ui5-menu-item>
                        <ui5-menu-item id="exportItem" text="Export" icon="save" starts-section></ui5-menu-item>
                        <ui5-menu-item id="importCommitItem" text=${msg("Import and commit")}
                                       icon="open-folder"></ui5-menu-item>
                        <ui5-menu-item id="importOnlyItem" text=${msg("Import only")}
                                       icon="open-folder"></ui5-menu-item>
                        <ui5-menu-item id="dumpItem" text="Dump Threads logs"></ui5-menu-item>                        
                        ${HAPP_BUILD_MODE == HappBuildModeType.Retail? html`
                        <ui5-menu-item id="bugItem" text=${msg("Report Bug")} icon="marketing-campaign"
                                       starts-section></ui5-menu-item>
                        ` : html`
                        <ui5-menu-item id="exportAllItem" text=${msg("Export All")} icon="save"
                                       starts-section></ui5-menu-item>
                        <ui5-menu-item id="eraseItem" text="Erase logs"></ui5-menu-item>
                        <ui5-menu-item id="dumpFilesItem" text="Dump Files logs"></ui5-menu-item>
                        <ui5-menu-item id="dumpNetworkItem" text="Dump Network logs"></ui5-menu-item>
                        `}
                    </ui5-menu>
                    <!-- Network Health Panel -->
                    <ui5-popover id="networkPopover">
                        <div slot="header"
                             style="display:flex; flex-direction:row; width:100%; margin:5px; font-weight: bold;">
                            <abbr title=${this.cell.address.dnaId.b64}>${msg("Network Health")}</abbr>
                            <div style="flex-grow: 1;"></div>
                        </div>
                        <network-health-panel .appProxy=${this.appProxy}></network-health-panel>
                        <div slot="footer"
                             style="display:flex; flex-direction:row; width:100%; margin:5px; margin-right:0px;">
                            <div style="flex-grow: 1;"></div>
                            <ui5-button slot="footer" design="Emphasized" @click=${() => {
                                const popover = this.shadowRoot!.getElementById("networkPopover") as Popover;
                                if (popover.isOpen()) {
                                    popover.close();
                                }
                            }}
                            >${msg('Close')}
                            </ui5-button>
                        </div>
                    </ui5-popover>
                    <!-- Share Network -->
                    <ui5-popover id="shareNetworkPopover">
                        <div slot="header"
                             style="display:flex; flex-direction:row; width:100%; margin:5px; font-weight: bold;">
                            ${msg("Share Network")}
                            <div style="flex-grow: 1;"></div>
                        </div>
                        <div>${msg('Share this code with a peer to grant them access to this Network')}
                            (seed: "${this.cell.dnaModifiers.network_seed}")</div>
                        <ui5-textarea .value=${this.cell.shareCode}></ui5-textarea>
                        <div slot="footer"
                             style="display:flex; flex-direction:row; width:100%; margin:5px; margin-right:0px;">
                            <div style="flex-grow: 1;"></div>
                            <ui5-button slot="footer" design="Emphasized" @click=${() => {
                                navigator.clipboard.writeText(this.cell.shareCode);
                                toasty(msg("Copied share code to clipboard"));
                                const popover = this.shadowRoot!.getElementById("shareNetworkPopover") as Popover;
                                if (popover.isOpen()) {
                                    popover.close();
                                }
                            }}
                            >${msg('Copy Joining Code')}
                            </ui5-button>
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
                    <ui5-input id="search-field" placeholder=${msg('Search')} show-clear-icon
                               style="border-radius: 10px; border: none; height: 32px;"
                               @input=${(e: any) => {
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
                               @keypress=${(e: any) => {
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
                    >
                        <ui5-icon slot="icon" name="search"></ui5-icon>
                    </ui5-input>
                    <div style="flex-grow: 1"></div>
                    <div id="topBarBtnGroup">
                        ${this._selectedThreadHash === undefined ? html`` :
                                html`
                                    <ui5-button id="notifSettingsBtn"
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
                        ${
                            HAPP_BUILD_MODE == HappBuildModeType.Retail? html`` : /*html``*/
                                    html`<ui5-button icon="developer-settings" @click=${() => this._canShowDebug = !this._canShowDebug}></ui5-button>`
                        }
                        <div style="display:flex; flex-direction: row-reverse; align-items: center;">
                            <ui5-button icon="inbox" tooltip=${msg('Inbox')}
                                        style="color: ${filteredInbox.length? "#33A000" : ""}"
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
                            <span class="numberBadge">${filteredInbox.length ? filteredInbox.length : ""}</span>
                        </div>
                    </div>
                </div>

                <ui5-popover id="searchPopover" header-text="SEARCH FOR: " hide-arrow placement-type="Bottom"
                             horizontal-align="Stretch">
                    <div class="popover-content">
                        <ui5-list mode="None" separators="None">
                            <ui5-li-groupheader class="search-group-header">${msg("Search Options")}
                            </ui5-li-groupheader>
                            <ui5-li @click=${(_e: any) => this.addSearch("in:")}><b>in:</b> <i>thread</i></ui5-li>
                            <ui5-li @click=${(_e: any) => this.addSearch("from:")}><b>from:</b> <i>user</i></ui5-li>
                            <ui5-li @click=${(_e: any) => this.addSearch("mentions:")}><b>mentions:</b> <i>user</i>
                            </ui5-li>
                            <ui5-li @click=${(_e: any) => this.addSearch("before:")}><b>before:</b> <i>date</i></ui5-li>
                            <ui5-li @click=${(_e: any) => this.addSearch("after:")}><b>after:</b> <i>date</i></ui5-li>
                        </ui5-list>
                    </div>
                </ui5-popover>

                <ui5-popover id="notifPopover" header-text="Inbox" placement-type="Bottom" horizontal-align="Right"
                             hide-arrow style="max-width: 500px">
                    <notification-list></notification-list>
                </ui5-popover>

                <ui5-popover id="notifSettingsPopover" placement-type="Bottom" horizontal-align="Right" hide-arrow
                             header-text=${msg("Notification settings for this channel")}>
                    <div style="flex-direction: column; display: flex">
                        <ui5-radio-button id="notifSettingsAll" name="GroupA" text=${msg("All Messages")}
                                          @change=${(_e: any) => this.onNotifSettingsChange()}
                                          ?checked=${(notifSetting == NotifySetting.AllMessages) as Boolean}><
                        </ui5-radio-button>
                        <ui5-radio-button id="notifSettingsMentions" name="GroupA"
                                          text=${msg("Mentions and Replies Only")}
                                          @change=${(_e: any) => this.onNotifSettingsChange()}
                                          ?checked=${(notifSetting == NotifySetting.MentionsOnly) as Boolean}></ui5-radio-button>
                        <ui5-radio-button id="notifSettingsNever" name="GroupA" text=${msg("Never")}
                                          @change=${(_e: any) => this.onNotifSettingsChange()}
                                          ?checked=${(notifSetting == NotifySetting.Never) as Boolean}></ui5-radio-button>
                    </div>
                </ui5-popover>

                <div id="lowerSide">
                    <div id="centerSide">
                        ${centerSide}
                    </div>
                    ${this._canShowComments ? html`
                        <div id="commentSide">
                            <comment-thread-view id="comment-view" .threadHash=${this._selectedCommentThreadHash}
                                                 showInput="true"
                                                 .subjectName="${this._selectedCommentThreadSubjectName}"
                                                 @close=${(_e:any) => this._canShowComments = false}></comment-thread-view>
                        </div>` : html``}
                    ${this._canShowSearchResults ? html`
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
                <peer-list @avatar-clicked=${async (e: any) => {
                    console.log("@avatar-clicked", e.detail)
                    const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                    dialog.close();
                    const ppAh = await this._dvm.threadsZvm.createDmThread(e.detail, this.weServices);
                    if (this.multi) {
                        this.dispatchEvent(multiJumpEvent(ppAh, e.detail));
                    } else {
                      this.dispatchEvent(threadJumpEvent(ppAh));
                    }
                }}></peer-list>
                <ui5-button
                        style="margin-top: 10px; float: right;"
                        @click=${(_e: any) => {
                            const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                            dialog.close()
                        }}>
                    Cancel
                </ui5-button>
            </ui5-dialog>
            <!-- Profile Dialog/Popover -->
            <ui5-popover id="profilePop" hide-arrow allow-target-overlap placement-type="Right" style="min-width: 0px;">
                <profile-panel id="profilePanel"
                               @edit-profile=${(_e: any) => (this.shadowRoot!.getElementById("profilePop") as Popover).close()}
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
                        .saveProfileLabel=${msg('Edit Profile')}
                        @cancel-edit-profile=${() => this.profileDialogElem.close(false)}
                        @lang-selected=${(e: CustomEvent) => setLocale(e.detail)}
                        @save-profile=${(e: CustomEvent) => this.onSaveProfile(e.detail)}
                ></vines-edit-profile>
            </ui5-dialog>
            <!-- Confirm Dialog -->
            <confirm-dialog id="confirm-hide-topic" @confirmed=${(_e: any) => {
            }}></confirm-dialog>
            <!-- View Embed Dialog -->
            <view-embed-dialog id="view-embed"></view-embed-dialog>
            <!-- View File Dialog -->
            <cell-context .cell=${this._filesDvm.cell} style="height: 100%">
              <sl-dialog id="view-file-dialog" label=${msg("File Info")}>
                  <file-view id="file-viewer"></file-view>
              </sl-dialog>
            </cell-context>
            <!-- Create Topic Dialog -->
            <ui5-dialog id="create-topic-dialog" header-text=${msg('Create Topic')}>
                <section>
                    <div>
                        <ui5-label for="topicTitleInput" required>${msg("Title")}:</ui5-label>
                        <ui5-input id="topicTitleInput" @keydown=${(e: any) => {
                            if (e.keyCode === 13) {
                                e.preventDefault();
                                this.onCreateTopic(e);
                            }
                        }}>
                            <div id="topicErrorMsg" slot="valueStateMessage">${msg("Minimum 3 characters")}</div>
                        </ui5-input>
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
                        <ui5-input id="editTopicTitleInput" @keydown=${(e: any) => {
                            if (e.keyCode === 13) {
                                e.preventDefault();
                                this.onEditTopic(e);
                            }
                        }}>
                            <div id="editTopicErrorMsg" slot="valueStateMessage">${msg("Minimum 3 characters")}</div>
                        </ui5-input>
                    </div>
                </section>
                <div slot="footer">
                    <ui5-button id="createTopicDialogButton"
                                style="margin-top:5px" design="Emphasized" @click=${this.onEditTopic}>
                        ${msg("Edit")}
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
                                   @keydown=${async (e: any) => {
                                       if (e.keyCode === 13) {
                                           e.preventDefault();
                                           await this.onCreateThread(e);
                                       }
                                   }}>
                            <div id="channelErrorMsg" slot="valueStateMessage">${msg("Minimum 1 character")}</div>
                        </ui5-input>
                    </div>
                </section>
                <div slot="footer" style:
                "display:flex;">
                <ui5-button id="createThreadDialogButton" style="margin-top:5px" design="Emphasized"
                            @click=${async (e: any) => await this.onCreateThread(e)}>
                    ${msg("Create")}
                </ui5-button>
                <ui5-button style="margin-top:5px" @click=${(_e: any) => this.createThreadDialogElem.close(false)}>
                    Cancel
                </ui5-button>
        </div>
        </ui5-dialog>
    `;
  }


  /** */
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
      /*const splitObj =*/ await splitFile(file, this._filesDvm.dnaProperties.maxChunkSize);
      const maybeSplitObj = await this._filesDvm.startPublishFile(file, []/*this._selectedTags*/, this._dvm.profilesZvm.perspective.agents, async (_manifestEh) => {
        toasty(msg("File successfully shared") + ": " + file.name);
        console.log("<vines-page> File upload complet. requesting update.");
        await delay(50); // required
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
      case "viewArchived": this._canViewArchivedSubjects = !this._canViewArchivedSubjects; break;
      case "markAllRead": this.onCommitBtn(e); break;
    }
  }



  /** */
  async onSettingsMenu(e:any): Promise<void> {
    console.log("item-click", e);
    this.waitDialogElem.show();
    let content = "";
    switch (e.detail.item.id) {
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
      case "syncItem":
        this._filesDvm.probeAll();
        this._dvm.probeAll();
      break;
      case "bugItem": window.open(`https://github.com/lightningrodlabs/threads/issues/new`, '_blank'); break;
      case "dumpItem": this._dvm.dumpCallLogs(); this._dvm.dumpSignalLogs(); break;
      case "eraseItem": this._dvm.purgeLogs(); break;
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
          position: relative;
        }

        presence-panel {
          position: absolute;
          top: 30px;
          right: 40px;
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
          margin-left: 5px;
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
          /*position: absolute;
          top: 5px;
          right: 8px;
          background-color: #33A000;
          color: white;
          border-radius: 50%;
          padding: 2px 5px;
          font-size: 10px;
          font-weight: bold;
          text-align: center;
          */
          background: #33A000;
          color: white;
          border-radius: 10px;
          padding: 1px 9px;
          font-size: 10px;
          font-weight: bold;
          margin-right: -5px;
          z-index: 10;
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
          box-shadow: 0px 3px 13px -7px #000000, -18px 0px 22px -2px rgba(197, 209, 208, 0);
        }

        #dmSign {
          /*width: 50px;*/
          flex-direction: row;
          border-radius: 20px;
          background: #8f8f8f;
          position: absolute;
          bottom: 70px;
          left: 90px;
          display: block;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 6px 8px;
          padding:10px;
        }
      `,

    ];
  }
}
