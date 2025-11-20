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
} from "@vines/elements";
import {setLocale} from "./localization";
import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"

import {WeServicesEx} from "@ddd-qc/we-utils";
import {AppProxy, AgentId, EntryId, dec64} from "@ddd-qc/cell-proxy";
import {AssetViewInfo} from "@ddd-qc/we-utils";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";
import {DEFAULT_THREADS_DEF} from "./happDef";
import {renderWelcomeScreen} from "@vines/elements";

import "./vines-page"
import {HAPP_BUILD_MODE, HappBuildModeType} from "@ddd-qc/lit-happ/dist/globals";


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

  @state() private _offlineLoaded = false;
  @state() private _onlineLoaded = false;
  private _onlineLoadedProvider?: any;
  @state() private _hasHolochainFailed: boolean | undefined = undefined;
  @state() private _hasWeProfile = false;

  /** We-applet specifics */
  private _weProfilesDvm?: ProfilesDvm;
  protected _weServices?: WeServicesEx;


  /** -- Constructor -- */

  public readonly appId?: InstalledAppId;
  public readonly appletView?: AppletView;

  /** All arguments should be provided when constructed explicity */
  constructor(private _adminWs?: AdminWebsocket, appletGroups?: AppletGroup[], isMulti?: boolean) {
    console.log("<vines-app>.ctor()", appletGroups?.length);
    const adminUrl = _adminWs
      ? undefined
      : HC_ADMIN_PORT
        ? new URL(`ws://localhost:${HC_ADMIN_PORT}`)
        : undefined;
    let pairs: [number | AppWebsocket, InstalledAppId | undefined][] = [];
    if (appletGroups && appletGroups.length > 0) {
      pairs = appletGroups.map((appletGroup) => [appletGroup.appWs, appletGroup.appId]);
    } else {
      if (!HC_APP_PORT) {
        console.log({window});
        const __HC_LAUNCHER_ENV__: string = "__HC_LAUNCHER_ENV__";
        const isLauncher = window && __HC_LAUNCHER_ENV__ in window;
        if (isLauncher) {
          // @ts-ignore
          const env = window[__HC_LAUNCHER_ENV__];
          console.log("env.APP_INTERFACE_PORT", env!.APP_INTERFACE_PORT);
          pairs = [[env!.APP_INTERFACE_PORT, env!.INSTALLED_APP_ID]];
        } else {
          throw Error("No appWebsocket or APP PORT set");
        }
      } else {
        pairs = [[HC_APP_PORT, undefined]];
      }
    }
    console.log("<vines-app>.ctor() pairs", pairs);
    super(pairs, isMulti? !isMulti : true, adminUrl, 20 * 1000);
    /** */
    if (appletGroups && appletGroups.length > 0) {
      this.appId = appletGroups[0]!.appId;
      this.appletView = appletGroups[0]!.appletView;
    }
    this._onlineLoadedProvider = new ContextProvider(this, onlineLoadedContext, false);
  }


  /**  */
  static async fromWe(
    weServices: WeaveServices,
    adminWs: AdminWebsocket | undefined,
    isMulti: boolean,
    appletGroups: AppletGroup[],
  ): Promise<VinesApp> {
    if (appletGroups.length == 0) {
      throw Error("Needs at lest one appletGroup");
    }
    const app = new VinesApp(adminWs, appletGroups, isMulti);
    /** Provide it as context */
    const appletIds = appletGroups.map((group) => group.appletId);
    app._weServices = new WeServicesEx(weServices, appletIds);
    console.log(`\t\tProviding context "${weClientContext}" | in host `, app);
    /*let _weProvider =*/
    new ContextProvider(app, weClientContext, app._weServices);
    /** Create Profiles Dvm from provided AppProxy */
    console.log("<thread-app>.fromWe()", appletGroups);
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
    this.addEventListener('copy', this.onCopy);
    // @ts-ignore
    this.addEventListener('lang-selected', this.onLang);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // @ts-ignore
    this.removeEventListener('jump', this.onJump);
    // @ts-ignore
    this.removeEventListener('copy', this.onCopy);
    // @ts-ignore
    this.removeEventListener('lang-selected', this.onLang);
  }


  /** -- Getters -- */

  threadsDvm(idx: number): ThreadsDvm { return this.hvms[idx]![1].getDvm(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)! as ThreadsDvm }

  filesDvm(idx: number): FilesDvm { return this.hvms[idx]![1].getDvm(FilesDvm.DEFAULT_BASE_ROLE_NAME)! as FilesDvm }

  get cells(): Cell[] {
    return this.hvms.map(([_appProxy, hvm]) => hvm.getDvm(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)!.cell);
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
    console.log("<vines-app>.hvmsConstructed()", this.hvms.length, this._adminWs)
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
  }


  /** */
  override async perspectiveInitializedFromLocal(): Promise<void> {
    console.log("<vines-app>.perspectiveInitializedOffline()");
    for (let i = 0; i < this.hvms.length; i += 1) {
      this.threadsDvm(i).threadsZvm.storeMainTopic();
      const maybeProfile = await this.threadsDvm(i).profilesZvm.findProfile(this.filesDvm(i).cell.address.agentId);
      console.log("perspectiveInitializedFromLocal() maybeProfile", maybeProfile, this.threadsDvm(i).cell.address.agentId);
    }
    /** Done */
    this._offlineLoaded = true;
  }


  /** */
  override async perspectiveInitializedFromNetwork(): Promise<void> {
    this._onlineLoaded = true;
    this._onlineLoadedProvider.setValue(true);
    //this.requestUpdate();
    console.log("<threads-app> perspectiveInitializedOnline() DONE")
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
      /* await */
      this._weServices.openAppletMain(dec64(this._weServices.appletIds[0]!));
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


  /** Open Vines App if jump requested from a non-main view */
  async onLang(e: CustomEvent) {
    console.log("set locale", e.detail);
    setLocale(e.detail);
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
    console.log("<vines-app>.render()", !this._hasHolochainFailed, this._offlineLoaded, this._onlineLoaded, this._hasWeProfile, this.hvms.length);
    /** Check init has been done */
    if (this._hasHolochainFailed == undefined) {
      return html`
          <ui5-busy-indicator delay="0" size="Medium" active
                              style="margin:auto; width:100%; height:50%; color:#ff4343"
          ></ui5-busy-indicator>
      `;
    }
    if (this._hasHolochainFailed || this.hvms.length == 0) {
      return html`
          <div style="display: flex; flex-direction: column">
              <div style="width: auto; height: auto; font-size: 3rem;">
                  ${msg("Failed to connect to Holochain Conductor and/or \"Vines\" cell.")};
              </div>
              <ui5-button id="retryBtn" design="Emphasized"
                          style="max-width:300px"
                          @click=${async (_e: any) => this.onRetryHolochain()}>
                  ${msg('Retry')}
              </ui5-button>
          </div>
      `;
    }
    if (!this._offlineLoaded) {
      return html`
          <ui5-busy-indicator delay="0" size="Medium" active
                              style="margin:auto; width:100%; height:50%; color:#f3bb2c"
          ></ui5-busy-indicator>
      `;
    }

    const appProxy = this.hvms[0]![0];

    // TODO: should probably store networkInfoLogs in class field
    let view = html`
        <vines-page
                .appProxy=${appProxy}
                @dumpNetworkLogs=${this.onDumpNetworkLogs}
                @queryNetworkInfo=${(_e: any) => this.networkInfoAll()}
        ></vines-page>`;
    if (this.appletView) {
      console.log("<vines-app> appletView", this.appletView);
      switch (this.appletView.type) {
        case "main":
          /** N/A */
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
              view = html`
                  <comment-thread-view assetview .threadHash=${ppAh} style="height: 100%;"
                                       showInput="true"></comment-thread-view>`;
              break;
            case ThreadsEntryType.EncryptedBead:
            case ThreadsEntryType.TextBead:
            case ThreadsEntryType.AnyBead:
            case ThreadsEntryType.EntryBead:
              const beadAh = new ActionId(dhtId.b64);
              // @click=${(_e:any) => this.dispatchEvent(beadJumpEvent(beadAh))}
              view = html`
                  <chat-item assetview .hash=${beadAh} shortmenu></chat-item>`;
              break
            case ThreadsEntryType.SemanticTopic:
              view = html`
                  <div>{SemanticTopic}</div>`
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
    }


    /** Import profile from Moss */
    const profilesZvm = this.threadsDvm(0).profilesZvm; // FIXME
    let guardedView = view;
    const maybeMyProfile = profilesZvm.getMyProfile();
    console.log("<vines-app> Profile", this._hasWeProfile, maybeMyProfile);
    if (this._hasWeProfile && !maybeMyProfile) {
      guardedView = renderWelcomeScreen(this, profilesZvm, this._weProfilesDvm);
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



