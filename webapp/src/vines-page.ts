import {css, html, LitElement, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {
  ActionId,
  AgentIdMap, decodeHappJoinInfo,
  delay,
  DnaElement, DnaId,
  EntryId,
  HappBuildModeType,
  intoDhtId, NetworkInfoResponse,
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
import "@ui5/webcomponents/dist/Card.js";
import "@ui5/webcomponents/dist/CardHeader.js";
import '@ui5/webcomponents/dist/CheckBox.js';
import "@ui5/webcomponents/dist/CustomListItem.js";
import "@ui5/webcomponents/dist/Dialog.js";
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents/dist/Label.js";
import "@ui5/webcomponents/dist/List.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Menu.js";
import "@ui5/webcomponents/dist/MenuItem.js";
import '@ui5/webcomponents/dist/MultiComboBox.js';
import '@ui5/webcomponents/dist/MultiComboBoxItem.js';
import "@ui5/webcomponents/dist/MultiInput.js";
import '@ui5/webcomponents/dist/features/InputSuggestions.js';
import "@ui5/webcomponents/dist/Option.js";
import "@ui5/webcomponents/dist/Panel.js";
import "@ui5/webcomponents/dist/Popover.js";
import "@ui5/webcomponents/dist/ProgressIndicator.js";
import "@ui5/webcomponents/dist/features/InputSuggestions.js";
import '@ui5/webcomponents/dist/RadioButton.js';
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
//import "@ui5/webcomponents-icons/dist/allIcons.js";
import "@ui5/webcomponents-icons/dist/action-settings.js"
import "@ui5/webcomponents-icons/dist/activate.js"
import "@ui5/webcomponents-icons/dist/action.js"
import "@ui5/webcomponents-icons/dist/accept.js"
import "@ui5/webcomponents-icons/dist/add.js"
import "@ui5/webcomponents-icons/dist/add-folder.js"
import "@ui5/webcomponents-icons/dist/add-favorite.js"
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
import "@ui5/webcomponents-icons/dist/electrocardiogram.js"
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
import "@ui5/webcomponents-icons/dist/history.js"
import "@ui5/webcomponents-icons/dist/inbox.js"
import "@ui5/webcomponents-icons/dist/information.js"
import "@ui5/webcomponents-icons/dist/journey-arrive.js"
import "@ui5/webcomponents-icons/dist/journey-depart.js"
import "@ui5/webcomponents-icons/dist/less.js"
import "@ui5/webcomponents-icons/dist/menu2.js"
import "@ui5/webcomponents-icons/dist/microphone.js"
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
import "@ui5/webcomponents-icons/dist/pull-down.js"
import "@ui5/webcomponents-icons/dist/qr-code.js"
import "@ui5/webcomponents-icons/dist/response.js"
import "@ui5/webcomponents-icons/dist/record.js"
import "@ui5/webcomponents-icons/dist/save.js"
import "@ui5/webcomponents-icons/dist/search.js"
import "@ui5/webcomponents-icons/dist/sort.js"
import "@ui5/webcomponents-icons/dist/slim-arrow-left.js"
import "@ui5/webcomponents-icons/dist/slim-arrow-right.js"
import "@ui5/webcomponents-icons/dist/share.js"
import "@ui5/webcomponents-icons/dist/share-2.js"
import "@ui5/webcomponents-icons/dist/sys-add.js"
import "@ui5/webcomponents-icons/dist/sys-enter.js"
import "@ui5/webcomponents-icons/dist/sys-enter-2.js"
import "@ui5/webcomponents-icons/dist/show.js"
import "@ui5/webcomponents-icons/dist/stop.js"
import "@ui5/webcomponents-icons/dist/synchronize.js"
import "@ui5/webcomponents-icons/dist/time-account.js"
import "@ui5/webcomponents-icons/dist/thing-type.js"
import "@ui5/webcomponents-icons/dist/user-edit.js"
import "@ui5/webcomponents-icons/dist/upload-to-cloud.js"
import "@ui5/webcomponents-icons/dist/unfavorite.js"
import "@ui5/webcomponents-icons/dist/validate.js"
import "@ui5/webcomponents-icons/dist/warning.js"
import "@ui5/webcomponents-icons/dist/workflow-tasks.js"

/**  */
import {AgentId, HappJoinInfo, LinkableId, MyDictionary} from "@ddd-qc/cell-proxy";

import '@vaadin/grid/theme/lumo/vaadin-grid.js';
import '@vaadin/grid/theme/lumo/vaadin-grid-selection-column.js';

import '@shoelace-style/shoelace/dist/themes/light.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
setBasePath('/shoelace-assets');

import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon/icon.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";

import 'css-doodle';

import {SlDialog} from "@shoelace-style/shoelace";
import ValueState from "@ui5/webcomponents-base/dist/types/ValueState.js";

import {
    AnyBeadMat,
    Bead,
    beadJumpEvent,
    catchThrottled,
    CommentRequest,
    composeNotificationTitle,
    ConfirmDialog,
    defaultLimitations,
    defaultModeration,
    doodle_flowers,
    EditTopicRequest,
    FavoritesEvent,
    favoritesJumpEvent,
    filesContext,
    filesJumpEvent,
    getThisAppletId,
    HideEvent,
    ICollapsable,
    InputBar,
    JumpEvent,
    latestThreadName,
    MainViewType, markdownItMentions, md,
    multiJumpEvent,
    networkCallerContext,
    NotifiableEvent,
    NotifySetting,
    onlineLoadedContext,
    parseSearchInput,
    ParticipationProtocol,
    ProfilePanel,
    renderAvatar,
    RulesEdit,
    RulesView,
    searchFieldStyleTemplate,
    sharedStyles,
    ShowProfileEvent,
    ShowRulesEvent,
    simplifyMimeType,
    SpecialSubjectType,
    Subject,
    THIS_APPLET_ID,
    Thread,
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
    unimportedProfiles,
} from "@vines/elements";

import {intoHrl, WeServicesEx, wrapPathInSvg} from "@ddd-qc/we-utils";

import {FrameNotification, Hrl, PeerStatusUpdate, WAL} from "@theweave/api";
import {consume} from "@lit/context";

import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm";
import {FileTableItem} from "@ddd-qc/files/dist/elements/file-table";
// @ts-ignore
import {FileButton} from "@ddd-qc/files/dist/elements/file-button";
import {FilesDvm, FileView, prettyFileSize, splitFile, SplitObject} from "@ddd-qc/files";
//import {StoreDialog} from "@ddd-qc/files/dist/elements/store-dialog";
import {HAPP_BUILD_MODE} from "@ddd-qc/lit-happ/dist/globals";
import {msg} from "@lit/localize";
import {getLocale, setLocale} from "./localization";
import {mdiInformationOutline} from "@mdi/js";
import {HoloHashB64, Timestamp, HoloHashType, AgentPubKeyB64} from "@holochain/client";
import {NetworkCaller} from "@ddd-qc/lit-happ/dist/NetworkCaller";
import {GetStrategy} from "@holochain-open-dev/core-types";
import {APP_VERSION} from "./generated/version";
import {APK_LINK, happShareCodeContext, isMobile} from "./globals";

// HACK: For some reason hc-sandbox gives the dna name as the cell name instead of the role name...
const FILES_CELL_NAME = HAPP_BUILD_MODE == HappBuildModeType.Debug? 'dFiles' : 'rFiles';
console.log("<vines-page> FILES_CELL_NAME", FILES_CELL_NAME);


/**
 * @element
 */
@customElement("vines-page")
export class VinesPage extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    window.addEventListener('beforeunload', async (_e: any) => {
      if (!this.weServices) {
        this.onBeforeUnload();
      }
    });
  }


  /** -- Properties -- */

  //@property() appProxy!: AppProxy; // for network info

  @consume({context: filesContext, subscribe: true})
  _filesDvm!: FilesDvm;

  @consume({context: networkCallerContext, subscribe: true})
  @property() networkCaller!: NetworkCaller;

  @consume({context: happShareCodeContext, subscribe: true})
  @property() happShareCodes!: [string, string | null, string][];

  @consume({context: weClientContext, subscribe: true})
  weServices!: WeServicesEx;

  @consume({context: onlineLoadedContext, subscribe: true})
  onlineLoaded!: boolean;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @property() multi: boolean = false;

  @property() wal?: WAL;


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
  @state() private _waitingForBeadCommit: Bead | undefined = undefined;
  @state() private _mainView: MainViewType | undefined = undefined;
  @state() private _replyToAh: ActionId | undefined = undefined;
  @state() private _selectedThreadHash: ActionId | undefined = undefined;
  @state() private _selectedBeadAh: ActionId | undefined = undefined;
  @state() private _currentCommentRequest: CommentRequest | undefined = undefined;
  @state() private _selectedCommentThreadHash: LinkableId | undefined = undefined
  private _selectedCommentThreadSubjectName: string = '';


  private _threadStack: ActionId[] = [];

  // @ts-ignore
  private _isDmListVisible: boolean = true;

  private _dmListObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      this._isDmListVisible = entry.isIntersecting;
      const dmSign = this.shadowRoot!.getElementById("dmSign") as HTMLElement;
      console.log("IntersectionObserver()", !!dmSign)
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
  @state() _uploadingFile: boolean = false;


  /** Notifications */
  private _lastKnownNotificationIndex = 0;


  /** -- Getters -- */

  get createTopicDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("create-topic-dialog") as Dialog;
  }

  get editChannelDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("edit-channel-dialog") as Dialog;
  }

  get editTopicDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("edit-topic-dialog") as Dialog;
  }

  get createThreadDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("create-thread-dialog") as Dialog;
  }

  get confirmThreadDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("confirm-thread-dialog") as Dialog;
  }

  get profileDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("profile-dialog") as Dialog;
  }

  get waitDialogElem(): Dialog {
    return this.shadowRoot!.getElementById("wait-dialog") as Dialog;
  }

    get importDialogElem(): Dialog {
        return this.shadowRoot!.getElementById("import-dialog") as Dialog;
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
    this.addEventListener('show-rules', this.onShowRules);
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
    this.addEventListener('view-file', this.onViewFile);
    // @ts-ignore
    // Event from Files webcomponents
    this.addEventListener('view', this.onViewFile);
    // @ts-ignore
    this.addEventListener('mouseup', this.handleMouse);
    // @ts-ignore
    this.addEventListener('copy', this.onCopy); // For debugging
    // @ts-ignore
    this.addEventListener('loop-network-info', this.onLoopNetworkInfo);
    // @ts-ignore
    this.addEventListener('vines-input-commit', this.onInputCommit);
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
    this.removeEventListener('show-rules', this.onShowRules);
    // @ts-ignore
    this.removeEventListener('archive', this.onArchive);
    // @ts-ignore
    this.removeEventListener('view-embed', this.onViewEmbed);
    // @ts-ignore
    this.removeEventListener('favorites', this.onFavorites);
    // @ts-ignore
    this.removeEventListener('view-file', this.onViewFile);
    // @ts-ignore
    this.removeEventListener('view', this.onViewFile);
    // @ts-ignore
    this.removeEventListener('mouseup', this.handleMouse);
    // @ts-ignore
    this.removeEventListener('copy', this.onCopy);
    // @ts-ignore
    this.removeEventListener('loop-network-info', this.onLoopNetworkInfo);
    // @ts-ignore
    this.removeEventListener('vines-input-commit', this.onInputCommit);
  }


  /** */
  onLoopNetworkInfo(_e: any) {
    console.debug("<vines-page> onLoopNetworkInfo()")
    if (!this.networkCaller?.isLooping()) {
      console.debug("<vines-page> Start loop")
      this.networkCaller?.startCallLoop(2000);
    } else {
      this.networkCaller?.stopCallLoop();
    }
  }


  /** */
  async onInputCommit(e: CustomEvent<VinesInputEvent>) {
    console.log("<vines-page> onInputCommit()", e.detail);
    let ppAh = e.detail.ppAh;
    this._waitingForBeadCommit = await this._dvm.threadsZvm.createNextBead(ppAh);
    /** DM */
    if (e.detail.agent) {
      console.debug("onInputCommit() is DM");
      try {
          await this._dvm.publishDm(e.detail.agent, ThreadsEntryType.TextBead, e.detail.text!, undefined, this.weServices);
      } catch(e:any) {
          toasty("Publish DM failed: " + e.failure);
          this._waitingForBeadCommit = undefined;
      }
      return;
    }
    /** Determine replyToAh */
    let replyToAh = this._replyToAh;
    if (!this._selectedThreadHash || this._selectedThreadHash != ppAh) {
      replyToAh = undefined;
    }
    this._selectedBeadAh = undefined;
    this._replyToAh = undefined;
    /** Cleanup */
    /* Create Text Message */
    if (e.detail.text) {
      if (this._currentCommentRequest) {
        ppAh = await this.publishCommentThread(this._currentCommentRequest);
        this._currentCommentRequest = undefined;
      }
      if (!ppAh) {
        console.error("No thread selected");
        this._waitingForBeadCommit = undefined;
        return;
      }
      try {
        await this._dvm.publishMessage(ThreadsEntryType.TextBead, e.detail.text, ppAh, undefined, replyToAh, this.weServices);
      } catch(error:any) {
        toasty("Publish Message failed: " + error.failure);
        this._waitingForBeadCommit = undefined;
        const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
        if (inputBar) {
          inputBar.setValue(e.detail.text);
        }
        console.warn(e);
      }
    }
    /* Create Wal Message */
    if (e.detail.wal) {
      //const entryInfo = await this.weServices.entryInfo(maybeHrl.hrl);
      try {
        // TODO: make sure hrl is an entryHash
        await this._dvm.publishMessage(ThreadsEntryType.AnyBead, e.detail.wal, ppAh, undefined, replyToAh, this.weServices);
      } catch(error:any) {
        toasty("Publish Message failed: " + error.failure);
        this._waitingForBeadCommit = undefined;
        console.warn(error);
        const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
        if (inputBar) {
          inputBar.setWal(e.detail.wal);
        }
      }
    }
    /* Create File Message */
    if (e.detail.file) {
      console.log("<vines-page>.onCreateFileMessage()", e.detail.file.name, e.detail.file, this._filesDvm);
      this._uploadingFile = true;
      this.requestUpdate();
      splitFile(e.detail.file, this._filesDvm.dnaProperties.maxChunkSize).then((obj) => {
        this._splitObj = obj;
        const succeeded = this._filesDvm.startPublishFile(e.detail.file!, obj, [], this._dvm.profilesZvm.perspective.agents,
          async (eh) => {
            console.debug("<vines-page> startPublishFile callback", eh);
            const type = simplifyMimeType(e.detail.file!.type);
            try {
                await this._dvm.publishMessage(
                    ThreadsEntryType.EntryBead,
                    { eh, size: e.detail.file!.size, type },
                    ppAh,
                    undefined,
                    replyToAh,
                    this.weServices,
                  );
            } catch(error:any) {
                toasty("Publish Message failed: " + error.failure);
                this._waitingForBeadCommit = undefined;
                const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
                console.warn("Publish Message failed:",  inputBar);
                if (inputBar && e.detail.file) {
                  inputBar.setFile(e.detail.file!);
                }
            }
            this._splitObj = undefined;
            this._uploadingFile = false;
          });
        if (!succeeded) {
          toasty(msg("Failed to load file"));
          this._waitingForBeadCommit = undefined;
          const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
          console.warn("Publish Message failed:",  inputBar);
          if (inputBar && e.detail.file) {
            inputBar.setFile(e.detail.file!);
          }
        }
      });
      //console.log("<vines-page>.onCreateFileMessage() requestUpdate()");
    }
  }


  /** */
  handleMouse(event: any) {
    // Handle the back/forward button press
    //console.log('handleMouse()', event);
    if (event.button === 4 || event.button === 5) {
      event.preventDefault();
      if (event.button === 4) { // back button
        console.log('Back button pressed - implement custom behavior');
        this.goBack();
      } else {
        // go forward
        // FIXME
      }
    }
  }


  /** */
  private _debugThreadAh?: ActionId;

  async onCopy(e: CustomEvent<Hrl>) {
    if (!e.detail) {
      console.warn("Invalid copy event");
      return;
    }
    const hrl: Hrl = e.detail;
    const threadAh = new ActionId(hrl[1]);
    console.log("THREAD", threadAh);
    //this._canShowDebug = true;
    //this._debugThreadAh = threadAh;
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
    } while (shadower);
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
      md.use(markdownItMentions, {
          getValidNames: () => {
              const profiles: [ActionId, ProfileMat][] = unimportedProfiles(newDvm.profilesZvm);
              const names: string[] = profiles.map(([_actionId, profile]) => profile.nickname);
              names.push("all");
              //console.log("markdownIt getValidNames()", names);
              return names;
          },
          getAgentKey: (name:string): AgentPubKeyB64 => {
              const agents = newDvm.profilesZvm.perspective.agentByName[name];
              if (!agents || agents.length == 0) {
                  return this.cell.address.agentId.b64;
              }
              return agents[0]!.b64;
          }
      });
  }


  /** */
  async onViewFile(e: CustomEvent<EntryId>) {
    const dialog = this.shadowRoot!.getElementById("view-file-dialog") as SlDialog;
    const fileView = this.shadowRoot!.getElementById("file-viewer") as FileView;
    console.log("onViewFile() FileDvm list:", this._filesDvm.zomeNames.join(", "))
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
    const verb = e.detail.hide? msg("Hide") : msg("Unhide");
    const dialog = this.shadowRoot!.getElementById("confirm-hide-topic") as ConfirmDialog;
    /** DM */
    if (e.detail.address.hashType == HoloHashType.Agent) {
      const agentId = new AgentId(e.detail.address.b64)
      dialog.title = verb + " " + msg("DM channel") + "?";
      this.addEventListener('confirmed', async (_f) => {
        if (e.detail.hide) {
          await this._dvm.threadsZvm.hideDmThread(agentId);
          toasty(msg(`DM channel hidden`));
        } else {
          await this._dvm.threadsZvm.unhideDmThread(agentId);
          toasty(msg("DM channel unhidden"));
        }
      });
      dialog.open();
      return;
    }
    /** Topic or Channel */
    const dhtId = intoDhtId(e.detail.address.b64);
    const type = e.detail.type == "Topic"? msg("Category") : msg("Channel");
    dialog.title = `${verb} ${type}?`;
    this.addEventListener('confirmed', async (_f) => {
      if (e.detail.hide) {
        await this._dvm.threadsZvm.hideSubject(dhtId);
        toasty(`${type} ${msg("hidden")}`);
      } else {
        await this._dvm.threadsZvm.unhideSubject(dhtId);
        toasty(`${type} ${msg("unhidden")}`);
      }
    });
    dialog.open();
  }


  /** */
  onShowRules(e: CustomEvent<ShowRulesEvent>) {
    console.log("onShowRules()", e.detail)
    const elem = this.getDeepestElemAt(e.detail.x, e.detail.y);
    //console.log("onShowProfile() elem", elem)
    const popover = this.shadowRoot!.getElementById("rulesPop") as Popover;
    const sub = this.shadowRoot!.getElementById("rulesPanel") as RulesView;
    const thread = this._dvm.threadsZvm.perspective.threads.get(e.detail.ppAh);
    if (thread) {
      sub.limitations = thread.pp.limitations;
      sub.moderation = thread.pp.moderation;
      sub.requestUpdate();
      popover.showAt(elem);
    }
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
  onEditProfile(_e: any) {
    /*await*/ this.profileDialogElem.show();
  }


  /** -- Update -- */

  // /** DEBUG */
  // protected override async willUpdate(changedProperties: PropertyValues<this>) {
  //  super.willUpdate(changedProperties);
  //   console.log("<vines-page>.willUpdate()", changedProperties);
  // }


  /** -- Update -- */


  private validateTitle(inputId: string, prev?: string): string | undefined {
    const input = this.shadowRoot!.getElementById(inputId) as Input;
    const name = input.value.trim();
    let childDivs = input.querySelectorAll('div');
    console.debug("validateTitle()", inputId);
    /** Must be different from previous */
    if (prev && prev == name) {
      input.valueState = ValueState.Error;
      childDivs[0]!.innerText = msg("Must be different from current title");
      return;
    }
    /** Must be at least 3 chars for link anchors */
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
  async onCreateTopic(_e: any) {
    const title = this.validateTitle("topicTitleInput");
    if (!title) {
      return;
    }
    await this._dvm.threadsZvm.publishSemanticTopic(title);
    this.createTopicDialogElem.close();
  }


  /** */
  async onEditTopic(_e: any) {
    const topicHash = this.editTopicDialogElem.getAttribute('TopicHash');
    if (!topicHash) {
      throw Promise.reject("Missing TopicHash attribute");
    }
    const current = this._dvm.threadsZvm.perspective.semanticTopics.get(new ActionId(topicHash))![0];
    const title = this.validateTitle("editTopicTitleInput", current);
    if (!title) {
      return;
    }
    await this._dvm.threadsZvm.editSemanticTopic(new ActionId(topicHash), title);
    this.editTopicDialogElem.close();
  }


  /** */
  async onEditChannel(_e: any) {
    const hash = this.editChannelDialogElem.getAttribute('ChannelHash');
    if (!hash) {
      throw Promise.reject("Missing ChannelHash attribute");
    }
    const current = this._dvm.threadsZvm.perspective.threads.get(new ActionId(hash))!.title;
    const title = this.validateTitle("editChannelTitleInput", current);
    if (!title) {
      return;
    }
    await this._dvm.threadsZvm.editThreadTitle(new ActionId(hash), title);
    this.editChannelDialogElem.close();
  }


  /** */
  async onCreateThread() {
    console.debug("onCreateThread()");
    /** Check purpose */
    const input = this.shadowRoot!.getElementById("threadPurposeInput") as Input;
    const purpose = input.value.trim();

    if (purpose.length < 1) {
      input.valueState = ValueState.Error;
      return;
    }
    const regex = new RegExp(`^["a-zA-Z0-9-_ "]+$`);
    const isValid = regex.test(purpose);
    if (!isValid) {
      input.valueState = ValueState.Error;
      const errorMsg = this.shadowRoot!.getElementById("channelErrorMsg") as HTMLElement;
      console.log("ValidateTopic() channel", errorMsg);
      errorMsg.textContent = msg("Invalid characters");
      return;
    }
    /** Check Rules */
    const rules = this.shadowRoot!.getElementById("rulesEdit") as RulesEdit;
    if (!rules.isValid()) {
      return;
    }
    /** Check Subject */
    if (!this._createTopicHash) {
      console.warn("Missing Topic hash");
      return;
    }
    /** Set confirm view data */
    let rulesEdit = this.shadowRoot!.getElementById("rulesEdit") as RulesEdit;
    const confirmRulesView = this.shadowRoot!.getElementById("confirm-rules-view") as RulesView;
    confirmRulesView.limitations = rulesEdit.limitations;
    confirmRulesView.moderation = rulesEdit.moderation;
    /** Create directly if default rules */
    if (rulesEdit.isDefault) {
      this.onConfirmedCreateThread();
      return;
    }
    /** Display Confirm Dialog */
    this.confirmThreadDialogElem.headerText = msg("Confirm new channel") + ": " + purpose;
    this.confirmThreadDialogElem.show();

  }

  /** */
  async onConfirmedCreateThread() {
    /** Grab data */
    const input = this.shadowRoot!.getElementById("threadPurposeInput") as Input;
    const purpose = input.value.trim();
    let rulesEdit = this.shadowRoot!.getElementById("rulesEdit") as RulesEdit;
    /** Publish */
    const [_ts, ppAh] = await this._dvm.threadsZvm.publishThreadFromSemanticTopic(
      this.weServices? new EntryId(this.weServices.appletIds[0]!) : THIS_APPLET_ID,
      this._createTopicHash!,
      purpose,
      rulesEdit.limitations,
      rulesEdit.moderation,
    );
    /** cleanup */
    input.valueState = ValueState.None;
    input.value = "";
    rulesEdit.reset();
    this.confirmThreadDialogElem.close(false);
    this.createThreadDialogElem.close(false);
    /** Jump to new thread */
    this.dispatchEvent(threadJumpEvent(ppAh));
  }


  /** */
  async publishDmFromProfilePanel(inputText: string) {
    console.log("<vines-page>.publishDmFromProfilePanel()", inputText, this._dvm.profilesZvm)
    const sub = this.shadowRoot!.getElementById("profilePanel") as ProfilePanel;
    const otherAgent: AgentId = sub.hash;
    console.log("publishDmFromProfilePanel() otherAgent", otherAgent)
      try {
    await this._dvm.publishDm(otherAgent, ThreadsEntryType.TextBead, inputText, undefined, this.weServices);
    } catch(e:any) {
        toasty("Publish DM failed: " + e.failure);
        return;
    }
    this._replyToAh = undefined;
    this._selectedBeadAh = undefined;
    //await delay(1000);
    //this.dispatchEvent(beadJumpEvent(beadAh));
    const dmThreadAh = this._dvm.threadsZvm.perspective.dmAgents.get(otherAgent);
    if (dmThreadAh) {
      this.dispatchEvent(threadJumpEvent(dmThreadAh));
    }
  }


  /** */
  async onCreateSemanticTopic(topic: string) {
    await this._dvm.threadsZvm.publishSemanticTopic(topic);
  }


  private _canSpin = false;

  /** After first render only */
  override async firstUpdated() {
    console.log("<vines-page> firstUpdated()", this._dvm.threadsZvm.perspective.globalProbeLogTs);

    /** Register loop callback */
    this.networkCaller!.addCallback((r: NetworkInfoResponse) => {
      //console.log("<vines-page>.networkCaller callback", metrics);
      if (r.error != undefined) {
        return;
      }
      /** Update peer-list */
      const elem = this.shadowRoot!.getElementById("peer-status") as LitElement;
      if (elem) {
          elem.requestUpdate();
      }
      /** Show spinner if there are pending requests */
      let total = 0;
      for (const peerUrls of Object.values(r.metrics!.fetch_state_summary.pending_requests)) {
        total += peerUrls.length;
      }
      const toggled = this._canSpin != total > 0;
      if (toggled) {
        this._canSpin = total > 0;
        this.requestUpdate();
      }
    });

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
    if (!this.multi) {
        await this._dvm.threadsZvm.probeAllLatest();
    }

    /** Select Topics */
    const topicsBtn = this.shadowRoot!.getElementById("topics-option") as SegmentedButtonItem;
    if (topicsBtn) {
      topicsBtn.pressed = true;
    }

    /** Fiddle with shadow parts CSS */
    const searchField = this.shadowRoot!.getElementById('search-field') as Input;
    console.log("search-field", searchField, searchField.shadowRoot);
    if (searchField) {
      searchField.shadowRoot!.appendChild(searchFieldStyleTemplate.content.cloneNode(true));
      this.requestUpdate();
    }
    /** Grab all AppletIds & GroupProfiles */
    if (this.weServices) {
      console.debug("<vines-page>.firstUpdated() cacheFullAppletInfo", this.weServices);
      //const appletIds = await this._dvm.threadsZvm.pullAppletIds();
      console.debug("<vines-page> firstUpdated() appletIds", this._dvm.threadsZvm.perspective.appletIds);
      for (const appletId of this._dvm.threadsZvm.perspective.appletIds) {
        //console.debug("<vines-page> firstUpdated() cacheFullAppletInfo() appletId", appletId);
        /*const res =*/ await this.weServices.cacheFullAppletInfo(appletId);
        //console.debug("<vines-page> firstUpdated() cacheFullAppletInfo() res", res);
      }
      /** Register callback */
      try {
        this.weServices.onBeforeUnload(() => this.onBeforeUnload());
        this.weServices.onPeerStatusUpdate((peerStatusList: PeerStatusUpdate) => {
            //console.log("<vines-page>.onPeerStatusUpdate()", Object.keys(peerStatusList).length);
            const livePeers = this._dvm.livePeers.map(id => id.b64);
            for (const [peer, peerStatus] of Object.entries(peerStatusList)) {
                const agentId = new AgentId(peer);
                //console.debug("<vines-page>.onPeerStatusUpdate()", peerStatus.status, peerStatus.lastSeen);
                if (!livePeers.includes(peer) && peerStatus.status == "online") {
                    //console.log("Adding livePeer from PeerStatus", agentId.short);
                    this._dvm.storePresence(agentId, peerStatus.lastSeen);
                    this._dvm.probeAll(GetStrategy.Local);
                } else {
                  if (livePeers.includes(peer) && peerStatus.status == "offline") {
                    this._dvm.unstorePresence(agentId);
                  }
                }
            }
        });
        setLocale(this.weServices.getLocale());
        this.weServices.onLocaleChange((locale: string) => {
            console.log("<vines-page>.onLocaleChange()", locale);
            //setLocale(locale);
            window.location.reload();
        });
      } catch (e) {
          // weServicesMock might not implement
      }
    }
    /** Display requested WAL if any */
    if (this.wal && new DnaId(this.wal.hrl[0]).equals(this.cell.address.dnaId)) {
        const actionId = new ActionId(this.wal.hrl[1]);
        const bead = this.threadsPerspective.getBead(actionId);
        const thread = this.threadsPerspective.getParticipationProtocol(actionId);
        const jumpEvent = {
            type: MainViewType.Thread,
            thread: thread? actionId : undefined,
            bead: bead? actionId : undefined,
            history: undefined,
        }
        if (bead || thread) {
            console.debug("<vines-page> Jumping to requested WAL", jumpEvent);
            this.onJump(new CustomEvent<JumpEvent>('jump', {
                detail: jumpEvent,
                bubbles: true,
                composed: true
            }));
        } else {
            console.debug("<vines-page> requested WAL not found", this.wal);
        }
    }
    /** Need this to get all manifests at startup */
    this._filesDvm.probeAll(GetStrategy.Local);
    /** */
    this.requestUpdate();
    /** */
    this.pingAllOthers();
  }


  /** */
  private _cachedUnread: Map<HoloHashB64, [HoloHashB64, Timestamp][]> = new Map();
  private _cachedNew: HoloHashB64[] = [];

  protected override async updated(_changedProperties: PropertyValues) {
    //console.log("<vines-page>.updated()");
    /** ??? */
    try {
      const chatView = this.shadowRoot!.getElementById("chat-view") as LitElement;
      const view = await chatView.updateComplete;
      //console.log("ChatView.parent.updated() ", view, chatView.scrollTop, chatView.scrollHeight, chatView.clientHeight)
      if (!view || this.multi) { // in multi-view, tell thread-view to update
        //console.log("<vines-page>.updated() chatView", this.multi);
        /** Request a new update for scrolling to work */
        chatView.requestUpdate();
      }
    } catch (e: any) {
      /** i.e. element not present */
    }


    // /** in multi-view, tell thread-view to update */
    // if (this.multi) {
    //     const el = this.shadowRoot!.getElementById("chat-view") as ChatThreadMultiView;
    //     if (el) {
    //       el.requestUpdate();
    //     }
    // }


    /** Unmark beads from currently selected thread */
    if (this._selectedThreadHash) {
      if (this._dvm.threadsZvm.perspective.unreads.has(this._selectedThreadHash)) {
        console.log("<vines-page> deleteNotification selected unread", this._selectedThreadHash.b64);
        this._dvm.threadsZvm.unstoreUnreadThread(this._selectedThreadHash);
      }
      const prevThreadNotifs = this._dvm.threadsZvm.perspective.getAllNotificationsForPp(this._selectedThreadHash);
      for (const [linkAh, _notif] of prevThreadNotifs) {
        console.log("<vines-page> deleteNotification selected notif", linkAh.b64);
        /*await*/
        delay(1000).then(() => {
          catchThrottled(this._dvm.threadsZvm.deleteNotification(linkAh));
          //this._dvm.threadsZvm.notifySubscribers();
        }); // FOR UNKNOWN REASON (holochain bug?) Link record might not be available immediately even though holochain told us about it...
      }

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
          const maybe = await this.weServices.assets.assetInfo(wal);
          if (maybe) {
            this.requestUpdate();
          }
        }
      }
      /** Notify Frame of some new content: FIXME move to zvm? */
        //const allCount = this._dvm.threadsZvm.perspective.unreadThreads.size + this._dvm.threadsZvm.perspective.newThreads.size;
      const comparableNew = Array.from(this._dvm.threadsZvm.perspective.newThreads.values()).map((id) => id.b64);
      //console.debug("<vines-page>.updated() weServices comparableNew", comparableNew);
      //if (allCount > 0 && (comparableUnread != this._cachedUnread || comparableNew != this._cachedNew)) {
      for (const threadAh of comparableNew) {
        if (!this._cachedNew.includes(threadAh)) {
          console.log("<vines-page>.updated() weServices New thread", threadAh);
          this.weServices.notifyFrame([{
            title: "New thread",
            body: "",
            notification_type: msg('Conversations'),
            //notification_type: "content",
            icon_src: wrapPathInSvg(mdiInformationOutline),
            urgency: 'medium',
            aboutWal: {hrl: intoHrl(this.cell.address.dnaId, intoDhtId(threadAh))},
            timestamp: Date.now(),
          }]);
        }
      }
      this._cachedNew = comparableNew;
      const comparableUnread: Map<HoloHashB64, [HoloHashB64, Timestamp][]> = new Map(Array.from(this._dvm.threadsZvm.perspective.unreads.entries())
        .map(([threadId, [_subId, bead_ids]]) => [threadId.b64, bead_ids.map(([id, ts]) => [id.b64, ts])]));
      for (const [threadAhB64, bead_tuples] of Array.from(comparableUnread.entries())) {
        const threads = Array.from(this._cachedUnread.keys());
        if (threads.includes(threadAhB64)) {
          let threadAh = new ActionId(threadAhB64);
          for (const tuple of bead_tuples) {
            if (this._cachedUnread.get(threadAhB64)!.includes(tuple)) {
              //console.log("<vines-page>.updated() weServices New message", threadAh);
              this.weServices.notifyFrame([{
                title: "New message",
                body: "",
                notification_type: msg('Conversations'),
                //notification_type: "content",
                icon_src: wrapPathInSvg(mdiInformationOutline),
                urgency: 'medium',
                aboutWal: {hrl: intoHrl(this.cell.address.dnaId, threadAh)},
                timestamp: tuple[1] / 1000,
              }]);
            }
          }
        }
      }
      this._cachedUnread = comparableUnread;
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
      const author = maybeProfile? maybeProfile.nickname : "unknown";
      const canPopup = !notif.author.equals(this.cell.address.agentId) || HAPP_BUILD_MODE == HappBuildModeType.Debug;
      const [notifTitle, notifBody, jump] = composeNotificationTitle(notif, this._dvm.threadsZvm, this._filesDvm, this.weServices);
      let message = `${msg("from")} @${author}.`;
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
          notification_type: msg('Conversations'), //notif.event,
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
    const fields: MyDictionary<string> = {};
    if (color) fields['color'] = color;
    if (avatar) fields['avatar'] = avatar;
    try {
      if (this._dvm.profilesZvm.perspective.getProfile(this._dvm.cell.address.agentId)) {
        await this._dvm.profilesZvm.updateMyProfile({nickname, fields});
      } else {
        await this._dvm.profilesZvm.createMyProfile({nickname, fields});
      }
    } catch (e: any) {
      console.log("createMyProfile() failed");
      console.log(e);
    }
  }


  /** */
  private async onSaveProfile(profile: ProfileMat) {
    console.log("onSaveProfile()", profile)
    try {
      await this._dvm.profilesZvm.updateMyProfile(profile);
      if (getLocale() != profile.fields['lang']) {
          setLocale(profile.fields['lang']!);
          window.location.reload();
      }
    } catch (e: any) {
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
  async onEditChannelClicked(e: CustomEvent<ActionId>) {
    console.log("onEditChannelClicked()", e.detail);
    //const request = e.detail;
    const title = this._dvm.threadsZvm.perspective.threads.get(e.detail)!.title;
    console.log("onEditChannelClicked() title", title);
    const input = this.shadowRoot!.getElementById("editChannelTitleInput") as HTMLInputElement;
    input.value = title;
    this.editChannelDialogElem.setAttribute('ChannelHash', e.detail.b64);
    this.editChannelDialogElem.open = true;
  }


  /** */
  async onEditTopicClicked(e: CustomEvent<EditTopicRequest>) {
    console.log("onEditTopicClicked()", e.detail);
    const request = e.detail;
    const input = this.shadowRoot!.getElementById("editTopicTitleInput") as HTMLInputElement;
    input.value = request.subjectName;
    this.editTopicDialogElem.setAttribute('TopicHash', request.topicHash.b64);
    this.editTopicDialogElem.open = true;
  }

  /** */
  async onMergeTopicClicked(e: CustomEvent<EditTopicRequest>) {
      console.log("onMergeTopicClicked()", e.detail);
      //this._dvm.threadsZvm.meerg
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
    // /** Save input field before switching */
    // if (this._selectedCommentThreadHash && this._canShowComments) {
    //   const commentView = this.shadowRoot!.getElementById("comment-view") as CommentThreadView;
    //   if (commentView) {
    //     this._dvm.storeThreadInput(new ActionId(this._selectedCommentThreadHash.b64), commentView.value);
    //   }
    // }
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
      address: request.subjectHashB64,
      name: request.subjectName,
      typeName: request.subjectType,
      appletId: getThisAppletId(this.weServices),
      dnaHashB64: this.cell.address.dnaId.b64,
    };
    const pp: ParticipationProtocol = {
      purpose: "comment",
      subject,
      limitations: defaultLimitations(),
      moderation: defaultModeration(),
    };
    console.debug("publishCommentThread() appletId", subject.appletId, request.subjectHashB64);
    const [_ts, ppAh] = await this._dvm.threadsZvm.publishParticipationProtocol(pp);
    return ppAh;
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
  goBack() {
    if (this._threadStack.length < 2) {
      return;
    }
    const prev = this._threadStack[this._threadStack.length - 2];
    //console.log("goBack()", this._threadStack, prev);
    this.dispatchEvent(threadJumpEvent(prev!));
  }


  /** */
  async onJump(e: CustomEvent<JumpEvent>) {
    console.log("<vines-page>.onJump()", e.detail, this._selectedThreadHash);
    this.closePopups();
    if (isMobile()) {
      this._canShowLeft = false;
    }
    const maybePrevThreadId = this._selectedThreadHash; // this.selectedThreadHash can change value during this function call (changed by other functions handling events I guess).

    /** Reset state */
    this._replyToAh = undefined;
    this._selectedAgent = undefined;


    // /** Cache and reset input-bar text */
    // const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
    // if (inputBar && maybePrevThreadId) {
    //   console.warn("<vines-page>.onJump() cachedInput Storing input-bar:", inputBar.value, maybePrevThreadId.short)
    //   this._dvm.storeThreadInput(maybePrevThreadId, inputBar.value);
    // }

    /** Set new state */
    this._mainView = e.detail.type;
    switch (e.detail.type) {
      case MainViewType.Favorites:
      case MainViewType.Files:
        this._selectedThreadHash = undefined;
        this._selectedBeadAh = undefined;
        this._selectedAgent = undefined;
        break;
      case MainViewType.MultiThread:
      case MainViewType.Thread:
        /** Figure out the new thread to jump to */
        let nextThreadAh = e.detail.thread;
        if (!e.detail.thread && e.detail.bead) {
          const beadInfo = this._dvm.threadsZvm.perspective.getBeadInfo(e.detail.bead);
          nextThreadAh = beadInfo!.bead.ppAh;
        }
        //console.log("onJump() Thread", maybePrevThreadId, nextThreadAh);
        if (!maybePrevThreadId || !nextThreadAh!.equals(maybePrevThreadId)) {
          this._selectedThreadHash = nextThreadAh;
          /** set lastProbeTime for current thread */
          if (maybePrevThreadId) {
            await this._dvm.threadsZvm.commitThreadProbeLog(maybePrevThreadId);
            /** Clear notifications on prevThread */
            const prevThreadNotifs = this._dvm.threadsZvm.perspective.getAllNotificationsForPp(maybePrevThreadId);
            for (const [linkAh, _notif] of prevThreadNotifs) {
              console.log("<vines-page> deleteNotification selected 2", linkAh.b64);
              await this._dvm.threadsZvm.deleteNotification(linkAh);
            }
          }
          // Add to stack
          //console.log!("onJump() Add to stack?", e.detail.history, this._selectedThreadHash, this._threadStack);
          if (!e.detail.history) {
            if (this._threadStack.length == 0 || !this._threadStack![this._threadStack!.length - 1]!.equals(this._selectedThreadHash!)) {
              //console.log!("onJump() Add to stack: yes");
              this._threadStack.push(this._selectedThreadHash!);
              if (this._threadStack.length > 20) {
                this._threadStack.shift();
              }
              const hl = this.shadowRoot!.getElementById("hisLister") as LitElement;
              if (hl) hl.requestUpdate();
            }
          } else {
            // TODO: Put on top of stack?
          }
        }
        this._selectedBeadAh = e.detail.bead;
        this._selectedAgent = e.detail.agent;
        break;
    }
    /*await*/
    this._dvm.setLocation(this._selectedThreadHash? this._selectedThreadHash : null);
    this._dvm.threadsZvm.unstoreNewThread(this._selectedThreadHash);
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
    const apkPopElem = this.shadowRoot!.getElementById("apkPopover") as Popover;
    if (apkPopElem.isOpen()) {
      apkPopElem.close();
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
    console.debug("downloadTextFile()", filename, content.length);
    const blob = new Blob([content], {type: 'text/plain'});
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


  /**  */
  async pullLatestAppletInfos() {
    console.log("pullLatestAppletInfos()", !!this.weServices);
    if (this.weServices) {
      const appletIds: EntryId[] = await this._dvm.threadsZvm.pullAppletIds(GetStrategy.Local); // FIXME: GetStrategy
      console.log("pullLatestAppletInfos() appletIds", appletIds);
      for (const appletId of appletIds) {
        await this.weServices.appletInfo(appletId.b64);
      }
    }
  }


  /** */
  override render() {
    console.log("<vines-page>.render()", this.happSha256(), this._waitingForBeadCommit, this._collapseAll, this.onlineLoaded, this._mainView, this._selectedThreadHash, this._selectedAgent, !!this._splitObj);
    //console.log("<vines-page>.render() jump", this.perspective.threadInputs[this.selectedThreadHash], this.selectedThreadHash);

    if (this.perspective.importing) {
      const pct = Math.floor(this.perspective.importingPct * 100);
      return html`
          <div style="position:fixed; top:50%; width:100%; display:flex; flex-direction:column; gap:20px;">
              <div style="margin: auto;">${msg('Importing data...')}</div>
              ${pct >= 0? html`
                    <ui5-progress-indicator .value=${pct} style="width: 50%; margin:auto;"></ui5-progress-indicator>
              ` : html`
                  <ui5-busy-indicator delay="0" size="Large" active
                                      style="margin:auto; color:#05b92f"
                  ></ui5-busy-indicator> 
              `}
          </div>
      `;
    }

    let uploadState;
    if (this._splitObj) {
      uploadState = this._filesDvm.perspective.uploadStates[this._splitObj.dataHash];
    }

    /** Check if bead has been committed */
    if (this._waitingForBeadCommit) {
        console.debug("<vines-page>.render() this._waitingForBeadCommit", this._waitingForBeadCommit, this._selectedThreadHash);
        if (!this._selectedThreadHash || !this._selectedThreadHash.equals(new ActionId(this._waitingForBeadCommit.ppAh))) {
            this._waitingForBeadCommit = undefined;
        } else {
            const thread = this._dvm.threadsZvm.perspective.threads.get(this._selectedThreadHash)!;
            const beads = thread.getLast(1);
            if (beads.length > 0) {
                const [beadInfo, _] = this._dvm.threadsZvm.perspective.beads.get(beads[0]!.beadAh)!;
                if (beadInfo.author.equals(this.cell.address.agentId) && beadInfo.bead.prevBeadAh.equals(new ActionId(this._waitingForBeadCommit.prevBeadAh))) {
                    this._waitingForBeadCommit = undefined;
                }
            }
        }
    }

    /** */
    let primaryTitle = msg("No channel selected");
    let centerSide = html`${doodle_flowers}`;
    if (this._mainView == MainViewType.Favorites) {
      centerSide = html`
          <favorites-view></favorites-view>`
      primaryTitle = msg("Favorites");
    }

    /** render the selected thread */
    if (this._selectedThreadHash && (this._mainView == MainViewType.Thread || this._mainView == MainViewType.MultiThread)) {
      const thread = this._dvm.threadsZvm.perspective.threads.get(this._selectedThreadHash);
      //console.warn("<vines-page>.render() thread", !!thread, this._selectedThreadHash.short);
      if (!thread) {
        console.log("<vines-page>.render() ensurePp");
        this._dvm.threadsZvm.ensurePp(this._selectedThreadHash, GetStrategy.Local);
      } else {
        primaryTitle = latestThreadName(thread.title, thread.pp, this._dvm.threadsZvm);
        const dmThread = this._dvm.threadsZvm.isThreadDm(this._selectedThreadHash);
        if (dmThread) {
          console.log("<vines-page>.render() dmThread", dmThread);
          const profile = this._dvm.profilesZvm.perspective.getProfile(dmThread);
          primaryTitle = profile? profile.nickname : "unknown";
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

        const isEditOther = this._dvm.threadsZvm.isEditThreadFromPeer(this._selectedThreadHash);
        const canParticipate = this._dvm.threadsZvm.canParticipate(this._selectedThreadHash, this.cell.address.agentId);
        const canDisplayInput = !isEditOther && canParticipate && !uploadState && !this._uploadingFile;

        const threadView = this.multi
          ? html`
                    <chat-thread-multi-view id="chat-view" .agent=${this._selectedAgent}
                                            .beadAh=${this._selectedBeadAh}></chat-thread-multi-view>`
          : html`
                    <chat-thread-view id="chat-view" .threadHash=${this._selectedThreadHash}
                                      .beadAh=${this._selectedBeadAh}></chat-thread-view>`;

        let typingMsg = "";
        let typers: AgentIdMap<Timestamp> | undefined = this._dvm.perspective.typings.get(this._selectedThreadHash);
        //console.debug("text-input typers", typers);
        if (typers) {
          /* Filter old signals */
          const now = Date.now();
          const typersArray = Array.from(typers.entries())
            .filter(([typer, ts]) => {
              console.debug("typer", typer, now, ts, now - ts);
              return now - ts < 20 * 1000;
            });
          /* Concat names */
          if (typersArray.length > 0) {
            for (const [typer, _ts] of typers) {
              const maybeProfile = this._dvm.profilesZvm.perspective.getProfile(typer);
              const nickname = maybeProfile? maybeProfile.nickname : msg("Unknown");
              typingMsg += nickname + ", "
            }
            typingMsg = typingMsg.slice(0, -2);
            typingMsg += msg(" is typing...");
          }
        }
        centerSide = html`
            <presence-panel .hash=${this._selectedThreadHash}></presence-panel>
            ${threadView}
            ${uploadState || this._uploadingFile? html`
                <div id="uploadCard">
                    <div style="padding:5px;">${msg('Uploading file:')} ${uploadState? uploadState.file.name : "..."}
                    </div>
                    <ui5-progress-indicator style="width:100%;" value=${uploadState? pct : 0}></ui5-progress-indicator>
                </div>
            ` : html`
                <div class="reply-info" style="display: ${this._currentCommentRequest? "block" : "none"}">
                    ${msg("About")} "${this._currentCommentRequest? this._currentCommentRequest.subjectName : ''}"
                    <ui5-button icon="delete" design="Transparent"
                                style="border:none; padding:0px"
                                @click=${(_e: any) => {this._currentCommentRequest = undefined;}}></ui5-button>
                </div>
                <div class="reply-to-div" style="display: ${this._replyToAh? "flex" : "none"}; background: #6f6f6f2e;">
                    ${msg("Replying to")}<span
                        style="font-weight: bold; color:#4270A8; margin-left:3px;">${maybeReplyAuthorName}</span>
                    <div style="flex-grow: 1"></div>
                    <ui5-button icon="decline" design="Transparent"
                                style="border:none; padding:0px"
                                @click=${(_e: any) => {this._replyToAh = undefined;}}></ui5-button>
                </div>
                ${typingMsg? html`<div id="typing-div">${typingMsg}</div>` : html``}
            `}
            <vines-input-bar id="input-bar"
                             style="display: ${canDisplayInput? "block" : "none"}"
                             ?busy=${!!this._waitingForBeadCommit}
                             .topic=${topic}
                             .threadHash=${this._selectedThreadHash}></vines-input-bar>
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
    if (this.weServices) {
        lang = this.weServices.getLocale();
    }
    setLocale(lang);

    const avatar = renderAvatar(this, this._dvm.profilesZvm, this.cell.address.agentId, "S");

    /** Render File View */
    if (this._mainView == MainViewType.Files) {
      primaryTitle = msg("Shared Files");
      console.log("dFiles this._filesDvm", this._filesDvm);
      const publicItems = Array.from(this._filesDvm.deliveryZvm.perspective.publicParcels.entries())
        .map(([ppEh, pprm]) => {
          const isLocal = !!this._filesDvm.deliveryZvm.perspective.localPublicManifests.get(ppEh);
          const profile = pprm.author? this._dvm.profilesZvm.perspective.getProfile(pprm.author) : undefined;
          return {
            ppEh: ppEh.b64,
            description: pprm.description,
            timestamp: pprm.creationTs,
            author: profile,
            isLocal,
            isPrivate: false
          } as FileTableItem;
        });
      console.log("dFiles dnaProperties", this._filesDvm.dnaProperties);
      console.log("dFiles filesDvm cell", this._filesDvm.cell);
      centerSide = html`
          <cell-context .cell=${this._filesDvm.cell} style="height: 100%">
              <div style="height: 100%; display: flex; flex-direction: column; gap: 10px; margin-left:10px; margin-top:10px;">
                  <div style="display: flex; flex-direction: row; gap:15px;">
                      <ui5-button icon="upload-to-cloud" design="Emphasized"
                                  ?disabled=${!!this._file}
                                  @click=${() => this.openFile()}>
                          ${this._file? msg("Uploading...") : msg("Upload File")}
                      </ui5-button>
                  </div>
                  <file-table type="group" notag view nolocal noselect
                              style="flex-grow: 1;"
                              .items=${publicItems}
                              @download=${(e: CustomEvent<EntryId>) => {
                                  console.log("download", e.detail.b64);
                                  /*await*/ this._filesDvm.downloadFile(e.detail)
                              }}
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
//    const groupProfile = determinerGroupProfile(this._dvm.dnaProperties, [this.weServices, 0]);

    /** Get network info for this cell */
      //const sId = this.cell.address.str;
      //const networkInfos = this.appProxy && this.appProxy.networkInfoLogs[sId]? this.appProxy.networkInfoLogs[sId] : [];
      //const networkInfo = networkInfos && networkInfos.length > 0 ? networkInfos[networkInfos.length - 1]![1] : null;

    let topicsLister = html`
            <topics-lister id="topicsLister" 
                           style="display: ${this._listerToShow == "topics-option"? "block" : "none"}"
                           ?alphabetical=${this._canAlphabetical}
                           .showArchivedTopics=${this._canViewArchivedSubjects}
                           .selectedThreadHash=${this._selectedThreadHash}
                           @createThreadClicked=${(e: CustomEvent<ActionId>) => {
                              this._createTopicHash = e.detail;
                              /*await*/ this.createThreadDialogElem.show();
                          }}>
            </topics-lister>
        `;
    let  mineLister = html`
            <my-threads-lister id="mineLister"
                               style="display: ${this._listerToShow == "mine-option"? "block" : "none"}"
                               ?collapsed=${this._collapseAll}
                               .showArchivedSubjects=${this._canViewArchivedSubjects}
                               .selectedThreadHash=${this._selectedThreadHash}
                               @createThreadClicked=${(e: CustomEvent<ActionId>) => {
                                  this._createTopicHash = e.detail;
                                  /*await*/ this.createThreadDialogElem.show();
                              }}>
            </my-threads-lister>
        `;
    let toolLister = html`
        <tool-lister   id="toolLister"
                       style="display: ${this._listerToShow == "tools-option"? "block" : "none"}"
                       ?collapsed=${this._collapseAll}
                       .selectedThreadHash=${this._selectedThreadHash}
    ></tool-lister>`;


    const dmLister = this.multi? html`
        <dm-multi-lister nobtn
                         .showArchived=${this._canViewArchivedSubjects}
                         .selectedThreadHash=${this._selectedThreadHash}
                         @createNewDm=${(_e: any) => {
                             const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                             /*await*/ dialog.show();
                         }}
        ></dm-multi-lister>
    ` : html`
        <dm-lister id="dmLister" nobtn
                   .showArchived=${this._canViewArchivedSubjects}
                   .selectedThreadHash=${this._selectedThreadHash}
                   @createNewDm=${(_e: any) => {
                       const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                       /*await*/ dialog.show();
                   }}
        ></dm-lister>
    `;


    let hisLister = html`
        <history-lister id="hisLister"
                        ?collapsed=${this._collapseAll}
                        .showArchived=${this._canViewArchivedSubjects}
                        .selectedThreadHash=${this._selectedThreadHash}
                        .threadStack=${this._threadStack}
        ></history-lister>
    `;
    hisLister = html``;

    const toggleLeftBtn = html`
        <ui5-button icon="menu2" tooltip=${msg("Show side panel")}
                    class="${this._canShowLeft? "pressed" : ""}                    
                    slot=" startButton"
        style="margin-right:5px; display: ${this._canShowLeft? "none" : ""}"
        @click=${(_e: any) => this._canShowLeft = true} >
        </ui5-button>
    `;

    let maybeBackBtn = html``;
    let commentButton = html``;
    let thread: Thread | undefined = undefined;
    if (this._selectedThreadHash) {
      thread = this._dvm.threadsZvm.perspective.threads.get(this._selectedThreadHash);
      if (thread) {
        /* Get subject and set back button */
        if (thread.pp.subject.typeName == SpecialSubjectType.EntryBead
          || thread.pp.subject.typeName == SpecialSubjectType.TextBead
          || thread.pp.subject.typeName == SpecialSubjectType.AnyBead
          || thread.pp.subject.typeName == SpecialSubjectType.EncryptedBead) {
          const subjectAh = new ActionId(thread.pp.subject.address);
          const subjectBead = this._dvm.threadsZvm.perspective.getBeadInfo(subjectAh);
          if (subjectBead) {
            maybeBackBtn = html`
                <ui5-button icon="nav-back" slot="startButton"
                            @click=${(_e: any) => this.dispatchEvent(beadJumpEvent(subjectAh))}></ui5-button>`;
          }
        }

        /** Determine comment button */
        const maybeCommentThread: ActionId | null = this.threadsPerspective.getCommentThreadForSubject(this._selectedThreadHash);
        let hasUnreadComments = false;
        if (maybeCommentThread != null) {
          hasUnreadComments = this.threadsPerspective.unreads.has(maybeCommentThread);
        }
        const commentRequest: CommentRequest = {
            maybeCommentThread,
            subjectHashB64: this._selectedThreadHash.b64,
            subjectType: SpecialSubjectType.ParticipationProtocol,
            subjectName: thread!.title,
            viewType: "side"
        };
        const commentClickedEvent = {detail: commentRequest,  bubbles: true, composed: true} as CustomEvent<CommentRequest>;
        //console.log("<topics-lister> maybeCommentThread", maybeCommentThread, hasUnreadComments);
        if (hasUnreadComments) {
          commentButton = html`
              <ui5-button icon="comment" tooltip=${msg("View comments")}
                          design="Negative"
                          @click="${(_e: any) => this.onCommentingClicked(commentClickedEvent)}"></ui5-button>`;
        } else {
          commentButton = maybeCommentThread != null
            ? html`
                      <ui5-button icon="comment" tooltip=${msg("View comments")} design="Transparent"
                                  @click=${(e: any) => {
                                      e.stopPropagation();
                                      this.onCommentingClicked(commentClickedEvent)
                                  }}></ui5-button>`
            : html`
                      <ui5-button icon="sys-add" tooltip=${msg("Create comment thread")} design="Transparent"
                                  @click=${(e: any) => {
                                      e.stopPropagation();
                                      this.onCommentingClicked(commentClickedEvent)
                                  }}></ui5-button>`;
        }
      }
    }

    /* Custom Segmented buttons */
    const segBtns = !this.weServices? html`` : html`
        <div style="display: flex; flex-direction: row; gap:3px; background: #D2D2D2; height: 30px; margin: 3px 10px 3px 10px; border-radius: 5px; padding: 3px;">
            <div id="topicsBtn" class="listerbtn selected" @click=${(e: any) => {
                e.preventDefault();
                e.stopPropagation();
                this._listerToShow = "topics-option";
                const topicsBtn = this.shadowRoot!.getElementById("topicsBtn") as HTMLElement;
                topicsBtn.classList.add("selected");
                const toolsBtn = this.shadowRoot!.getElementById("toolsBtn") as HTMLElement;
                toolsBtn.classList.remove("selected");
                const mineBtn = this.shadowRoot!.getElementById("mineBtn") as HTMLElement;
                mineBtn.classList.remove("selected");
                this.requestUpdate();
            }}>
                ${msg('Channels')}
            </div>
            <div id="toolsBtn" class="listerbtn" 
                 @click=${ async (e: any) => {
                    e.preventDefault(); e.stopPropagation();
                    /** Get and Cache appletInfo for each known applet */
                    await this.pullLatestAppletInfos();
                    /** */
                    this._listerToShow = "tools-option";
                    const topicsBtn = this.shadowRoot!.getElementById("topicsBtn") as HTMLElement;
                    topicsBtn.classList.remove("selected");
                    const toolsBtn = this.shadowRoot!.getElementById("toolsBtn") as HTMLElement;
                    toolsBtn.classList.add("selected");
                    const mineBtn = this.shadowRoot!.getElementById("mineBtn") as HTMLElement;
                    mineBtn.classList.remove("selected");
                    this.requestUpdate();
                }}>
                ${msg('Tools')}
            </div>
            <div id="mineBtn" class="listerbtn" 
                 @click=${(e: any) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this._listerToShow = "mine-option";
                    const topicsBtn = this.shadowRoot!.getElementById("topicsBtn") as HTMLElement;
                    topicsBtn.classList.remove("selected");
                    const toolsBtn = this.shadowRoot!.getElementById("toolsBtn") as HTMLElement;
                    toolsBtn.classList.remove("selected");
                    const mineBtn = this.shadowRoot!.getElementById("mineBtn") as HTMLElement;
                    mineBtn.classList.add("selected");
                    this.requestUpdate();
                }}>
                ${msg('My')}
            </div>
        </div>`;


    /** Show Cross-view or group-view */
    const topLeft = html`



        <!-- Action buttons -->
        <div style="display:flex; flex-direction:row; padding: 0 5px;">

            <div style="display:flex; flex-direction:row;border-bottom: 1px solid #d2d2d2; width:100%; justify-content:space-between; padding-bottom:6px; padding-top:6px">
                ${this._listerToShow == "topics-option"? html`
                    <ui5-button icon="add-folder" design="Transparent" style="height:30px;"
                                tooltip=${msg("Create New Category")}
                                @click=${(_e: any) => this.createTopicDialogElem.show()}></ui5-button>` : html``}
                <ui5-button icon="expand-all" design="Transparent" style="height:30px;" tooltip=${msg("Expand All")}
                            @click=${(_e: any) => {
                                console.log("<topics-lister> EXPAND ALL")
                                this._collapseAll = false;
                                const mineLister = this.shadowRoot!.getElementById("mineLister") as unknown as ICollapsable;
                                if (mineLister) {
                                    mineLister.collapseAll(false);
                                }
                                const topicsLister = this.shadowRoot!.getElementById("topicsLister") as unknown as ICollapsable;
                                if (topicsLister) {
                                    topicsLister.collapseAll(false);
                                }
                                const hisLister = this.shadowRoot!.getElementById("hisLister") as unknown as ICollapsable;
                                if (hisLister) {
                                    hisLister.collapseAll(false);
                                }

                            }}></ui5-button>
                <ui5-button icon="collapse-all" design="Transparent" style="height:30px;" tooltip=${msg("Collapse All")}
                            @click=${(_e: any) => {
                                console.log("<topics-lister> Collapse ALL")
                                this._collapseAll = true;
                                const mineLister = this.shadowRoot!.getElementById("mineLister") as unknown as ICollapsable;
                                if (mineLister) {
                                    mineLister.collapseAll(true);
                                }
                                const topicsLister = this.shadowRoot!.getElementById("topicsLister") as unknown as ICollapsable;
                                if (topicsLister) {
                                    topicsLister.collapseAll(true);
                                }
                                const hisLister = this.shadowRoot!.getElementById("hisLister") as unknown as ICollapsable;
                                if (hisLister) {
                                    hisLister.collapseAll(true);
                                }
                            }}></ui5-button>
                <ui5-button icon=${this._canAlphabetical? "time-account" : "alphabetical-order"} design="Transparent"
                            style="height:30px;"
                            tooltip=${this._canAlphabetical? msg("Sort by creation time") : msg("Sort alphabetically")}
                            @click=${(_e: any) => this._canAlphabetical = !this._canAlphabetical}></ui5-button>
                <ui5-button icon=${this._canViewArchivedSubjects? "hide" : "show"} design="Transparent"
                            style="height:30px;"
                            tooltip=${(this._canViewArchivedSubjects? msg("Hide") : msg("Show")) + " " + msg("hidden Categories & Channels")}
                            @click=${(_e: any) => this._canViewArchivedSubjects = !this._canViewArchivedSubjects}></ui5-button>
                <ui5-button icon="accept" design="Transparent" style="height:30px;" tooltip=${msg("Mark all as read")}
                            @click=${this.onCommitBtn}></ui5-button>
                <ui5-button design="Transparent" tooltip=${msg('Close side panel')}
                            style="height:30px;"
                            icon="slim-arrow-left"
                            @click=${(_e: any) => this._canShowLeft = false}>
                </ui5-button>
            </div>
        </div>
    `;


    const filteredInbox = this._dvm.threadsZvm.perspective.filteredInbox();
    //console.log("filteredInbox", filteredInbox);


    const dmSign = html`
        <div id="dmSign" style="cursor: pointer; z-index: 100"
             @click=${() => {
                 const div = this.shadowRoot!.getElementById("listerGroup") as HTMLElement;
                 if (div) {
                     div.scrollTop = div.scrollHeight - div.clientHeight;
                 }
             }}>
            <ui5-icon name="arrow-bottom" style="color: #373535;margin-right: 3px;"></ui5-icon>
            <div>${msg("DMs")}</div>
        </div>`;

    const leftSide = this.multi? html`
        ${dmSign}
        <div style="padding-top:12px; margin-left:10px; min-width:0; margin-bottom: 15px">
            <div style="overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:1.25rem">
                ${msg("DMs Cross View")}
            </div>
        </div>
        <div id="listerGroup" style="display:flex; flex-direction:column; overflow:auto">
            <!-- Messages -->
            <div style="display: flex; flex-direction: row; gap: 10px;align-items: center; margin-left: 10px; color: grey;margin-top: 30px;">
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
    ` : html`
        ${topLeft}
        ${dmSign}
        <div id="listerGroup" style="display: flex; flex-direction: column; overflow: auto">
            ${mineLister}
            ${topicsLister}
            ${toolLister}
            ${hisLister}
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
    `;

    const happJoinInfo = this.happJoinInfo();

    /** Render all */
    return html`
        <div id="mainDiv"
             @commenting-clicked=${this.onCommentingClicked}
             @reply-clicked=${this.onReplyClicked}
             @edit-channel-clicked=${this.onEditChannelClicked}
             @edit-topic-clicked=${this.onEditTopicClicked}
             @merge-topic-clicked=${this.onMergeTopicClicked}>

            <div id="leftSide" class="leftSide" style="display: ${this._canShowLeft? "flex" : "none"};">
                ${leftSide}
                <div style="flex-grow: 1"></div>
                ${segBtns}
                <div id="profile-row">
                    <div style="display: flex; flex-direction:row; flex-grow:1; min-width: 0; margin-left:2px">
                        ${avatar}
                        <div style="display: flex; flex-direction: column; align-items: stretch;padding-top:18px;margin-left:5px;flex-grow:1;min-width: 0;">

                                <!-- <div style="font-size: small">${this.cell.address.agentId.b64}</div> -->
                        </div>
                    </div>
                    <ui5-button icon="documents" design="Transparent" tooltip=${msg("View Files")}
                                style="margin-top:10px; ${this._mainView == MainViewType.Files? "background: #4684FD; color: white;" : ""}"
                                @click=${() => this.dispatchEvent(filesJumpEvent())}>
                    </ui5-button>
                    <ui5-button icon="favorite-list" design="Transparent" tooltip=${msg("View Favorites")}
                                style="margin-top:10px; ${this._mainView == MainViewType.Favorites? "background: #4684FD; color: white;" : ""}"
                                @click=${() => this.dispatchEvent(favoritesJumpEvent())}>
                    </ui5-button>
                    <ui5-button icon="group" name="group" design="Transparent"
                                style="margin-top:10px;position:relative; width: 100px;"
                                tooltip=${msg('online peers')}
                                @click=${async (e: any) => {
                                    e.stopPropagation();
                                    await this.updateComplete;
                                    const dialog = this.shadowRoot!.getElementById("view-agents-dialog") as Dialog;
                                    await dialog.show();
                                }}
                    >
                        ${this.networkCaller.isLooping()? html`
                            <peer-status-badge id="peer-status"></peer-status-badge">
                        ` : html`
                            <span class="status-badge" style="background:#82afd5">
            ? / ?
        </span>
                        `}
                    </ui5-button>
                    <ui5-button id="netBtn" .icon=${this._canSpin? "synchronize" : "electrocardiogram"}
                                class=${this._canSpin? "spinning" : ""}
                                design="Transparent" tooltip=${msg("Network Health")}
                                style="margin-top:10px;"
                                @click=${async (e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const popover = this.shadowRoot!.getElementById("networkPopover") as Popover;
                                    const btn = this.shadowRoot!.getElementById("netBtn") as HTMLElement;
                                    popover.showAt(btn);
                                }}>
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
                        ${globalThis.IS_TAURI
                                ? html`<ui5-menu-item id="gotoadmin" icon="share" text=${msg("Change group")}></ui5-menu-item>` 
                                : html`<ui5-menu-item id="shareNetwork" icon="cloud" text=${msg("Share invite code")} ></ui5-menu-item>`}                        
                        <ui5-menu-item id="exportItem" text=${msg('Export')} icon="save" starts-section></ui5-menu-item>
                        <ui5-menu-item id="importCommitItem" text=${msg("Import")}
                                       icon="open-folder"></ui5-menu-item>
                        <!-- <ui5-menu-item id="importOnlyItem" text=${msg("Import temporarily")}
                                       icon="open-folder"></ui5-menu-item> -->
                        <ui5-menu-item id="dumpItem" text="Dump Threads logs"></ui5-menu-item>                         
                        ${HAPP_BUILD_MODE == HappBuildModeType.Retail? html`
                            <ui5-menu-item id="bugItem" text=${msg("Report Bug")} icon="marketing-campaign"
                                           starts-section></ui5-menu-item>
                        ` : html`
                            <!-- <ui5-menu-item id="syncItem" text="Probe peers for content"
                                           icon="download-from-cloud" starts-section></ui5-menu-item> -->
                            <ui5-menu-item id="exportAllItem" text="Export probeAll" icon="save"
                                           starts-section></ui5-menu-item>
                            <ui5-menu-item id="eraseItem" text="Erase logs"></ui5-menu-item>
                            <ui5-menu-item id="dumpFilesItem" text="Dump Files logs"></ui5-menu-item>
                            <ui5-menu-item id="dumpNetworkItem" text="Dump Network logs"></ui5-menu-item>
                        `}
                        <ui5-menu-item id="__version" disabled text="v${APP_VERSION}"></ui5-menu-item>
                    </ui5-menu>

                    <!-- Network Health Panel -->
                    <ui5-popover id="networkPopover">
                        <div slot="header"
                             style="display:flex; flex-direction:row; width:100%; margin:5px; font-weight: bold;">
                            <abbr title=${this.cell.address.dnaId.b64}>${msg("Network Health")}</abbr>
                            <div style="flex-grow: 1;"></div>
                        </div>
                        <network-health-panel id="nhp" style="max-width: 100%;"></network-health-panel>
                        <div slot="footer"
                             style="display:flex; flex-direction:row; gap: 10px; width:100%; margin:5px; margin-right:0px;">
                            <div style="flex-grow: 1;"></div>
                            ${this.networkCaller.isLooping()
                                    ? html`<ui5-button style="border-color:red; color:red" 
                                            @click=${() => {
                                                this.dispatchEvent(new CustomEvent<boolean>('loop-network-info', {
                                                    detail: false, bubbles: true, composed: true
                                                }));
                                                this.requestUpdate();
                                                const elem = this.shadowRoot!.getElementById("nhp") as LitElement;
                                                if (elem) {
                                                    elem.requestUpdate();
                                                }
                                            }}>
                                        ${msg('Stop')}
                                    </ui5-button>`
                                    :html`<ui5-button @click=${() => {
                                        this.dispatchEvent(new CustomEvent<boolean>('loop-network-info', {
                                            detail: true, bubbles: true, composed: true
                                        }));
                                        this.requestUpdate();
                                        const elem = this.shadowRoot!.getElementById("nhp") as LitElement;
                                        if (elem) {
                                            elem.requestUpdate();
                                        }
                                    }}>${msg('Start')}
                                    </ui5-button>`
    }
                            <ui5-button design="Emphasized" @click=${() => {
                                const popover = this.shadowRoot!.getElementById("networkPopover") as Popover;
                                if (popover.isOpen()) {
                                    popover.close();
                                }
                            }}>
                                ${msg('Close')}
                            </ui5-button>
                        </div>
                    </ui5-popover>
                    <!-- APK link -->
                    <ui5-popover id="apkPopover">
                        <h3 style="margin:0px; margin-bottom:10px;">
                            <div style="width: fit-content; margin:auto; margin-bottom:5px;">${msg('APK download link')}</div>
                            <div id="popover-happ" style="cursor:pointer"
                                 @click=${async () => {
                                     console.debug("writing to clipboard: " + APK_LINK);
                                     await navigator.clipboard.writeText(APK_LINK);
                                     toasty(msg("Download link copied to clipboard"), undefined, this);
                                 }}>
                            </div>
                        </h3>
                        <div id="qrcode-apk" style="width:100%"></div>
                        <a .href=${APK_LINK} target="_blank" style="width:100%; word-wrap:break-word">${APK_LINK}</a>
                    </ui5-popover>
                    <!-- Share Network -->
                    <ui5-popover id="shareNetworkPopover">
                        <div slot="header"
                             style="display:flex; flex-direction:row; width:100%; margin:5px; font-weight: bold;">
                            ${msg("Invite Code")}
                            <div style="flex-grow: 1;"></div>
                        </div>
                        <div>${msg('Share this code to give access to this group')}:</div>
                        <sl-tooltip placement="left" style="--show-delay: 500; --max-width: 800px;">
                            <div slot="content" style="display: flex; flex-direction:column; gap:4px;">
                                <div>happId: ${happJoinInfo?.happId}</div>
                                <div>customName: ${happJoinInfo?.customName}</div>
                                <div style="overflow: hidden">happSha256: ${happJoinInfo?.happSha256}</div>
                                <div>networkSeed: ${happJoinInfo?.networkSeed}</div>
                                <div>bootstrapUrls: ${happJoinInfo?.bootstrapUrls}</div>
                            </div>
                            <div id="qrcode-space" style="width:100%; cursor:help;"></div>
                        </sl-tooltip>
                        <div slot="footer"
                             style="display:flex; flex-direction:row; gap:10px; width:100%; margin:5px; margin-right:0px;">
                            <div style="flex-grow: 1;"></div>
                            <ui5-button slot="footer" design="Transparent"
                                        @click=${async () => {
                                            const popover0 = this.shadowRoot!.getElementById("shareNetworkPopover") as Popover;
                                            if (popover0.isOpen()) {
                                                popover0.close();
                                            }
                                            const popover = this.shadowRoot!.getElementById("apkPopover") as Popover;
                                            const btn = this.shadowRoot!.getElementById("settingsBtn") as HTMLElement;
                                            if (popover && btn) {
                                                /*await*/ popover.showAt(btn);
                                            }}}>
                                ${msg('Android App')}
                            </ui5-button>
                            <ui5-button slot="footer" design="Emphasized"
                                        @click=${async () => {
                                            const popover = this.shadowRoot!.getElementById("shareNetworkPopover") as Popover;
                                            if (popover.isOpen()) {
                                                popover.close();
                                            }
                                            await navigator.clipboard.writeText(this.happShareCode());
                                            toasty(msg("Copied share code to clipboard"));
                                        }}>${msg('Copy Invite Code')}
                            </ui5-button>
                        </div>
                    </ui5-popover>
                </div>
            </div>
            <div id="mainSide">
                <div id="topicBar">
                    ${toggleLeftBtn}
                    ${maybeBackBtn}
                    <div id="primaryTitle"
                         @click=${(e: any) => {
                             e.stopPropagation();
                             if (this._selectedThreadHash) {
                                 this.dispatchEvent(new CustomEvent<ShowRulesEvent>('show-rules', {
                                     detail: {
                                         ppAh: this._selectedThreadHash,
                                         x: e.clientX,
                                         y: e.clientY
                                     }, bubbles: true, composed: true
                                 }));
                             }
                         }}>
                        ${primaryTitle}
                    </div>
                    ${this._selectedThreadHash === undefined || !thread
                            ? html``
                            : html`
                                <div id="topBarChannelBtns" style="margin-left: 25px; display: flex;">

                                    ${this.cell.address.agentId.equals(thread.author)? html`
                                        <ui5-button id=${"edit-" + this._selectedThreadHash.b64} icon="edit"
                                                    tooltip=${msg("Edit Title")} design="Transparent"
                                                    @click=${(_e: any) => {/*await */
                                                        this.onEditChannelClicked({
                                                            detail: this._selectedThreadHash!,
                                                            bubbles: true,
                                                            composed: true
                                                        } as CustomEvent<ActionId>)
                                                    }}></ui5-button>` : html``}

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
                                    </ui5-button>

                                    <copy-wal-button .dnaId=${this.cell.address.dnaId}
                                                     .hash=${this._selectedThreadHash}
                                                     name=${msg("Channel")}
                                                     style="color: #464646; display: block;"></copy-wal-button>
                                    ${commentButton}
                                </div>
                            `
                    }
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
                        ${
                                HAPP_BUILD_MODE == HappBuildModeType.Retail? html`` : /*html``*/
                                        html`<ui5-button icon="developer-settings"
                                                         @click=${() => this._canShowDebug = !this._canShowDebug}></ui5-button>`
                        }
                        <ui5-button id="sync-button" icon="synchronize"  tooltip=${msg('synchronize')}
                                    @click=${() => {
                                        const btn = this.shadowRoot!.getElementById("sync-button")!;
                                        btn.classList.add('spinning');
                                        setTimeout(() => {
                                            btn.classList.remove('spinning');
                                            //isRotating = false;
                                        }, 1000);
                                        this._filesDvm.probeAll(GetStrategy.Network);
                                        this._dvm.probeAll(GetStrategy.Network);
                                        this.requestUpdate();
                        }}></ui5-button>
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
                                <span class="numberBadge">${filteredInbox.length? filteredInbox.length : ""}</span>
                            </ui5-button>
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

                <ui5-popover id="notifPopover" header-text=${msg('Inbox')} placement-type="Bottom" horizontal-align="Right"
                             hide-arrow style="max-width: 500px">
                    <notification-list></notification-list>
                </ui5-popover>

                <ui5-popover id="notifSettingsPopover" placement-type="Bottom" horizontal-align="Left" hide-arrow
                             header-text=${msg("Notification settings for this channel")}>
                    <div style="flex-direction: column; display: flex">
                        <ui5-radio-button id="notifSettingsAll" name="GroupA" text=${msg("All Messages")}
                                          @change=${(_e: any) => this.onNotifSettingsChange()}
                                          ?checked=${(notifSetting == NotifySetting.AllMessages) as Boolean}>
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
                    ${this._canShowComments? html`
                        <!-- .subjectName="${this._selectedCommentThreadSubjectName}" -->
                        <div id="commentSide">
                            <comment-thread-view id="comment-view"
                                                 ?busy=${!!this._waitingForBeadCommit}
                                                 .threadHash=${this._selectedCommentThreadHash}
                                                 showInput="true"
                                                 @close=${(_e: any) => this._canShowComments = false}></comment-thread-view>
                        </div>` : html``}
                    ${this._canShowSearchResults? html`
                                <div id="rightSide">
                                    <search-result-panel .parameters=${searchParameters}></search-result-panel>
                                </div>`
                            : html``}
                    ${HAPP_BUILD_MODE === HappBuildModeType.Retail? html`` : html`
                        <vines-graph id="debugSide" .threadHash=${this._debugThreadAh}
                                     style="display:${this._canShowDebug? 'block' : 'none'};background:#f4d8db;"></vines-graph>
                        <!-- <anchor-tree id="debugSide"
                        style="display:${this._canShowDebug? 'block' : 'none'};background:#f4d8db;"></anchor-tree> -->
                    `}
                </div>
            </div>
            <!-- DIALOGS -->
            <ui5-dialog id="wait-dialog">
                <ui5-busy-indicator delay="0" size="Large" active
                                    style="padding-top:20px; width:100%;"></ui5-busy-indicator>
            </ui5-dialog>
            <ui5-dialog id="view-agents-dialog" style="width:600px;" header-text=${msg('Peers')}>
                <peer-list id="peer-status-list"
                           @avatar-clicked=${async (e: any) => {
                               e.stopPropagation();
                               console.log("@avatar-clicked", e.detail);
                               this.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {
                                   detail: {
                                       agentId: e.detail,
                                       x: window.innerWidth / 2,
                                       y: window.innerHeight / 2
                                   }, bubbles: true, composed: true
                               }));
                           }}>
                    }}>
                </peer-list>
                <ui5-button
                        style="margin-top: 10px; float: right;"
                        @click=${(_e: any) => {
                            const dialog = this.shadowRoot!.getElementById("view-agents-dialog") as Dialog;
                            dialog.close()
                        }}>
                    ${msg("Close")}
                </ui5-button>
                ${this.networkCaller.isLooping()? html`
                    <ui5-button style="margin:10px; float:right;"
                               @click=${() => {
                                    this.dispatchEvent(new CustomEvent<boolean>('loop-network-info', {
                                        detail: false, bubbles: true, composed: true
                                    }));
                                    this.requestUpdate();
                                    const elem = this.shadowRoot!.getElementById("peer-status-list") as LitElement;
                                    if (elem) {
                                        elem.requestUpdate();
                                    }
                                }}>
                        ${msg('Stop pinging')}
                    </ui5-button>
                ` : html`
                    <ui5-button design="Emphasized" style="margin:10px; float:right;" 
                                @click=${() => {
                                    this.dispatchEvent(new CustomEvent<boolean>('loop-network-info', {
                                        detail: true, bubbles: true, composed: true
                                    }));
                                    this.requestUpdate();
                                    const elem = this.shadowRoot!.getElementById("peer-status-list") as LitElement;
                                    if (elem) {
                                        elem.requestUpdate();
                                    }
                    }}>
                        ${msg("Ping peers")}
                    </ui5-button>
                `}                
            </ui5-dialog>
            <!-- View members dialog -->
            <ui5-dialog id="pick-agent-dialog" style="width:600px;" header-text=${msg('Select a peer')}>
                <peer-list id="message-peer-list"
                        @avatar-clicked=${async (e: any) => {
                            console.log("@avatar-clicked", e.detail)
                            const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                            dialog.close();
                            const ppAh = await this._dvm.threadsZvm.createDmThread(e.detail, this.weServices);
                            if (this.multi) {
                                this.dispatchEvent(multiJumpEvent(ppAh, e.detail));
                            } else {
                                this.dispatchEvent(threadJumpEvent(ppAh));
                            }
                        }}>
                </peer-list>
                <ui5-button
                        style="margin-top: 10px; float: right;"
                        @click=${(_e: any) => {
                            const dialog = this.shadowRoot!.getElementById("pick-agent-dialog") as Dialog;
                            dialog.close()
                        }}>
                    ${msg("Cancel")}
                </ui5-button>
                ${this.networkCaller.isLooping()? html`
                    <ui5-button style="margin:10px; float:right;"
                               @click=${() => {
                                   this.dispatchEvent(new CustomEvent<boolean>('loop-network-info', {
                                       detail: false, bubbles: true, composed: true
                                   }));
                                   this.requestUpdate();
                                   const elem = this.shadowRoot!.getElementById("message-peer-list") as LitElement;
                                   if (elem) {
                                       elem.requestUpdate();
                                   }
                               }}>
                        ${msg('Stop pinging')}
                    </ui5-button>
                ` : html`
                    <ui5-button design="Emphasized" style="margin:10px; float:right;" 
                                @click=${() => {
                                    this.dispatchEvent(new CustomEvent<boolean>('loop-network-info', {
                                        detail: true, bubbles: true, composed: true
                                    }));
                                    this.requestUpdate();
                                    const elem = this.shadowRoot!.getElementById("message-peer-list") as LitElement;
                                    if (elem) {
                                        elem.requestUpdate();
                                    }
                                }}>
                        ${msg("Ping peers")}
                    </ui5-button>
                `}
            </ui5-dialog>
            <!-- View Rules Dialog/Popover -->
            <ui5-popover id="rulesPop" placement-type="Right" hide-arrow allow-target-overlap
                         style="min-width: 0px; max-width: 800px;">
                <rules-view id="rulesPanel"></rules-view>
            </ui5-popover>
            <!-- Profile Dialog/Popover -->
            <ui5-popover id="profilePop" hide-arrow allow-target-overlap placement-type="Right" style="min-width: 0px;">
                <profile-panel id="profilePanel"
                               @edit-profile=${(_e: any) => (this.shadowRoot!.getElementById("profilePop") as Popover).close()}
                               @vines-input-commit=${(e: CustomEvent<VinesInputEvent>) => {
                                   e.stopPropagation(); /*e.preventDefault();*/
                                   console.log("onInputCommit.ProfilePanel()", e.detail);
                                   if (!e.detail.text) throw Error("Missing text in input event");
                                   this.publishDmFromProfilePanel(e.detail.text);
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
                        @save-profile=${(e: CustomEvent) => this.onSaveProfile(e.detail)}
                ></vines-edit-profile>
            </ui5-dialog>
            <!-- Import Dialog -->
            <ui5-dialog id="import-dialog" header-text=${msg("Import Data")}>
                <div slot="header" style="display:flex; flex-direction: row; width:100%; align-items:center;">
                    <h3 >IMPORT DATA</h3>
                    <div style="flex-grow: 1"></div>
                    <ui5-button slot="footer"
                                @click=${() => this.importDialogElem.open = false}>
                        ${msg('Close')}
                    </ui5-button>
                </div>
                <export-panel
                        @import=${(e: CustomEvent) => {
                            this.importDvm(e.detail);
                            this.importDialogElem.close(false);
                        }}
                ></export-panel>
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
            <ui5-dialog id="create-topic-dialog" header-text=${msg('Create Category')}>
                <section>
                    <div>
                        <ui5-label for="topicTitleInput">${msg("Title")}:</ui5-label>
                        <ui5-input id="topicTitleInput"
                                   @keydown=${(e: any) => {
                                       if (e.keyCode === 13) {
                                           e.stopPropagation(); /*e.preventDefault();*/
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
                    <ui5-button style="margin-top:5px" @click=${() => this.createTopicDialogElem.close(false)}>
                        ${msg("Cancel")}
                    </ui5-button>
                </div>
            </ui5-dialog>
            <!-- EditChannelDialog -->
            <ui5-dialog id="edit-channel-dialog" header-text=${msg('Edit Channel Title')}>
                <section>
                    <div>
                        <ui5-label for="editChannelTitleInput">${msg("Title")}:</ui5-label>
                        <ui5-input id="editChannelTitleInput"
                                   @keydown=${(e: any) => {
                                       if (e.keyCode === 13) {
                                           /*e.preventDefault();*/
                                           this.onEditChannel(e);
                                       }
                                   }}>
                            <div id="editChannelErrorMsg" slot="valueStateMessage">${msg("Minimum 3 characters")}</div>
                        </ui5-input>
                    </div>
                </section>
                <div slot="footer">
                    <ui5-button id="createChannelDialogButton"
                                style="margin-top:5px" design="Emphasized" @click=${this.onEditChannel}>
                        ${msg("Save")}
                    </ui5-button>
                    <ui5-button style="margin-top:5px" @click=${() => this.editChannelDialogElem.close(false)}>
                        ${msg("Cancel")}
                    </ui5-button>
                </div>
            </ui5-dialog>
            <!-- EditTopicDialog -->
            <ui5-dialog id="edit-topic-dialog" header-text=${msg('Edit Category')}>
                <section>
                    <div>
                        <ui5-label for="editTopicTitleInput">${msg("Title")}:</ui5-label>
                        <ui5-input id="editTopicTitleInput"
                                   @keydown=${(e: any) => {
                                       if (e.keyCode === 13) {
                                           /*e.preventDefault();*/
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
                        ${msg("Save")}
                    </ui5-button>
                    <ui5-button style="margin-top:5px" @click=${() => this.editTopicDialogElem.close(false)}>
                        ${msg("Cancel")}
                    </ui5-button>
                </div>
            </ui5-dialog>
            <!-- CreateThreadDialog -->
            <ui5-dialog id="create-thread-dialog" header-text=${msg("Create New Channel")} style="background: #f7f7f7;">
                <section>
                    <div>
                        <ui5-label for="threadPurposeInput">${msg("Title")}:</ui5-label>
                        <ui5-input id="threadPurposeInput"
                                   @keydown=${async (e: any) => {
                                       if (e.keyCode === 13) {
                                           /*e.preventDefault();*/
                                           await this.onCreateThread();
                                       }
                                   }}>
                            <div id="channelErrorMsg" slot="valueStateMessage">${msg("Minimum 1 character")}</div>
                        </ui5-input>
                    </div>
                    <rules-edit id="rulesEdit"></rules-edit>
                </section>
                <div slot="footer" style="display:flex;gap:10px;">
                    <ui5-button id="createThreadDialogButton" style="margin-top:5px" design="Emphasized"
                                @click=${async () => await this.onCreateThread()}>
                        ${msg("Create")}
                    </ui5-button>
                    <ui5-button style="margin-top:5px" @click=${() => this.createThreadDialogElem.close(false)}>
                        ${msg("Cancel")}
                    </ui5-button>
                </div>
            </ui5-dialog>
            <ui5-dialog id="confirm-thread-dialog" header-text=${msg("Confirm New Channel")}>
                <section>
                    <div style="border: 1px solid grey; padding:10px; padding-bottom:0px">
                        <rules-view id="confirm-rules-view"></rules-view>
                    </div>
                    <div style="font-weight: bold; margin-top:20px;">
                        <div style="width: fit-content; margin: auto;">
                            ${msg('Rules will not be modifiable once the channel is created')}
                        </div>
                    </div>
                </section>
                <div slot="footer" style="display:flex;gap:10px;">
                    <ui5-button id="confirmThreadDialogButton" style="margin-top:5px" design="Emphasized"
                                @click=${async () => await this.onConfirmedCreateThread()}>
                        ${msg("Confirm")}
                    </ui5-button>
                    <ui5-button style="margin-top:5px" @click=${() => this.confirmThreadDialogElem.close(false)}>
                        ${msg("Cancel")}
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
    input.onchange = async (e: any) => {
      console.log("onImport() target download file", e);
      const file = e.target.files[0];
      if (!file) {
        console.error("No file selected");
        return;
      }
      const reader = new FileReader();
      reader.onload = (_e: any) => {
        const contents = reader.result as string;
        this._dvm.importPerspective(contents, canPublish).catch(async(e) => {
            console.warn("Import failed", e, reader);
            toasty(`Failed to import file`);
            this._dvm.importDone();
        });
      }
      // Read the file as text
      reader.readAsText(file);
    }
    input.click();
  }


  @state() private _file: File | undefined = undefined;

  /** */
  private openFile() {
    console.log("<vines-page>.openFile()");
    this._file = undefined;
    var input = document.createElement('input');
    input.type = 'file';
    input.oncancel = async (_e: any) => {
      console.log("<vines-page>.openFile() Canceled");
    }
    input.onchange = (e: any) => {
      console.log("<vines-page>.openFile() target download file", e.target.files, e);
      const file = e.target.files[0];
      if (file.size > this._filesDvm.dnaProperties.maxParcelSize) {
        toasty(`Error: File is too big ${prettyFileSize(file.size)}. Maximum file size: ${prettyFileSize(this._filesDvm.dnaProperties.maxParcelSize)}`);
        return;
      }
      this._file = file;
      splitFile(file, this._filesDvm.dnaProperties.maxChunkSize).then((splitObj) => {
        const succeeded = this._filesDvm.startPublishFile(file, splitObj, []/*this._selectedTags*/, this._dvm.profilesZvm.perspective.agents,
          async (_manifestEh) => {
            toasty(msg("File successfully shared") + ": " + file.name);
            console.log("<vines-page>.openFile() File upload complet. requesting update.");
            this._file = undefined;
            await delay(50); // required
            this.requestUpdate();
          });
        if (!succeeded) {
          this._file = undefined;
          toasty(msg("Error: File already shared to group or stored locally"));
        }
      });
    }
    input.click();
  }


  /** */
  async onGroupMenu(e: any): Promise<void> {
    console.log("onGroupMenu item-click", e)
    switch (e.detail.item.id) {
      case "viewArchived":
        this._canViewArchivedSubjects = !this._canViewArchivedSubjects;
        break;
      case "markAllRead":
        this.onCommitBtn(e);
        break;
    }
  }

  /** */
  happShareCode(): string {
    const maybe = this.happShareCodes.find(([name, _sha256, _code]) => name == this._dvm.hcl.appId);
    return maybe? maybe[2] : "null";
  }

  happJoinInfo(): HappJoinInfo | null {
    const maybe = this.happShareCodes.find(([name, _sha256, _code]) => name == this._dvm.hcl.appId);
    return maybe? decodeHappJoinInfo(maybe[2]) : null;
  }

  /** */
  happSha256(): string {
      const maybe = this.happShareCodes.find(([name, _sha256, _code]) => name == this._dvm.hcl.appId);
      return maybe && maybe[1]? maybe[1] : "null";
  }

  /** */
  async onShareNetwork(): Promise<void> {
    const popover = this.shadowRoot!.getElementById("shareNetworkPopover") as Popover;
    const btn = this.shadowRoot!.getElementById("settingsBtn") as HTMLElement;
    /** Generate and add QR code for space */
    const space = this.shadowRoot!.getElementById("qrcode-space") as HTMLElement;
    const existingImg = space.querySelector('img')
    if (!existingImg) {
      let generateQR: string;
      try {
        generateQR = await QRCode.toDataURL(this.happShareCode());
        const img = document.createElement('img');
        img.src = generateQR;
        img.style.display = "flex";
        img.style.margin = "auto";
        space.append(img);
      } catch (err) {
        console.error(err);
      }
    }
    /** Generate and add QR code for APK */
    const apk = this.shadowRoot!.getElementById("qrcode-apk") as HTMLElement;
    const existingImgApk = apk.querySelector('img')
    if (!existingImgApk) {
      let generateQR: string;
      try {
        generateQR = await QRCode.toDataURL(APK_LINK);
        const img = document.createElement('img');
        img.src = generateQR;
        img.style.display = "flex";
        img.style.margin = "auto";
        apk.append(img);
      } catch (err) {
        console.error(err);
      }
    }
    /** */
    /*await*/ popover.showAt(btn);
  }

  /** */
  async onSettingsMenu(e: any): Promise<void> {
    console.log("item-click", e);
    /*await*/ this.waitDialogElem.show();
    let content = "";
    switch (e.detail.item.id) {
      case "editProfileItem":
          /*await*/ this.profileDialogElem.show();
        break;
      case "shareNetwork":
        await this.onShareNetwork()
        break;
      // @ts-ignore
      case "exportAllItem":
        if (content == "") content = await this._dvm.exportAllPerspective();
      case "exportItem":
        if (content == "") content = this._dvm.exportPerspective();
        this.downloadTextFile("dump_threads.json", content);
        const files_json = await this._filesDvm.exportPerspective();
        this.downloadTextFile("dump_files.json", files_json);
        toasty(msg(`Exported data to json in Downloads folder`));
        break;
      case "importCommitItem":
        //this.importDvm(true);
          /*await*/ this.importDialogElem.show();
        break;
      case "importOnlyItem":
        this.importDvm(false);
        break;
      case "syncItem":
        this._filesDvm.probeAll(GetStrategy.Local);
        this._dvm.probeAll(GetStrategy.Local);
        break;
      case "bugItem":
        window.open(`https://github.com/lightningrodlabs/threads/issues/new`, '_blank');
        break;
      case "dumpItem":
        this._dvm.dumpCallLogs();
        this._dvm.dumpSignalLogs();
        break;
      case "eraseItem":
        this._dvm.purgeLogs();
        break;
      case "dumpFilesItem":
        this._filesDvm.dumpCallLogs();
        this._filesDvm.dumpSignalLogs();
        break;
      case "dumpNetworkItem":
        this.dispatchEvent(new CustomEvent('dumpNetworkLogs', {detail: null, bubbles: true, composed: true}));
        break;
        case "gotoadmin":
            this.dispatchEvent(new CustomEvent('app-selected', {detail: false, bubbles: true, composed: true}));
            break;
    }
    this.waitDialogElem.close();
  }


  /** */
  async refresh(_e?: any) {
    await this._dvm.threadsZvm.zomeProxy.probeInbox(GetStrategy.Network);
    console.log("Inbox:", this._dvm.threadsZvm.perspective.inbox.size);
  }


  /** */
  async onCommitBtn(_e?: any) {
    toasty(msg("All marked 'read' and cleared Inbox"));
    await this._dvm.threadsZvm.commitAllProbeLogs();
    await this._dvm.threadsZvm.flushInbox();
    /** */
    this._dvm.threadsZvm.flushNewAndUnreads();

  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          /*background: #FBFCFD;*/
          display: block;
          height: 100vh;
          width: 100vw;
          background: #F6FAFC;
        }

        .spinning {
          animation: spin 2s linear infinite; /* Adjust duration and easing */
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        abbr {
          text-decoration: none;
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

          /* Mobile */
          @media (max-width: 500px) {
              .leftSide {
                  width: 100%!important;
                  min-width: 100%!important;
                  max-width: 100%!important;
              }
          } 
          
          .leftSide {
              width: 300px;
              min-width: 300px;
              max-width: 300px;
              position:relative;
              flex-direction: column;
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
          margin-bottom: 10px;
          border-radius: 10px;
          /*margin-left:10px;*/
          min-width: 350px;
          width: 90%;
          padding: 5px;
          display: flex;
          flex-direction: column;
          border: 1px solid black;
          background: beige;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;
        }

        #group-div {
          display: flex;
          flex-direction: row;
          cursor: pointer;
          background: none;
          padding-right: 7px;
          border-bottom: 1px solid #c6c6c6;
          margin-bottom: 7px;
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
          margin: 3px 3px 10px 10px;
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

        #membersCount:hover {
          color: black;
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
          /*margin-right: -5px;*/
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

        #primaryTitle {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 20px;
        }

        #primaryTitle:hover {
          text-decoration: underline;
          cursor: pointer;
        }

        #chat-view {
          padding-bottom: 20px; /* HACK: Find a better way for fixing ButtonsPop overlap for last small message */
        }

        #typing-div {
          padding-left: 70px;
          padding-bottom: 5px;
          font-size: small;
          color: #5a69b5;
        }

        #dmSign {
          /*width: 50px;*/
          flex-direction: row;
          border-radius: 20px;
          background: #8f8f8f;
          position: absolute;
          bottom: 100px;
          left: 90px;
          display: none;
          box-shadow: rgba(0, 0, 0, 0.25) 0px 6px 8px;
          padding: 10px;
        }
      `,
    ];
  }
}
