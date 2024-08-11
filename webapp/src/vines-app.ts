import {html, css} from "lit";
import { state, customElement } from "lit/decorators.js";
import {ContextProvider} from "@lit/context";
import {PropertyValues} from "lit/development";
import {
  AdminWebsocket,
  AppSignal,
  AppWebsocket,
  InstalledAppId,
  ZomeName,
} from "@holochain/client";
import {
  AppletView, CreatableName, Hrl, WAL, weaveUrlFromWal,
  WeaveServices,
} from "@lightningrodlabs/we-applet";
import {
  HCL,
  HappElement,
  HvmDef,
  DvmDef,
  DnaViewModel, pascal, delay, ActionId,
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
  VINES_DEFAULT_ROLE_NAME,
  doodle_flowers,
  onlineLoadedContext,
  toasty, hrl2Id,
} from "@vines/elements";
import {setLocale} from "./localization";
import { msg, localized } from '@lit/localize';
import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"

import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {BaseRoleName, CloneId, AppProxy, AgentId, EntryId, dec64} from "@ddd-qc/cell-proxy";
import {AssetViewInfo} from "@ddd-qc/we-utils";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FILES_DEFAULT_COORDINATOR_ZOME_NAME, FilesDvm} from "@ddd-qc/files";
import {DEFAULT_THREADS_DEF} from "./happDef";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";

import "./vines-page"

import Button from "@ui5/webcomponents/dist/Button";


/** Used by we-applet */
export interface VinesAssetQuery {
  detail: string,
  subjectType: string,
  subjectName: string,
  subjectAuthor?: AgentId,
}


/** */
@localized()
@customElement("vines-app")
export class VinesApp extends HappElement {

  @state() private _offlineLoaded = false;
  @state() private _onlineLoaded = false;
           private _onlineLoadedProvider?: any;
  @state() private _hasHolochainFailed: boolean | undefined = undefined;

  @state() private _hasWeProfile = false;
  //@state() private _lang?: string

  //@state() private _currentSpaceEh: null | EntryId = null;

  static override readonly HVM_DEF: HvmDef = DEFAULT_THREADS_DEF;

  //@state() private _canShowBuildView = false;
  //@state() private _canShowDebug = false;

  @state() private _maybeSelectedThreadAh: ActionId | undefined = undefined;
  @state() private _maybeSelectedBeadAh: ActionId | undefined = undefined;


  /** -- We-applet specifics -- */

  private _weProfilesDvm?: ProfilesDvm;
  protected _weServices?: WeServicesEx;



  /** -- Ctor -- */

  /** All arguments should be provided when constructed explicity */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, readonly appId?: InstalledAppId, public appletView?: AppletView) {
    /** Figure out arguments for super() */
    const adminUrl = _adminWs
      ? undefined
      : HC_ADMIN_PORT
        ? new URL(`ws://localhost:${HC_ADMIN_PORT}`)
        : undefined;
    super(appWs? appWs : HC_APP_PORT, appId, adminUrl, 10 * 1000);
    /** */
    this._onlineLoadedProvider = new ContextProvider(this, onlineLoadedContext, false);
  }


  /**  */
  static async fromWe(
    appWs: AppWebsocket,
    adminWs: AdminWebsocket | undefined,
    appId: InstalledAppId,
    profilesAppId: InstalledAppId,
    profilesBaseRoleName: BaseRoleName,
    profilesCloneId: CloneId | undefined,
    profilesZomeName: ZomeName,
    profilesProxy: AppProxy,
    weServices: WeaveServices,
    thisAppletId: EntryId,
    //showCommentThreadOnly?: boolean,
    appletView: AppletView,
  ) : Promise<VinesApp> {
    const app = new VinesApp(appWs, adminWs, appId, appletView);
    /** Provide it as context */
    app._weServices = new WeServicesEx(weServices, thisAppletId);
    console.log(`\t\tProviding context "${weClientContext}" | in host `, app);
    /*let _weProvider =*/ new ContextProvider(app, weClientContext, app._weServices);
    /** Create Profiles Dvm from provided AppProxy */
    console.log("<thread-app>.fromWe()", profilesProxy);
    await app.createWeProfilesDvm(profilesProxy, profilesAppId, profilesBaseRoleName, profilesCloneId, profilesZomeName);
    return app;
  }


  /** Create a Profiles DVM out of a different happ */
  async createWeProfilesDvm(profilesProxy: AppProxy, profilesAppId: InstalledAppId, profilesBaseRoleName: BaseRoleName,
                            profilesCloneId: CloneId | undefined,
                            _profilesZomeName: ZomeName): Promise<void> {
    const profilesAppInfo = await profilesProxy.appInfo();
    if (!profilesAppInfo) {
      throw Promise.reject("Missing Profiles AppInfo");
    }
    const profilesDef: DvmDef = {ctor: ProfilesDvm, baseRoleName: profilesBaseRoleName, isClonable: false};
    const cell_infos = Object.values(profilesAppInfo.cell_info);
    console.log("createProfilesDvm() cell_infos:", cell_infos);
    /** Create Profiles DVM */
    //const profilesZvmDef: ZvmDef = [ProfilesZvm, profilesZomeName];
    const dvm: DnaViewModel = new profilesDef.ctor(this, profilesProxy, new HCL(profilesAppId, profilesBaseRoleName, profilesCloneId));
    console.log("createProfilesDvm() dvm", dvm);
    await this.setupWeProfilesDvm(dvm as ProfilesDvm, new AgentId(profilesAppInfo.agent_pub_key));
  }


  /** */
  async setupWeProfilesDvm(dvm: ProfilesDvm, agent: AgentId): Promise<void> {
    this._weProfilesDvm = dvm as ProfilesDvm;
    /** Load My profile */
    const maybeMyProfile = await this._weProfilesDvm.profilesZvm.probeProfile(agent.b64);
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
  override connectedCallback() {
    super.connectedCallback();
    // @ts-ignore
    this.addEventListener('jump', this.onJump);
    // @ts-ignore
    this.addEventListener('copy-thread', this.onCopyThread);
  }
  override disconnectedCallback() {
    super.disconnectedCallback();
    // @ts-ignore
    this.removeEventListener('jump', this.onJump);
    // @ts-ignore
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
  override async hvmConstructed() {
    console.log("<vines-app>.hvmConstructed()", this._adminWs)
    /** Attempt EntryDefs (triggers genesis) */
    const threadsOk = await this.attemptThreadsEntryDefs(5, 1000);
    const filesOk = await this.attemptFilesEntryDefs(5, 1000);
    this._hasHolochainFailed = !threadsOk || !filesOk;
    /** Provide Files as context */
    console.log(`\t\tProviding context "${globaFilesContext}" | in host `, this);
    // @ts-ignore
    let _filesProvider = new ContextProvider(this, globaFilesContext, this.filesDvm);
  }


  async attemptThreadsEntryDefs(attempts: number, delayMs: number): Promise<boolean> {
    while(attempts > 0) {
      attempts -= 1;
      const allAppEntryTypes = await this.threadsDvm.fetchAllEntryDefs();
      if (Object.values(allAppEntryTypes[THREADS_DEFAULT_COORDINATOR_ZOME_NAME]!).length == 0) {
        console.warn(`No entries found for ${THREADS_DEFAULT_COORDINATOR_ZOME_NAME}`);
        await delay(delayMs);
      } else {
        // console.log("allAppEntryTypes", allAppEntryTypes)
        return true;
      }
    }
    return false;
  }

  async attemptFilesEntryDefs(attempts: number, delayMs: number): Promise<boolean> {
    while(attempts > 0) {
      attempts -= 1;
      const allAppEntryTypes = await this.filesDvm.fetchAllEntryDefs();
      if (Object.values(allAppEntryTypes[FILES_DEFAULT_COORDINATOR_ZOME_NAME]!).length == 0) {
        console.warn(`No entries found for ${FILES_DEFAULT_COORDINATOR_ZOME_NAME}`);
        await delay(delayMs);
      } else {
        return true;
      }
    }
    return false;
  }


  /** */
  override async perspectiveInitializedOffline(): Promise<void> {
    console.log("<vines-app>.perspectiveInitializedOffline()");
    const maybeProfile = await this.threadsDvm.profilesZvm.findProfile(this.filesDvm.cell.address.agentId);
    console.log("perspectiveInitializedOffline() maybeProfile", maybeProfile, this.threadsDvm.cell.address.agentId);
    /** Done */
    this._offlineLoaded = true;
  }


  /** */
  override async perspectiveInitializedOnline(): Promise<void> {
    console.log("<vines-app>.perspectiveInitializedOnline() START", this.appletView);

    if (!this.appletView || (this.appletView && this.appletView.type == "main")) {
      await this.hvm.probeAll();
    }
    await this.networkInfoAll(); // TODO: should propable store result in class field
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
  protected override async updated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow parts CSS */
    const profileCard = this.shadowRoot!.getElementById('profileCard') as HTMLElement;
    if (profileCard) {
      profileCard.shadowRoot!.appendChild(cardStyleTemplate.content.cloneNode(true));
    }
  }


  /** */
  async onDumpNetworkLogs(_e:any) {
    console.log("onDumpNetworkLogs()")
    await this.networkInfoAll();
    this.dumpNetworkInfoLogs();
  }


  /** */
  async onJump(e: CustomEvent<JumpEvent>) {
    console.log("<vines-app>.onJump()", e.detail);
    if (e.detail.type == JumpDestinationType.Applet) {
      if (this._weServices) {
        this._weServices.openAppletMain(e.detail.address.hash);
      }
    }
    if (e.detail.type == JumpDestinationType.Thread || e.detail.type == JumpDestinationType.Dm) {
      if (this.appletView && this.appletView.type != "main") {
        if (this._weServices) {
          /* await */ this._weServices.openAppletMain(dec64(this._weServices.appletId));
          //this._weServices.openHrl();
        }
      } else {
        this._maybeSelectedThreadAh = new ActionId(e.detail.address.b64);
        this._maybeSelectedBeadAh = undefined;
      }
    }
    if (e.detail.type == JumpDestinationType.Bead) {
      //const tuple = await this._dvm.threadsZvm.zomeProxy.getTextMessage(decodeHashFromBase64(e.detail));
      //this._selectedThreadHash = encodeHashToBase64(tuple[2].bead.forProtocolAh);
      const beadAh = new ActionId(e.detail.address.b64);
      const beadInfo = await this.threadsDvm.threadsZvm.perspective.getBeadInfo(beadAh);
      if (beadInfo) {
        this._maybeSelectedThreadAh = beadInfo.bead.ppAh;
        this._maybeSelectedBeadAh = beadAh;
      } else {
        console.warn("JumpEvent failed. Bead not found", e.detail.address);
      }
    }
    if (e.detail.type == JumpDestinationType.Dm) {
      // TODO
    }
  }


  /** */
  private async onCopyThread(e: CustomEvent<ActionId>) {
    if (!e.detail) {
      console.warn("Invalid copy-thread event");
      return;
    }
    const hrl: Hrl = intoHrl(this.threadsDvm.cell.address.dnaId, e.detail);
    const wurl = weaveUrlFromWal({hrl}/*, true*/);
    navigator.clipboard.writeText(wurl);
    if (this._weServices) {
      this._weServices.walToPocket({hrl});
    }
    toasty(msg("Copied channel's WAL to clipboard"));
  }


  /** */
  override render() {
    console.log("<vines-app> override render()", !this._hasHolochainFailed,  this._offlineLoaded, this._onlineLoaded, this._hasWeProfile, this.threadsDvm.cell.print());

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
                    @click=${async (_e:any) => {
          const btn = this.shadowRoot!.getElementById("retryBtn") as Button;
          btn.disabled = true;
          const allAppEntryTypes = await this.threadsDvm.fetchAllEntryDefs();
          if (Object.values(allAppEntryTypes[THREADS_DEFAULT_COORDINATOR_ZOME_NAME]!).length == 0) {
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
    // TODO: should propable store networkInfoLogs in class field
    let view = html`
            <vines-page
                      .selectedThreadHash=${this._maybeSelectedThreadAh}
                      .selectedBeadAh=${this._maybeSelectedBeadAh}
                      .networkInfoLogs=${this.appProxy.networkInfoLogs} 
                      @dumpNetworkLogs=${this.onDumpNetworkLogs}
                      @queryNetworkInfo=${(_e:any) => this.networkInfoAll()}
            ></vines-page>`;
    if (this.appletView) {
      console.log("appletView", this.appletView);
      switch (this.appletView.type) {
        case "main":
          // @ts-ignore
          let _provider = new ContextProvider(this, appProxyContext, this.appProxy);
        break;
        case "block":
          throw new Error("Threads/we-applet: Block view is not implemented.");
        case "asset":
          const assetViewInfo = this.appletView as AssetViewInfo;
          if (!assetViewInfo.recordInfo) {
            throw new Error(`Threads/we-applet: Missing AssetViewInfo.recordInfo.`);
          }
          if (assetViewInfo.recordInfo.roleName != VINES_DEFAULT_ROLE_NAME) {
            throw new Error(`Threads/we-applet: Unknown role name '${assetViewInfo.recordInfo.roleName}'.`);
          }
          if (assetViewInfo.recordInfo.integrityZomeName != THREADS_DEFAULT_INTEGRITY_ZOME_NAME) {
            throw new Error(`Threads/we-applet: Unknown zome '${assetViewInfo.recordInfo.integrityZomeName}'.`);
          }
          const entryType = pascal(assetViewInfo.recordInfo.entryType);
          const [_dnaId, dhtId] = hrl2Id(assetViewInfo.wal.hrl);
          console.log("pascal entryType", assetViewInfo.recordInfo.entryType, entryType);
          switch (entryType) {
            case ThreadsEntryType.ParticipationProtocol:
              const ppAh = new ActionId(dhtId.b64);
              console.log("asset ppAh:", ppAh);
              //   const viewContext = attachableViewInfo.wal.context as AttachableThreadContext;
              view = html`<comment-thread-view style="height: 100%;" showInput="true" .threadHash=${ppAh}></comment-thread-view>`;
            break;
            case ThreadsEntryType.EncryptedBead:
            case ThreadsEntryType.TextBead:
            case ThreadsEntryType.AnyBead:
            case ThreadsEntryType.EntryBead:
                const beadAh = new ActionId(dhtId.b64);
                // @click=${(_e:any) => this.dispatchEvent(beadJumpEvent(beadAh))}
                view = html`<chat-item .hash=${beadAh} shortmenu></chat-item>`;
              break
            default:
              throw new Error(`Unhandled entry type ${assetViewInfo.recordInfo.entryType}.`);
          }
        break;
        case "creatable":
          const creatableViewInfo = this.appletView as {
            type: "creatable";
            name: CreatableName;
            resolve: (wal: WAL) => Promise<void>;
            cancel: () => Promise<void>;
            reject: (reason: any) => Promise<void>;
          };
          if (creatableViewInfo.name == "thread") {
            view = html`<create-thread-panel 
                    @create=${async (e: CustomEvent<WAL>) => {
                        console.log("@create event", e.detail);
                        await creatableViewInfo.resolve(e.detail);
                      }}
                    @cancel=${(_e:any) => creatableViewInfo.cancel()}
                    @reject=${(e:any) => creatableViewInfo.reject(e.detail)}
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
      // @ts-ignore
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
                  .profile=${this._weProfilesDvm?.profilesZvm.getMyProfile()}
                  @save-profile=${async (e: CustomEvent<ProfileMat>) => {
                    console.log("createMyProfile()", e.detail);
                    try {
                      await this.threadsDvm.profilesZvm.createMyProfile(e.detail);
                    } catch(e:any) {
                      console.warn("Failed creating my Profile", e);
                      return;
                    }
                    /** Wait for perspective to update */
                    /** TODO: add a timeout */
                    let maybeMeProfile;
                    do {
                        maybeMeProfile = this.threadsDvm.profilesZvm.getMyProfile();
                        await delay(20);
                    } while (!maybeMeProfile)
                    /** */
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
  static override get styles() {
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



