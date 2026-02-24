import {html, css, PropertyValues} from "lit";
import {state, customElement} from "lit/decorators.js";
import {ContextProvider} from "@lit/context";
import {msg, localized} from '@lit/localize';
import {
  AdminWebsocket,
  Signal,
  AppWebsocket,
  InstalledAppId,
} from "@holochain/client";
import {
  AppletView, CreatableName, Hrl, WAL, weaveUrlFromWal,
  WeaveServices,
} from "@theweave/api";
import {
    HCL,
    HappMultiElement,
    HvmDef,
    DvmDef,
    DnaViewModel, pascal, ActionId, Cell,
    HcConnectionOptions, DnaId,
} from "@ddd-qc/lit-happ";
import {
    ThreadsDvm,
    ThreadsEntryType,
    THREADS_DEFAULT_INTEGRITY_ZOME_NAME,
    filesContext,
    weClientContext,
    cardStyleTemplate,
    JumpEvent,
    VINES_DEFAULT_ROLE_NAME,
    onlineLoadedContext,
    toasty, hrl2Id, allFilesContext, networkCallerContext, getRandomHexColor, generateRandomName,
    renderWelcomeScreen, BeadInfo,
} from "@vines/elements";
import {setLocale} from "./localization";

import {WeServicesEx} from "@ddd-qc/we-utils";
import {AppProxy, AgentId, EntryId, dec64} from "@ddd-qc/cell-proxy";
import {AssetViewInfo} from "@ddd-qc/we-utils";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";
import {DEFAULT_THREADS_DEF} from "./happDef";

import "./vines-page"
import {HAPP_BUILD_MODE, HappBuildModeType} from "@ddd-qc/lit-happ/dist/globals";

import * as APPV from './generated/version.js';
import {HappInfo} from "./vines-index";
import {invoke} from "@tauri-apps/api/core";
import {happShareCodeContext, MyTauriConfig} from "./globals";
import {ICON_B64} from "./icon";

//import Button from "@ui5/webcomponents/dist/Button";
//import {searchAgentPlugin} from "@holochain-open-dev/profiles/dist/elements/textarea-with-mentions";


/** Used by we-applet */
export interface VinesAssetQuery {
  detail: string,
  subjectType: string,
  subjectName: string,
  subjectAuthor?: AgentId,
}

export type AppletGroup = {
  appId: InstalledAppId,
  appletId: EntryId,
  appWs: AppWebsocket,
  profilesHcl: HCL,
  profilesAppProxy: AppProxy,
  appletView: AppletView,
}


/** */
@localized()
@customElement("vines-app")
export class VinesApp extends HappMultiElement {

  static override readonly HVM_DEF: HvmDef = DEFAULT_THREADS_DEF;

  @state() private _loadedLocal = false;
  @state() private _loadedNetwork = false;
  private _onlineLoadedProvider?: any;

  @state() private _hasHolochainFailed: boolean | undefined = undefined;
  @state() private _hasWeProfile = false;

  /** We-applet specifics */
  private _weProfilesDvm?: ProfilesDvm;
  protected _weServices?: WeServicesEx;


  /** -- Constructor -- */

  public readonly appId?: InstalledAppId;
  public readonly appletView?: AppletView;

  /** All arguments should be provided when constructed explicitly */
  constructor(private _adminWs?: AdminWebsocket, appletGroups?: AppletGroup[], isMulti?: boolean) {
    console.log("<vines-app>.ctor()", APPV.APP_VERSION, appletGroups?.length);
    const adminUrl = _adminWs
      ? undefined
      : HC_ADMIN_PORT
        ? new URL(`ws://localhost:${HC_ADMIN_PORT}`)
        : undefined;
    let tuples: [HcConnectionOptions, string | undefined, InstalledAppId | undefined][] = [];
    if (appletGroups && appletGroups.length > 0) {
      tuples = appletGroups.map((appletGroup) => [{socket: appletGroup.appWs, timeout: 20 * 1000}, APPV.HAPP_SHA256, appletGroup.appId]);
    } else {
        tuples = [[{port: HC_APP_PORT!, token: HAPP_TOKEN, timeout: 20 * 1000, adminUrl}, APPV.HAPP_SHA256 , HAPP_ID]];
    }
    console.log("<vines-app>.ctor() tuples", tuples);
    super(tuples, isMulti? !isMulti : true);
    /** */
    if (appletGroups && appletGroups.length > 0) {
      this.appId = appletGroups[0]!.appId;
      this.appletView = appletGroups[0]!.appletView;
    }
    this._onlineLoadedProvider = new ContextProvider(this, onlineLoadedContext, false);

    if (globalThis.IS_TAURI) {
        console.debug("REQUESTING TAURI CONFIG...");
        invoke<MyTauriConfig>("get_config").then((config: MyTauriConfig) => {
            console.log("GOT TAURI CONFIG: " + JSON.stringify(config));
            globalThis.TAURI_HAPP_SHA256 = config.happ_sha256;
            globalThis.TAURI_TARGET_ARC = config.arc;
            this.hvms.forEach(([appProxy, _hvm]) => appProxy.setHappSha256(globalThis.TAURI_HAPP_SHA256!))
        })
    }
  }


  /**  */
  static async fromWe(
    weServices: WeaveServices,
    adminWs: AdminWebsocket | undefined,
    isMulti: boolean,
    appletGroups: AppletGroup[],
  ): Promise<VinesApp> {
    if (appletGroups.length == 0) {
      throw Error("<vines-app> needs at least one appletGroup");
    }
    const app = new VinesApp(adminWs, appletGroups, isMulti);
    /** Provide it as context */
    const appletIds = appletGroups.map((group) => group.appletId);
    app._weServices = new WeServicesEx(weServices, appletIds);
    console.log(`\t\tProviding context "${weClientContext}" | in host `, app);
    /*let _weProvider =*/
    new ContextProvider(app, weClientContext, app._weServices);
    /** Create Profiles Dvm from provided AppProxy */
    console.log("<vines-app>.fromWe()", appletIds);
    await app.createWeProfilesDvm(appletGroups[0]!.profilesAppProxy, appletGroups[0]!.profilesHcl);
    return app;
  }


  /** Create a Profiles DVM out of a different happ */
  async createWeProfilesDvm(profilesProxy: AppProxy, profilesHcl: HCL): Promise<void> {
    const profilesAppInfo = await profilesProxy.appInfo();
    if (!profilesAppInfo) {
      throw Promise.reject("Missing Profiles AppInfo");
    }
    const profilesDef: DvmDef = {ctor: ProfilesDvm, baseRoleName: profilesHcl.baseRoleName, isClonable: false};
    const cell_infos = Object.values(profilesAppInfo.cell_info);
    console.log("createProfilesDvm() cell_infos:", cell_infos);
    /** Create Profiles DVM */
    const dvm: DnaViewModel = new profilesDef.ctor(this, profilesProxy, profilesHcl, false);
    console.log("createProfilesDvm() dvm", dvm);
    await this.setupWeProfilesDvm(dvm as ProfilesDvm, new AgentId(profilesAppInfo.agent_pub_key));
  }


  /** */
  async setupWeProfilesDvm(dvm: ProfilesDvm, agent: AgentId): Promise<void> {
    this._weProfilesDvm = dvm as ProfilesDvm;
    /** Load My profile */
    const maybeMyProfile = await this._weProfilesDvm.profilesZvm.probeProfile(agent.b64);
    if (maybeMyProfile) {
      // const maybeLang = maybeMyProfile.fields['lang'];
      // if (maybeLang) {
      //   console.log("Setting locale from We Profile", maybeLang);
      //   setLocale(maybeLang);
      // }
      this._hasWeProfile = true;
    }
    setLocale(this._weServices!.getLocale());
  }


  /** Handle global events */
  override connectedCallback() {
    super.connectedCallback();
    // @ts-ignore
    this.addEventListener('jump', this.onJump);
    // @ts-ignore
    this.addEventListener('copy', this.onCopy);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // @ts-ignore
    this.removeEventListener('jump', this.onJump);
    // @ts-ignore
    this.removeEventListener('copy', this.onCopy);
  }


  /** -- Getters -- */

  threadsDvm(idx: number): ThreadsDvm { return this.hvms[idx]![1].getDvm(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)! as ThreadsDvm }

  filesDvm(idx: number): FilesDvm { return this.hvms[idx]![1].getDvm(FilesDvm.DEFAULT_BASE_ROLE_NAME)! as FilesDvm }

  get cells(): Cell[] {
    return this.hvms.map(([_appProxy, hvm]) => hvm.getDvm(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)!.cell);
  }

  findThreadsDvm(dna: DnaId): ThreadsDvm | undefined {
      for (let i = 0; i < this.hvms.length; i += 1) {
          const dvm = this.threadsDvm(i);
          console.debug("findThreadsDvm() dvm", i, dvm.cell.address.dnaId.b64);
          if (dvm.cell.address.dnaId.equals(dna)) {
              return dvm;
          }
      }
      return undefined;
  }

    // Notify parent that the vines happ is ready
    override firstUpdated() {
        //console.log("<vines-app>.firstUpdated() vines-ready");
        this.dispatchEvent(new CustomEvent('vines-ready', {
            detail: this.appId ?? this.cells[0]?.appId,
            bubbles: true,
            composed: true,
        }));
    }

  /** -- Methods -- */

  /** */
  handleSignal(sig: Signal) {
    console.log("<vines-app>.handleSignal()");
    for (const [appProxy, _hvm] of this.hvms) {
      appProxy.onSignal(sig);
    }
  }


  /** */
  override async hvmsConstructed() {
    console.log("<vines-app>.hvmsConstructed()", this.hvms.length, this._adminWs, this.appId, this.appletView);
    this._hasHolochainFailed = false;
    /** Provide Files DVM context  */
    console.log(`\t\tProviding context "${filesContext}" | in host `, this);
    // @ts-ignore
    /*let _filesProvider =*/
    new ContextProvider(this, filesContext, this.filesDvm(0));
    const allFilesDvm = this.hvms.map(([_proxy, hvm]) => hvm.getDvm(FilesDvm.DEFAULT_BASE_ROLE_NAME)! as FilesDvm)
    // @ts-ignore
    /*let _filesProvider =*/
    new ContextProvider(this, allFilesContext, allFilesDvm);
    /** */
    this.networkCaller?.setCapacity(20);
    this.networkCaller?.setCellAddr(this.threadsDvm(0).cell.address);
    //this.networkCaller?.startCallLoop(1000);
    // @ts-ignore
    new ContextProvider(this, networkCallerContext, this.networkCaller);
    //
    const allShareCodes: [string, string | null, string][] = this.hvms.map(([_proxy, hvm]) => [hvm.appId, hvm.happSha256, hvm.getHappShareCode()!])
    new ContextProvider(this, happShareCodeContext, allShareCodes);
  }


  /** */
  override async perspectiveInitializedFromLocal(): Promise<void> {
    console.debug("<vines-app> perspectiveInitializedFromLocal()");
    for (let i = 0; i < this.hvms.length; i += 1) {
      this.threadsDvm(i).threadsZvm.storeMainTopic();
      //const maybeProfile = await this.threadsDvm(i).profilesZvm.findProfile(this.filesDvm(i).cell.address.agentId);
      //console.debug("<vines-app> perspectiveInitializedFromLocal() maybeProfile", i, maybeProfile, this.threadsDvm(i).cell.address.agentId);
    }
    /** Done */
    this._loadedLocal = true;
  }


  /** */
  override async perspectiveInitializedFromNetwork(): Promise<void> {
    this._loadedNetwork = true;
    this._onlineLoadedProvider.setValue(true);
    console.debug("<vines-app> perspectiveInitializedFromNetwork() DONE")
  }


  /** */
  protected override async updated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow parts CSS */
    const profileCard = this.shadowRoot!.getElementById('profileCard') as HTMLElement;
    if (profileCard) {
      profileCard.shadowRoot!.appendChild(cardStyleTemplate.content.cloneNode(true));
    }
  }


  /** */
  async onDumpNetworkLogs(_e: any) {
    console.log("onDumpNetworkLogs()")
    //await this.networkInfoAll();
    this.networkCaller?.dumpNetworkMetricsLogs();
  }


  /** Open Vines App if jump requested from a non-main view */
  async onJump(e: CustomEvent<JumpEvent>) {
    //console.log("<vines-app>.onJump()", e.detail);
    if ((e.detail.thread || e.detail.bead) && this.appletView && this.appletView.type != "main" && this._weServices) {
      // FIXME: get correct threadsDvm
      const wal: WAL = { hrl: [this.threadsDvm(0).cell.address.dnaId.hash, e.detail.thread? e.detail.thread.hash : e.detail.bead!.hash], context: undefined };
      /* await */this._weServices.openAppletMain(dec64(this._weServices.appletIds[0]!), wal);
    }
  }


  /** copy can be requested from a non-main view */
  private async onCopy(e: CustomEvent<Hrl>) {
    if (!e.detail) {
      console.warn("Invalid copy event");
      return;
    }
    const hrl: Hrl = e.detail;
    const wurl = weaveUrlFromWal({hrl}/*, true*/);
    console.debug("onCopy() wurl", hrl, wurl);
    navigator.clipboard.writeText(wurl);
    if (this._weServices) {
      this._weServices.assets.assetToPocket({hrl});
    }
    toasty(msg("Copied WAL to clipboard"));
  }


  /** */
  private onRetryHolochain() {
    window.location.reload();
    // const btn = this.shadowRoot!.getElementById("retryBtn") as Button;
    // btn.disabled = true;
    // const allAppEntryTypes = await this.threadsDvm(0).fetchAllEntryDefs(); // FIXME 0
    // if (Object.values(allAppEntryTypes[THREADS_DEFAULT_COORDINATOR_ZOME_NAME]!).length == 0) {
    //   console.warn(`No entries found for ${THREADS_DEFAULT_COORDINATOR_ZOME_NAME}`);
    //   btn.disabled = false;
    // } else {
    //   this._hasHolochainFailed = false;
    // }
  }

  /** */
  override render() {
    console.log("<vines-app>.render()", !this._hasHolochainFailed, this._loadedLocal, this._loadedNetwork, this._hasWeProfile, this.hvms.length);
      let adminBtn = html``;
      if (globalThis.IS_TAURI && HAPP_BUILD_MODE != HappBuildModeType.Retail) {
          adminBtn = html`
              <div style="width: 100%">
                <button id="retryBtn"
                        style="max-width:300px; margin:auto; display: block;"
                        @click=${async (_e: any) => {
                            this.dispatchEvent(new CustomEvent<HappInfo>('app-selected', {detail: false, bubbles: true, composed: true}));
                        }}>
                    ${msg('Admin')}
                </button>
              </div>
            `;
      }
    /** Check init has been done */
    if (this._hasHolochainFailed == undefined) {
      return html`
          <div style="position:fixed; top:50%; width:100%; display:flex; flex-direction:column; gap:20px;">
              <ui5-busy-indicator delay="0" size="Large" active
                                  style="color:#ff4343"
              ></ui5-busy-indicator>
              <div style="margin:auto; font-size:large">${msg('Connecting to Holochain')}</div>
          </div>
          ${adminBtn}
      `;
    }
    if (this._hasHolochainFailed || this.hvms.length == 0) {
      return html`
          <div style="position:fixed; top:50%; width:100%; display:flex; flex-direction:column; gap:20px;">
              <div style="margin:auto; font-size:large">
                  ${msg("Failed to connect to Holochain or \"Vines\" cell.")}
              </div>
              <ui5-button id="retryBtn" design="Emphasized"
                          style="max-width:300px; margin:auto;"
                          @click=${async (_e: any) => this.onRetryHolochain()}>
                  ${msg('Retry')}
              </ui5-button>
          </div>
      `;
    }
    if (!this._loadedLocal) {
      return html`
          <div style="position:fixed; top:50%; width:100%; display:flex; flex-direction:column; gap:20px;">
          <ui5-busy-indicator delay="0" size="Large" active
                              style="color:#f3bb2c"
          ></ui5-busy-indicator>
              <div style="margin:auto; font-size:large">${msg('Collecting local data')}</div>
          </div>              
          ${adminBtn}
      `;
    }

    const appProxy = this.hvms[0]![0];

    let view = html``;
    if (this.appletView) {
      console.log("<vines-app> appletView", this.appletView);
      switch (this.appletView.type) {
        case "main":
            view = html`
        <vines-page
                .wal=${(this.appletView as any).wal}
                .appProxy=${appProxy}
                @dumpNetworkLogs=${this.onDumpNetworkLogs}
                @queryNetworkInfo=${(_e: any) => this.networkInfoAll()}
        ></vines-page>`;
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
          const [dnaId, dhtId] = hrl2Id(assetViewInfo.wal.hrl);
          console.log("pascal entryType", assetViewInfo.recordInfo.entryType, entryType);

          const thisThreadDvm = this.findThreadsDvm(dnaId);
          if (!thisThreadDvm) {
                return html`
                    <div style="position:fixed; top:50%; width:100%; display:flex; flex-direction:column; gap:20px;">
                        <div style="margin:auto; font-size:large">${msg('Error: ThreadDvm not found')} (${dnaId.b64})</div>
                    </div>
            `;
          }

          switch (entryType) {
            case ThreadsEntryType.ParticipationProtocol:
              const ppAh = new ActionId(dhtId.b64);
              console.log("asset ppAh:", ppAh);
              view = html`
                  <comment-thread-view assetview .threadHash=${ppAh} style="height: 100%;"
                                       showInput="true"></comment-thread-view>`;
              break;
            case ThreadsEntryType.EncryptedBead:
                const encBeadAh = new ActionId(dhtId.b64);
                const baseBeadInfo: BeadInfo | null = thisThreadDvm!.threadsZvm.perspective.getBaseBeadInfo(encBeadAh);
                if (!baseBeadInfo) {
                    view = html`<chat-item assetview .hash=${encBeadAh} shortmenu></chat-item>`;
                } else {
                    view = html`
                        <comment-thread-view assetview
                                             .threadHash=${baseBeadInfo.bead.ppAh}
                                             .beadAh=${encBeadAh}
                                             style="height: 100%;"
                                             showInput="true"></comment-thread-view>`;
                }
                break;
            case ThreadsEntryType.TextBead:
            case ThreadsEntryType.AnyBead:
            case ThreadsEntryType.EntryBead:
              const beadAh = new ActionId(dhtId.b64);
              // view message in comment thread
              const beadInfo: BeadInfo | undefined = thisThreadDvm!.threadsZvm.perspective.getBeadInfo(beadAh);
                if (!beadInfo) {
                    view = html`<chat-item assetview .hash=${beadAh} shortmenu></chat-item>`;
                } else {
                    view = html`
                        <comment-thread-view assetview
                                             .threadHash=${beadInfo.bead.ppAh}
                                             .beadAh=${beadAh}
                                             style="height: 100%;"
                                             showInput="true"></comment-thread-view>`;
                }
              break;
            case ThreadsEntryType.SemanticTopic:
              view = html`
                  <div>{SemanticTopic}</div>`
              break;
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
          if (creatableViewInfo.name.toLowerCase() == "thread") {
            view = html`
                <creatable-thread-panel
                        @create=${async (e: CustomEvent<WAL>) => {
                            console.log("@create event", e.detail);
                            await creatableViewInfo.resolve(e.detail);
                        }}
                        @cancel=${(_e: any) => creatableViewInfo.cancel()}
                        @reject=${(e: CustomEvent<any>) => creatableViewInfo.reject(e.detail)}
                ></creatable-thread-panel>`;
          } else {
            throw new Error(`Unhandled creatable type ${creatableViewInfo.name}.`)
          }
          break;
        default:
          console.error("Unknown applet-view type", this.appletView);
          throw new Error(`Unknown applet-view type: ${(this.appletView as any).type}`);
      }
    } else {
        view = html`
        <vines-page
                .appProxy=${appProxy}
                @dumpNetworkLogs=${this.onDumpNetworkLogs}
                @queryNetworkInfo=${(_e: any) => this.networkInfoAll()}
        ></vines-page>`;
      }

    /** Import profile from Moss */
    let guardedView = view;
    const profilesZvm = this.threadsDvm(0).profilesZvm; // FIXME
    const maybeMyProfile = profilesZvm.getMyProfile();
    console.log("<vines-app> Profile", this._hasWeProfile, maybeMyProfile);
    if (!maybeMyProfile) {
      guardedView = renderWelcomeScreen(this, profilesZvm, ICON_B64, this._hasWeProfile? this._weProfilesDvm: undefined);
    } else {
      if (!maybeMyProfile && HAPP_BUILD_MODE == HappBuildModeType.Debug) {
        /*await*/
        profilesZvm.createMyProfile({nickname: generateRandomName(), fields: {lang: "en", color: getRandomHexColor()}});
      }
    }

    console.log("<vines-app>.render() cells length:", this.cells.length, this.isMainView);
    /** Render all Single */
    if (this.isMainView) {
      return html`
          <cell-context .cell=${this.threadsDvm(0).cell}>
              ${guardedView}
          </cell-context>
      `;
    }

    /** Render all Multi */
    return html`
        <cell-context .cell=${this.threadsDvm(0).cell}>
            <cell-multi-context .cells=${this.cells}>
                <vines-page multi="true"></vines-page>
            </cell-multi-context>
        </cell-context>
    `;

  }


  /** */
  static override get styles() {
    return [
      css`
        :host {
          background: #F4F9FC;
          display: block;
          height: 100vh;
          width: 100%;
          font-family: '72';
        }

        #profileCard {
          box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;
        }
          
        #profileCardHeader::part(title) {
          font-size: large;
          font-weight: bold;
        }
          
        .column {
          display: flex;
          flex-direction: column;
        }

        .title {
          font-size: 20px;
        }

        ui5-card::part(region) {
          padding: 10px;
        }
      `,

    ];
  }
}



