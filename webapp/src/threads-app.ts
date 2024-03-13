import {html, css} from "lit";
import { state, customElement } from "lit/decorators.js";
import {ContextProvider} from "@lit/context";
import {PropertyValues} from "lit/development";
import {
  ActionHashB64,
  AdminWebsocket, AgentPubKeyB64,
  AppSignal,
  AppWebsocket, decodeHashFromBase64, encodeHashToBase64,
  EntryHashB64,
  InstalledAppId,
  ZomeName,
} from "@holochain/client";
import {
  AppletId, AppletView, Hrl, weaveUrlFromWal,
  WeServices,
} from "@lightningrodlabs/we-applet";
import {
  HCL,
  HappElement,
  HvmDef,
  DvmDef,
  DnaViewModel, snake, pascal, delay,
} from "@ddd-qc/lit-happ";
import {
  ThreadsDvm,
  THREADS_DEFAULT_ROLE_NAME,
  ThreadsEntryType,
  THREADS_DEFAULT_COORDINATOR_ZOME_NAME,
  THREADS_DEFAULT_INTEGRITY_ZOME_NAME,
  globaFilesContext,
  weClientContext,
  cardStyleTemplate, appProxyContext, beadJumpEvent, JumpEvent, JumpDestinationType, AnyLinkableHashB64,
} from "@threads/elements";
import {setLocale} from "./localization";
import { msg, localized } from '@lit/localize';
import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"

import {WeServicesEx} from "@ddd-qc/we-utils";
import {BaseRoleName, CloneId, AppProxy} from "@ddd-qc/cell-proxy";
import {AttachableViewInfo} from "@ddd-qc/we-utils";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";
import {DEFAULT_THREADS_DEF} from "./happDef";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";

import "./threads-page"

import Button from "@ui5/webcomponents/dist/Button";
import {toasty} from "@threads/elements/dist/toast";

/** */
export interface AttachableThreadContext {
  detail: string,
  subjectType: string,
  subjectName: string,
  subjectAuthor?: AgentPubKeyB64,
}


/** */
@localized()
@customElement("threads-app")
export class ThreadsApp extends HappElement {

  @state() private _offlinePerspectiveloaded = false;
  @state() private _onlinePerspectiveloaded = false;
  @state() private _hasHolochainFailed = true;

  @state() private _hasWeProfile = false;
  @state() private _lang?: string

  @state() private _currentSpaceEh: null | EntryHashB64 = null;

  static readonly HVM_DEF: HvmDef = DEFAULT_THREADS_DEF;

  //@state() private _canShowBuildView = false;
  //@state() private _canShowDebug = false;

  @state() private _selectedThreadHash: AnyLinkableHashB64 = '';
  @state() private _selectedBeadAh: ActionHashB64 = '';


  /** -- We-applet specifics -- */

  protected _filesProvider?: unknown; // FIXME type: ContextProvider<this.getContext()> ?
  private _weProfilesDvm?: ProfilesDvm;
  protected _weProvider?: unknown; // FIXME type: ContextProvider<this.getContext()> ?
  protected _weServices?: WeServicesEx;


  /** -- Ctor -- */

  /** All arguments should be provided when constructed explicity */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, private _canAuthorizeZfns?: boolean, readonly appId?: InstalledAppId, public appletView?: AppletView) {
    super(appWs? appWs : HC_APP_PORT, appId);
    if (_canAuthorizeZfns == undefined) {
      this._canAuthorizeZfns = true;
    }
  }


  /**  */
  static async fromWe(
    appWs: AppWebsocket,
    adminWs: AdminWebsocket,
    canAuthorizeZfns: boolean,
    appId: InstalledAppId,
    profilesAppId: InstalledAppId,
    profilesBaseRoleName: BaseRoleName,
    profilesCloneId: CloneId | undefined,
    profilesZomeName: ZomeName,
    profilesProxy: AppProxy,
    weServices: WeServices,
    thisAppletId: AppletId,
    //showCommentThreadOnly?: boolean,
    appletView: AppletView,
  ) : Promise<ThreadsApp> {
    const app = new ThreadsApp(appWs, adminWs, canAuthorizeZfns, appId, appletView);
    /** Provide it as context */
    app._weServices = new WeServicesEx(weServices, thisAppletId);
    console.log(`\t\tProviding context "${weClientContext}" | in host `, app);
    app._weProvider = new ContextProvider(app, weClientContext, app._weServices);
    //app.appletId = thisAppletId;
    /** Create Profiles Dvm from provided AppProxy */
    console.log("<thread-app>.ctor()", profilesProxy);
    await app.createWeProfilesDvm(profilesProxy, profilesAppId, profilesBaseRoleName, profilesCloneId, profilesZomeName);
    return app;
  }


  /** Create a Profiles DVM out of a different happ */
  async createWeProfilesDvm(profilesProxy: AppProxy, profilesAppId: InstalledAppId, profilesBaseRoleName: BaseRoleName,
                            profilesCloneId: CloneId | undefined,
                            _profilesZomeName: ZomeName): Promise<void> {
    const profilesAppInfo = await profilesProxy.appInfo({installed_app_id: profilesAppId});
    const profilesDef: DvmDef = {ctor: ProfilesDvm, baseRoleName: profilesBaseRoleName, isClonable: false};
    const cell_infos = Object.values(profilesAppInfo.cell_info);
    console.log("createProfilesDvm() cell_infos:", cell_infos);
    /** Create Profiles DVM */
    //const profilesZvmDef: ZvmDef = [ProfilesZvm, profilesZomeName];
    const dvm: DnaViewModel = new profilesDef.ctor(this, profilesProxy, new HCL(profilesAppId, profilesBaseRoleName, profilesCloneId));
    console.log("createProfilesDvm() dvm", dvm);
    await this.setupWeProfilesDvm(dvm as ProfilesDvm, encodeHashToBase64(profilesAppInfo.agent_pub_key));
  }


  /** */
  async setupWeProfilesDvm(dvm: ProfilesDvm, agent: AgentPubKeyB64): Promise<void> {
    this._weProfilesDvm = dvm as ProfilesDvm;
    /** Load My profile */
    const maybeMyProfile = await this._weProfilesDvm.profilesZvm.probeProfile(agent);
    if (maybeMyProfile) {
      const maybeLang = maybeMyProfile.fields['lang'];
      if (maybeLang) {
        console.log("Setting locale from We Profile", maybeLang);
        setLocale(maybeLang);
      }
      this._hasWeProfile = true;
    }
  }


  /** Handle global events */
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('jump', this.onJump);
    this.addEventListener('copy-thread', this.onCopyThread);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('jump', this.onJump);
    this.removeEventListener('copy-thread', this.onCopyThread);
  }


  /** -- Getters -- */

  get threadsDvm(): ThreadsDvm { return this.hvm.getDvm(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)! as ThreadsDvm }

  get filesDvm(): FilesDvm { return this.hvm.getDvm(FilesDvm.DEFAULT_BASE_ROLE_NAME)! as FilesDvm }


  /** -- Methods -- */

  /** */
  handleSignal(sig: AppSignal) {
    console.log("<threads-app>.handleSignal()")
    this.appProxy.onSignal(sig);
  }


  /** */
  async hvmConstructed() {
    console.log("hvmConstructed()", this._adminWs, this._canAuthorizeZfns)

    /** Authorize all zome calls */
    if (!this._adminWs && this._canAuthorizeZfns) {
      this._adminWs = await AdminWebsocket.connect(new URL(`ws://localhost:${HC_ADMIN_PORT}`));
      console.log("hvmConstructed() connect() called", this._adminWs);
    }
    if (this._adminWs && this._canAuthorizeZfns) {
      await this.hvm.authorizeAllZomeCalls(this._adminWs);
      console.log("*** Zome call authorization complete");
    } else {
      if (!this._canAuthorizeZfns) {
        console.warn("No adminWebsocket provided (Zome call authorization done)")
      } else {
        console.log("Zome call authorization done externally")
      }
    }

    /** Attempt Probe EntryDefs */
    let attempts = 5;
    while(this._hasHolochainFailed && attempts > 0) {
      attempts -= 1;
      const allAppEntryTypes = await this.threadsDvm.fetchAllEntryDefs();
      console.log("happInitialized(), allAppEntryTypes", allAppEntryTypes);
      console.log(`${THREADS_DEFAULT_COORDINATOR_ZOME_NAME} entries`, allAppEntryTypes[THREADS_DEFAULT_COORDINATOR_ZOME_NAME]);
      if (allAppEntryTypes[THREADS_DEFAULT_COORDINATOR_ZOME_NAME].length == 0) {
        console.warn(`No entries found for ${THREADS_DEFAULT_COORDINATOR_ZOME_NAME}`);
        await delay(1000);
      } else {
        this._hasHolochainFailed = false;
        break;
      }
    }

    /** Provide Files as context */
    //const filesContext = this.filesDvm.getContext();
    console.log(`\t\tProviding context "${globaFilesContext}" | in host `, this);
    this._filesProvider = new ContextProvider(this, globaFilesContext, this.filesDvm);
  }


  /** */
  async perspectiveInitializedOffline(): Promise<void> {
    console.log("<threads-app>.perspectiveInitializedOffline()");
    const maybeProfile = await this.threadsDvm.profilesZvm.probeProfile(this.filesDvm.cell.agentPubKey);
    console.log("perspectiveInitializedOffline() maybeProfile", maybeProfile, this.threadsDvm.cell.agentPubKey);
    /** Done */
    this._offlinePerspectiveloaded = true;
  }


  /** */
  async perspectiveInitializedOnline(): Promise<void> {
    console.log("<threads-app>.perspectiveInitializedOnline()", this.appletView);

    if (!this.appletView || (this.appletView && this.appletView.type == "main")) {
      await this.hvm.probeAll();
    }
    await this.networkInfoAll(); // FIXME: should propable store result in class field
    this._onlinePerspectiveloaded = true;
  }


  // /** */
  // shouldUpdate(): boolean {
  //   const canUpdate = super.shouldUpdate();
  //   console.log("<threads-app>.shouldUpdate()", canUpdate, this._offlinePerspectiveloaded);
  //   /** Wait for offlinePerspective */
  //   return canUpdate && this._offlinePerspectiveloaded;
  // }


  /** */
  protected async updated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow parts CSS */
    const profileCard = this.shadowRoot.getElementById('profileCard') as HTMLElement;
    if (profileCard) {
      profileCard.shadowRoot.appendChild(cardStyleTemplate.content.cloneNode(true));
    }
  }


  /** */
  async onDumpNetworkLogs(e) {
    console.log("onDumpNetworkLogs()")
    await this.networkInfoAll();
    this.dumpNetworkInfoLogs();
  }


  /** */
  async onJump(e: CustomEvent<JumpEvent>) {
    console.log("<threads-app>.onJump()", e.detail);
    if (e.detail.type == JumpDestinationType.Applet) {
      if (this._weServices) {
        this._weServices.openAppletMain(decodeHashFromBase64(e.detail.hash));
      }
    }
    if (e.detail.type == JumpDestinationType.Thread) {
      if (this.appletView.type != "main") {
        if (this._weServices) {
          this._weServices.openAppletMain(decodeHashFromBase64(this._weServices.appletId));
          //this._weServices.openHrl();
        }
      } else {
        this._selectedThreadHash = e.detail.hash;
        this._selectedBeadAh = '';
      }
    }
    if (e.detail.type == JumpDestinationType.Bead) {
      //const tuple = await this._dvm.threadsZvm.zomeProxy.getTextMessage(decodeHashFromBase64(e.detail));
      //this._selectedThreadHash = encodeHashToBase64(tuple[2].bead.forProtocolAh);
      const beadInfo = await this.threadsDvm.threadsZvm.getBeadInfo(e.detail.hash);
      if (beadInfo) {
        this._selectedThreadHash = beadInfo.bead.ppAh;
        this._selectedBeadAh = e.detail.hash;
      } else {
        console.warn("JumpEvent failed. Bead not found", e.detail.hash);
      }
    }
    if (e.detail.type == JumpDestinationType.Dm) {
      // TODO
    }
  }


  /** */
  private async onCopyThread(e: CustomEvent) {
    if (!e.detail) {
      console.warn("Invalid copy-thread event");
      return;
    }
    const hrl: Hrl = [decodeHashFromBase64(this.threadsDvm.cell.dnaHash), decodeHashFromBase64(e.detail)];
    const sHrl = weaveUrlFromWal({hrl}, false);
    navigator.clipboard.writeText(sHrl);
    if (this._weServices) {
      this._weServices.hrlToClipboard({hrl});
    }
    toasty(("Copied thread's WAL to clipboard"));
  }


  /** */
  render() {
    console.log("*** <threads-app> render()", this._hasWeProfile, this.threadsDvm.cell.print());

    if (!this._offlinePerspectiveloaded) {
      return html `
        <ui5-busy-indicator size="Medium" active
                            style="margin:auto; width:50%; height:50%;"
        ></ui5-busy-indicator>
      `;
    }
    if(this._hasHolochainFailed) {
      return html`
      <div style="display: flex; flex-direction: column">
        <div style="width: auto; height: auto; font-size: 3rem;">${msg("Failed to connect to Holochain Conductor and/or \"Vines\" cell.")};</div>
        <ui5-button id="retryBtn" @click=${async (e) => {
          const btn = this.shadowRoot.getElementById("retryBtn") as Button;
          btn.disabled = true;
          const allAppEntryTypes = await this.threadsDvm.fetchAllEntryDefs();
          if (allAppEntryTypes[THREADS_DEFAULT_COORDINATOR_ZOME_NAME].length == 0) {
              console.warn(`No entries found for ${THREADS_DEFAULT_COORDINATOR_ZOME_NAME}`);
              btn.disabled = false;
          } else {
              this._hasHolochainFailed = false;
          }
        }}>
          ${msg('Retry')}
        </ui5-button>
      </div>
      `;
    }

    //let view = html`<slot></slot>`;
    // FIXME: should propable store networkInfoLogs in class field
    let view = html`
            <threads-page style="height:100vh;" 
                      .selectedThreadHash=${this._selectedThreadHash}
                      .selectedBeadAh=${this._selectedBeadAh}
                      .networkInfoLogs=${this.appProxy.networkInfoLogs} 
                      @dumpNetworkLogs=${this.onDumpNetworkLogs}
                      @queryNetworkInfo=${(e) => this.networkInfoAll()}
            ></threads-page>`;
    if (this.appletView) {
      console.log("appletView", this.appletView);
      switch (this.appletView.type) {
        case "main":
          let _provider = new ContextProvider(this, appProxyContext, this.appProxy);
          break;
        case "block":
          throw new Error("Threads/we-applet: Block view is not implemented.");
        case "attachable":
          const attachableViewInfo = this.appletView as AttachableViewInfo;
          if (attachableViewInfo.roleName != THREADS_DEFAULT_ROLE_NAME) {
            throw new Error(`Threads/we-applet: Unknown role name '${this.appletView.roleName}'.`);
          }
          if (attachableViewInfo.integrityZomeName != THREADS_DEFAULT_INTEGRITY_ZOME_NAME) {
            throw new Error(`Threads/we-applet: Unknown zome '${this.appletView.integrityZomeName}'.`);
          }
          const entryType = pascal(attachableViewInfo.entryType);
          console.log("pascal entryType", attachableViewInfo.entryType, entryType);
          switch (entryType) {
            case ThreadsEntryType.ParticipationProtocol:
              const ppAh = encodeHashToBase64(attachableViewInfo.hrlWithContext.hrl[1]);
              console.log("attachable ppAh:", ppAh);
              //   const viewContext = attachableViewInfo.hrlWithContext.context as AttachableThreadContext;
              view = html`<comment-thread-view style="height: 100%;" showInput="true" .threadHash=${ppAh}></comment-thread-view>`;
              break;
            case ThreadsEntryType.TextBead:
            case ThreadsEntryType.AnyBead:
            case ThreadsEntryType.EntryBead:
                const beadAh = encodeHashToBase64(attachableViewInfo.hrlWithContext.hrl[1]);
                // @click=${(_e) => this.dispatchEvent(beadJumpEvent(beadAh))}
                view = html`
                    <chat-item .hash=${beadAh} shortmenu></chat-item>
                `;
              break
            default:
              throw new Error(`Unhandled entry type ${attachableViewInfo.entryType}.`);
          }
          break;
        case "creatable":
          throw new Error(`Unhandled creatable type ${this.appletView.name}.`)
          break;
        default:
          console.error("Unknown applet-view type", this.appletView);
          throw new Error(`Unknown applet-view type: ${(this.appletView as any).type}`);
      }
    } else {
      let _provider = new ContextProvider(this, appProxyContext, this.appProxy);
    }


    /** Import profile from We */
    let guardedView = view;
    const maybeMyProfile = this.threadsDvm.profilesZvm.getMyProfile();
    console.log("<threads-app> Profile", this._hasWeProfile, maybeMyProfile);
    if (this._hasWeProfile && !maybeMyProfile) {
      guardedView = html`
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; padding-bottom: 10px;margin:auto: min-width:400px;">
          <h1 style="font-family: arial;color: #5804A8;"><img src="icon.png" width="32" height="32"
                                                              style="padding-left: 5px;padding-top: 5px;"/> Threads</h1>
          <div style="align-items: center;">
            <ui5-card id="profileCard">
              <ui5-card-header title-text=${msg('Import Profile into Threads applet')}></ui5-card-header>
              <threads-edit-profile
                  .profile=${this._weProfilesDvm.profilesZvm.getMyProfile()}
                  @save-profile=${async (e: CustomEvent<ProfileMat>) => {
                    console.log("createMyProfile()", e.detail);
                    try {
                      await this.threadsDvm.profilesZvm.createMyProfile(e.detail);
                    } catch(e) {
                      console.warn("Failed creating my Profile", e);
                    }
                    this.requestUpdate();
                  }}
                  @lang-selected=${(e: CustomEvent) => {
                    console.log("set locale", e.detail);
                    setLocale(e.detail)
                  }}
              ></threads-edit-profile>
            </ui5-card>
          </div>
        </div>`;
    }

    /** Render all */
    return html`
        <cell-context .cell="${this.threadsDvm.cell}">
          ${guardedView}
        </cell-context>
    `;
  }


  /** */
  static get styles() {
    return [
      css`
        :host {
          background: #f7f6f8;
          display: block;
          height: 100vh;
          width: 100%;
          font-family: '72';
        }

        .column {
          display: flex;
          flex-direction: column;
        }

        .title {
          font-size: 20px;
        }

        ui5-card::part(region) {
          padding:10px;
        }
      `,

    ];
  }
}



