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
  AppletId, AppletView, CreatableName, Hrl, WAL, weaveUrlFromWal,
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
  ThreadsEntryType,
  THREADS_DEFAULT_COORDINATOR_ZOME_NAME,
  THREADS_DEFAULT_INTEGRITY_ZOME_NAME,
  globaFilesContext,
  weClientContext,
  cardStyleTemplate,
  appProxyContext,
  JumpEvent,
  JumpDestinationType,
  AnyLinkableHashB64,
  VINES_DEFAULT_ROLE_NAME,
  doodle_flowers,
  onlineLoadedContext,
    ParticipationProtocol,
  determineSubjectName, CreateThreadRequest, toasty,
  materializeSubject, weaveUrlToWal, Subject,
} from "@vines/elements";
import {setLocale} from "./localization";
import { msg, localized } from '@lit/localize';
import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"

import {WeServicesEx} from "@ddd-qc/we-utils";
import {BaseRoleName, CloneId, AppProxy} from "@ddd-qc/cell-proxy";
import {AssetViewInfo} from "@ddd-qc/we-utils";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";
import {DEFAULT_THREADS_DEF} from "./happDef";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";

import "./vines-page"

import Button from "@ui5/webcomponents/dist/Button";


/** */
export interface VinesAssetQuery {
  detail: string,
  subjectType: string,
  subjectName: string,
  subjectAuthor?: AgentPubKeyB64,
}


/** */
@localized()
@customElement("vines-app")
export class VinesApp extends HappElement {

  @state() private _offlineLoaded = false;
  @state() private _onlineLoaded = false;
           private _onlineLoadedProvider?: any;
  @state() private _hasHolochainFailed = undefined;

  @state() private _hasWeProfile = false;
  @state() private _lang?: string

  @state() private _currentSpaceEh: null | EntryHashB64 = null;

  static readonly HVM_DEF: HvmDef = DEFAULT_THREADS_DEF;

  //@state() private _canShowBuildView = false;
  //@state() private _canShowDebug = false;

  @state() private _selectedThreadHash: AnyLinkableHashB64 = '';
  @state() private _selectedBeadAh: ActionHashB64 = '';


  /** -- We-applet specifics -- */

  private _weProfilesDvm?: ProfilesDvm;
  protected _weServices?: WeServicesEx;



  /** -- Ctor -- */

  /** All arguments should be provided when constructed explicity */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, private _canAuthorizeZfns?: boolean, readonly appId?: InstalledAppId, public appletView?: AppletView) {
    super(appWs? appWs : HC_APP_PORT, appId);
    if (_canAuthorizeZfns == undefined) {
      this._canAuthorizeZfns = true;
    }
    this._onlineLoadedProvider = new ContextProvider(this, onlineLoadedContext, false);
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
  ) : Promise<VinesApp> {
    const app = new VinesApp(appWs, adminWs, canAuthorizeZfns, appId, appletView);
    /** Provide it as context */
    app._weServices = new WeServicesEx(weServices, thisAppletId);
    console.log(`\t\tProviding context "${weClientContext}" | in host `, app);
    let _weProvider = new ContextProvider(app, weClientContext, app._weServices);
    /** Create Profiles Dvm from provided AppProxy */
    console.log("<thread-app>.fromWe()", profilesProxy);
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
    console.log("<vines-app>.handleSignal()")
    this.appProxy.onSignal(sig);
  }


  /** */
  async hvmConstructed() {
    console.log("<vines-app>.hvmConstructed()", this._adminWs, this._canAuthorizeZfns)

    /** Authorize all zome calls */
    if (!this._adminWs && this._canAuthorizeZfns) {
      this._adminWs = await AdminWebsocket.connect({url: new URL(`ws://localhost:${HC_ADMIN_PORT}`)});
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
    while(this._hasHolochainFailed == undefined || this._hasHolochainFailed && attempts > 0) {
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
    if (attempts == 0 && this._hasHolochainFailed == undefined) {
      this._hasHolochainFailed = true;
    }
    /** Provide Files as context */
    //const filesContext = this.filesDvm.getContext();
    console.log(`\t\tProviding context "${globaFilesContext}" | in host `, this);
    let _filesProvider = new ContextProvider(this, globaFilesContext, this.filesDvm);
  }


  /** */
  async perspectiveInitializedOffline(): Promise<void> {
    console.log("<vines-app>.perspectiveInitializedOffline()");
    const maybeProfile = await this.threadsDvm.profilesZvm.probeProfile(this.filesDvm.cell.agentPubKey);
    console.log("perspectiveInitializedOffline() maybeProfile", maybeProfile, this.threadsDvm.cell.agentPubKey);
    /** Done */
    this._offlineLoaded = true;
  }


  /** */
  async perspectiveInitializedOnline(): Promise<void> {
    console.log("<vines-app>.perspectiveInitializedOnline() START", this.appletView);

    if (!this.appletView || (this.appletView && this.appletView.type == "main")) {
      await this.hvm.probeAll();
    }
    await this.networkInfoAll(); // FIXME: should propable store result in class field
    console.log("<vines-app>.perspectiveInitializedOnline() DONE");
    this._onlineLoaded = true;
    this._onlineLoadedProvider.setValue(true);
  }


  /** USE FOR DEBUGGING */
  // /** */
  // shouldUpdate(): boolean {
  //   const canUpdate = super.shouldUpdate();
  //   console.log("<vines-app>.shouldUpdate()", canUpdate, this._offlineLoaded);
  //   /** Wait for offlinePerspective */
  //   return canUpdate /*&& this._offlinePerspectiveloaded*/;
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
    console.log("<vines-app>.onJump()", e.detail);
    if (e.detail.type == JumpDestinationType.Applet) {
      if (this._weServices) {
        this._weServices.openAppletMain(decodeHashFromBase64(e.detail.hash));
      }
    }
    if (e.detail.type == JumpDestinationType.Thread) {
      if (this.appletView && this.appletView.type != "main") {
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
    const wurl = weaveUrlFromWal({hrl}/*, true*/);
    navigator.clipboard.writeText(wurl);
    if (this._weServices) {
      this._weServices.walToPocket({hrl});
    }
    toasty(("Copied thread's WAL to clipboard"));
  }


  /** */
  render() {
    console.log("<vines-app> render()", !this._hasHolochainFailed,  this._offlineLoaded, this._onlineLoaded, this._hasWeProfile, this.threadsDvm.cell.print());

    /** Check init has been done */
    if (this._hasHolochainFailed == undefined) {
      return html `
        <ui5-busy-indicator delay="0" size="Medium" active
                            style="margin:auto; width:100%; height:50%; color:#ff4343"
        ></ui5-busy-indicator>
      `;
    }
    if(this._hasHolochainFailed) {
      return html`
      <div style="display: flex; flex-direction: column">
        <div style="width: auto; height: auto; font-size: 3rem;">${msg("Failed to connect to Holochain Conductor and/or \"Vines\" cell.")};</div>
        <ui5-button id="retryBtn" design="Emphasized"
                    style="max-width:300px"
                    @click=${async (e) => {
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
    if (!this._offlineLoaded) {
      return html `
          <ui5-busy-indicator delay="0" size="Medium" active
                              style="margin:auto; width:100%; height:50%; color:#f3bb2c"
          ></ui5-busy-indicator>
      `;
    }
    // if (!this._onlineLoaded) {
    //   return html `
    //     <ui5-busy-indicator delay="0" size="Medium" active
    //                         style="margin:auto; width:100%; height:50%;"
    //     ></ui5-busy-indicator>
    //   `;
    // }

    //let view = html`<slot></slot>`;
    // FIXME: should propable store networkInfoLogs in class field
    let view = html`
            <vines-page style="height:100vh;" 
                      .selectedThreadHash=${this._selectedThreadHash}
                      .selectedBeadAh=${this._selectedBeadAh}
                      .networkInfoLogs=${this.appProxy.networkInfoLogs} 
                      @dumpNetworkLogs=${this.onDumpNetworkLogs}
                      @queryNetworkInfo=${(e) => this.networkInfoAll()}
            ></vines-page>`;
    if (this.appletView) {
      console.log("appletView", this.appletView);
      switch (this.appletView.type) {
        case "main":
          let _provider = new ContextProvider(this, appProxyContext, this.appProxy);
        break;
        case "block":
          throw new Error("Threads/we-applet: Block view is not implemented.");
        case "asset":
          const assetViewInfo = this.appletView as AssetViewInfo;
          if (assetViewInfo.roleName != VINES_DEFAULT_ROLE_NAME) {
            throw new Error(`Threads/we-applet: Unknown role name '${this.appletView.roleName}'.`);
          }
          if (assetViewInfo.integrityZomeName != THREADS_DEFAULT_INTEGRITY_ZOME_NAME) {
            throw new Error(`Threads/we-applet: Unknown zome '${this.appletView.integrityZomeName}'.`);
          }
          const entryType = pascal(assetViewInfo.entryType);
          console.log("pascal entryType", assetViewInfo.entryType, entryType);
          switch (entryType) {
            case ThreadsEntryType.ParticipationProtocol:
              const ppAh = encodeHashToBase64(assetViewInfo.wal.hrl[1]);
              console.log("asset ppAh:", ppAh);
              //   const viewContext = attachableViewInfo.wal.context as AttachableThreadContext;
              view = html`<comment-thread-view style="height: 100%;" showInput="true" .threadHash=${ppAh}></comment-thread-view>`;
            break;
            case ThreadsEntryType.TextBead:
            case ThreadsEntryType.AnyBead:
            case ThreadsEntryType.EntryBead:
                const beadAh = encodeHashToBase64(assetViewInfo.wal.hrl[1]);
                // @click=${(_e) => this.dispatchEvent(beadJumpEvent(beadAh))}
                view = html`<chat-item .hash=${beadAh} shortmenu></chat-item>`;
              break
            default:
              throw new Error(`Unhandled entry type ${assetViewInfo.entryType}.`);
          }
        break;
        case "creatable":
          const creatableViewInfo = this.appletView as {
            type: "creatable";
            name: CreatableName;
            resolve: (wal: WAL) => Promise<void>;
            reject: (reason: any) => Promise<void>;
            cancel: () => Promise<void>;
          };
          if (creatableViewInfo.name == "Thread") {
            view = html`<create-thread-panel 
                    @create=${async (e: CustomEvent<CreateThreadRequest>) => {
                      try {
                        console.log("@create event", e.detail);
                        const hrlc = weaveUrlToWal(e.detail.wurl);
                        const attLocInfo = await this._weServices.assetInfo(hrlc);
                        const subject: Subject = {
                            hash: hrlc.hrl[1],
                            typeName: attLocInfo.assetInfo.icon_src,
                            dnaHash: hrlc.hrl[0],
                            appletId: encodeHashToBase64(attLocInfo.appletHash),
                        }
                        const subject_name = await determineSubjectName(materializeSubject(subject), this.threadsDvm.threadsZvm, this.filesDvm, this._weServices);
                        console.log("@create event subject_name", subject_name);                        
                        const pp: ParticipationProtocol = {
                            purpose: e.detail.purpose,
                            rules: e.detail.rules,
                            subject,
                            subject_name,
                        };
                        const [ppAh, ppMat] = await this.threadsDvm.threadsZvm.publishParticipationProtocol(pp);
                        const wal: WAL = {hrl: [decodeHashFromBase64(this.threadsDvm.cell.dnaHash), decodeHashFromBase64(ppAh)], context: ppMat.subject.hash}
                        await creatableViewInfo.resolve(wal);
                      } catch(e) {
                          creatableViewInfo.reject(e)
                    }}}
                    @cancel=${(_e) => creatableViewInfo.cancel()}
                    @reject=${(e) => creatableViewInfo.reject(e.detail)}
            ></create-thread-panel>`;
          } else {
            throw new Error(`Unhandled creatable type ${creatableViewInfo.name}.`)
          }
        break;
        default:
          console.error("Unknown applet-view type", this.appletView);
          throw new Error(`Unknown applet-view type: ${(this.appletView as any).type}`);
      }
    } else {
      let _provider = new ContextProvider(this, appProxyContext, this.appProxy);
    }


    const doodle_bg =  html `
      <div style="flex-grow:1; position: absolute; top:0; left:0; width:100%; height:100%;">
        ${doodle_flowers}
      </div>
    `;

    /** Import profile from We */
    let guardedView = view;
    const maybeMyProfile = this.threadsDvm.profilesZvm.getMyProfile();
    console.log("<vines-app> Profile", this._hasWeProfile, maybeMyProfile);
    if (this._hasWeProfile && !maybeMyProfile) {
      guardedView = html`
          ${doodle_bg}          
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; padding-bottom:10px; margin:auto; min-width:400px;">
          <h1 style="font-family:arial; color:#5804A8; z-index:1;"><img src="icon.png" width="32" height="32"
                                                              style="padding-left: 5px;padding-top: 5px;"/> Vines</h1>
          <div style="align-items: center; z-index:1;">
            <ui5-card id="profileCard">
              <ui5-card-header title-text=${msg('Import Profile into Vines')}></ui5-card-header>
              <vines-edit-profile
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
              ></vines-edit-profile>
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

        #profileCard {
          box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;
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



