import {html, css} from "lit";
import { state, customElement } from "lit/decorators.js";
import {ContextProvider} from "@lit/context";
import {PropertyValues} from "lit/development";
import {
  AdminWebsocket,
  AppSignal,
  AppWebsocket,
  InstalledAppId,
} from "@holochain/client";
import {
  AppletView, CreatableName, Hrl, WAL, weaveUrlFromWal,
  WeaveServices,
} from "@lightningrodlabs/we-applet";
import {
  HCL,
  HappMultiElement,
  HvmDef,
  DvmDef,
  DnaViewModel, pascal, delay, ActionId, Cell,
} from "@ddd-qc/lit-happ";
import {
  ThreadsDvm,
  ThreadsEntryType,
  THREADS_DEFAULT_COORDINATOR_ZOME_NAME,
  THREADS_DEFAULT_INTEGRITY_ZOME_NAME,
  filesContext,
  weClientContext,
  cardStyleTemplate,
  appProxyContext,
  JumpEvent,
  VINES_DEFAULT_ROLE_NAME,
  doodle_flowers,
  onlineLoadedContext,
  toasty, hrl2Id, allFilesContext,
} from "@vines/elements";
import {setLocale} from "./localization";
import { msg, localized } from '@lit/localize';
import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"

import {WeServicesEx} from "@ddd-qc/we-utils";
import {AppProxy, AgentId, EntryId, dec64} from "@ddd-qc/cell-proxy";
import {AssetViewInfo} from "@ddd-qc/we-utils";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FILES_DEFAULT_COORDINATOR_ZOME_NAME, FilesDvm} from "@ddd-qc/files";
import {DEFAULT_THREADS_DEF} from "./happDef";
import {Profile, Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";

import "./vines-page"

import Button from "@ui5/webcomponents/dist/Button";
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
  @state() private _maybeSelectedThreadAh: ActionId | undefined = undefined;
  @state() private _maybeSelectedBeadAh: ActionId | undefined = undefined;

  /** We-applet specifics */
  private _weProfilesDvm?: ProfilesDvm;
  protected _weServices?: WeServicesEx;

  private _isMulti: boolean = false;


  /** -- Constructor -- */

  public readonly appId?: InstalledAppId;
  public readonly appletView?: AppletView;

  /** All arguments should be provided when constructed explicity */
  constructor(private _adminWs?: AdminWebsocket, appletGroups?: AppletGroup[], isMulti?: boolean/*appWs?: AppWebsocket, readonly appId?: InstalledAppId, public appletView?: AppletView*/) {
    const adminUrl = _adminWs
      ? undefined
      : HC_ADMIN_PORT
        ? new URL(`ws://localhost:${HC_ADMIN_PORT}`)
        : undefined;

    let pairs: [number | AppWebsocket, InstalledAppId | undefined][] = [[HC_APP_PORT, undefined]];
    if (appletGroups && appletGroups.length > 0) {
      pairs = appletGroups.map((appletGroup) => [appletGroup.appWs, appletGroup.appId]);
    }
    super(pairs, adminUrl, 20 * 1000);
    /** */
    if (appletGroups && appletGroups.length > 0) {
      this.appId = appletGroups[0]!.appId;
      this.appletView = appletGroups[0]!.appletView;
    }
    this._onlineLoadedProvider = new ContextProvider(this, onlineLoadedContext, false);
    this._isMulti = isMulti? isMulti : false;
  }


  /**  */
  static async fromWe(
    weServices: WeaveServices,
    adminWs: AdminWebsocket | undefined,
    isMulti: boolean,
    appletGroups: AppletGroup[],
  ) : Promise<VinesApp> {
    if (appletGroups.length == 0) {
      throw Error("Needs at lest one appletGroup");
    }
    const app = new VinesApp(adminWs, appletGroups, isMulti);
    /** Provide it as context */
    const appletIds = appletGroups.map((group) => group.appletId);
    app._weServices = new WeServicesEx(weServices, appletIds);
    console.log(`\t\tProviding context "${weClientContext}" | in host `, app);
    /*let _weProvider =*/ new ContextProvider(app, weClientContext, app._weServices);
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
    const dvm: DnaViewModel = new profilesDef.ctor(this, profilesProxy, profilesHcl);
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


  /** -- Methods -- */

  /** */
  handleSignal(sig: AppSignal) {
    console.log("<vines-app>.handleSignal()");
    for (const [appProxy, _hvm] of this.hvms) {
      appProxy.onSignal(sig);
    }
  }


  /** */
  override async hvmConstructed() {
    console.log("<vines-app>.hvmConstructed() adminWs:", this._adminWs)
    /** Attempt EntryDefs (triggers genesis) */
    const threadsOk = await this.attemptThreadsEntryDefs(5, 1000);
    const filesOk = await this.attemptFilesEntryDefs(5, 1000);
    this._hasHolochainFailed = !threadsOk || !filesOk;
    /** Provide Files as context  */
    console.log(`\t\tProviding context "${filesContext}" | in host `, this);

    // @ts-ignore
    /*let _filesProvider =*/ new ContextProvider(this, filesContext, this.filesDvm(0));

    const allFilesDvm = this.hvms.map(([_proxy, hvm]) => hvm.getDvm(FilesDvm.DEFAULT_BASE_ROLE_NAME)! as FilesDvm)
    // @ts-ignore
    /*let _filesProvider =*/ new ContextProvider(this, allFilesContext, allFilesDvm);
  }


  /**  */
  async attemptThreadsEntryDefs(attempts: number, delayMs: number): Promise<boolean> {
    for (let i = 0; i < this.hvms.length; i+= 1) {
      while (attempts > 0) {
        attempts -= 1;
        const allAppEntryTypes = await this.threadsDvm(i).fetchAllEntryDefs();
        if (Object.values(allAppEntryTypes[THREADS_DEFAULT_COORDINATOR_ZOME_NAME]!).length == 0) {
          console.warn(`No entries found for ${THREADS_DEFAULT_COORDINATOR_ZOME_NAME}`);
          await delay(delayMs);
        } else {
          // console.log("allAppEntryTypes", allAppEntryTypes)
          break;
        }
      }
      if (attempts == 0) return false;
    }
    return true;
  }


  /** */
  async attemptFilesEntryDefs(attempts: number, delayMs: number): Promise<boolean> {
    for (let i = 0; i < this.hvms.length; i+= 1) {
      while (attempts > 0) {
        attempts -= 1;
        const allAppEntryTypes = await this.filesDvm(i).fetchAllEntryDefs();
        if (Object.values(allAppEntryTypes[FILES_DEFAULT_COORDINATOR_ZOME_NAME]!).length == 0) {
          console.warn(`No entries found for ${FILES_DEFAULT_COORDINATOR_ZOME_NAME}`);
          await delay(delayMs);
        } else {
          break;
        }
      }
      if (attempts == 0) return false;
    }
    return true;
  }


  /** */
  override async perspectiveInitializedOffline(): Promise<void> {
    console.log("<vines-app>.perspectiveInitializedOffline()");
    for (let i = 0; i < this.hvms.length; i+= 1) {
      const maybeProfile = await this.threadsDvm(i).profilesZvm.findProfile(this.filesDvm(i).cell.address.agentId);
      console.log("perspectiveInitializedOffline() maybeProfile", maybeProfile, this.threadsDvm(i).cell.address.agentId);
    }
    /** Done */
    this._offlineLoaded = true;
  }


  /** */
  override async perspectiveInitializedOnline(): Promise<void> {
    console.log("<vines-app>.perspectiveInitializedOnline() START", this.appletView);

    for (let i = 0; i < this.hvms.length; i+= 1) {
      if (!this.appletView || (this.appletView && this.appletView.type == "main")) {
        await this.hvms[i]![1].probeAll();
      }
    }
    //await this.networkInfoAll(); // TODO: should propable store result in class field
    console.log("<vines-app>.perspectiveInitializedOnline() DONE");
    this._onlineLoaded = true;
    this._onlineLoadedProvider.setValue(true);
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
  async onDumpNetworkLogs(_e:any) {
    console.log("onDumpNetworkLogs()")
    //await this.networkInfoAll();
    //this.dumpNetworkInfoLogs();
  }


  /** */
  async onJump(e: CustomEvent<JumpEvent>) {
    console.log("<vines-app>.onJump()", e.detail);

    this._maybeSelectedBeadAh = undefined;
    this._maybeSelectedThreadAh = undefined;

    if (e.detail.thread) {
      if (this.appletView && this.appletView.type != "main") {
        if (this._weServices) {
          /* await */ this._weServices.openAppletMain(dec64(this._weServices.appletIds[0]!));
        }
      } else {
        this._maybeSelectedThreadAh = e.detail.thread;
        this._maybeSelectedBeadAh = undefined;
      }
      return;
    }
    if (e.detail.bead) {
      const beadInfo = await this.threadsDvm(0).threadsZvm.perspective.getBeadInfo(e.detail.bead); // FIXME 0
      if (beadInfo) {
        this._maybeSelectedThreadAh = beadInfo.bead.ppAh;
        this._maybeSelectedBeadAh = e.detail.bead;
      } else {
        console.warn("JumpEvent failed. Bead not found", e.detail.bead);
      }
    }
  }


  /** */
  private async onCopy(e: CustomEvent<Hrl>) {
    if (!e.detail) {
      console.warn("Invalid copy event");
      return;
    }
    const hrl: Hrl = e.detail;
    const wurl = weaveUrlFromWal({hrl}/*, true*/);
    navigator.clipboard.writeText(wurl);
    if (this._weServices) {
      this._weServices.walToPocket({hrl});
    }
    toasty(msg("Copied WAL to clipboard"));
  }


  /** */
  override render() {
    console.log("<vines-app>.render()", !this._hasHolochainFailed,  this._offlineLoaded, this._onlineLoaded, this._hasWeProfile, this.hvms.length);
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
          const allAppEntryTypes = await this.threadsDvm(0).fetchAllEntryDefs(); // FIXME 0
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

    // TODO: should propable store networkInfoLogs in class field
    let view = html`
            <vines-page
                      .selectedThreadHash=${this._maybeSelectedThreadAh}
                      .selectedBeadAh=${this._maybeSelectedBeadAh}
                      .networkInfoLogs=${this.hvms[0]![0].networkInfoLogs} 
                      @dumpNetworkLogs=${this.onDumpNetworkLogs}
                      @queryNetworkInfo=${(_e:any) => {}/*this.networkInfoAll()*/}
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
                    @reject=${(e: CustomEvent<any>) => creatableViewInfo.reject(e.detail)}
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

    /** Import profile from Moss */
    const profilesZvm = this.threadsDvm(0).profilesZvm; // FIXME
    let guardedView = view;
    const maybeMyProfile = profilesZvm.getMyProfile();
    console.log("<vines-app> Profile", this._hasWeProfile, maybeMyProfile);
    if (this._hasWeProfile && !maybeMyProfile) {
      guardedView = html`
          ${doodle_bg}          
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; padding-bottom:10px; margin:auto; min-width:400px;">
          <h1 style="font-family:arial; color:#5804A8; z-index:1;">
              <img src="icon.png" width="32" height="32" style="padding-left: 5px;padding-top: 5px;"/>
              Vines
          </h1>
          <div style="align-items: center; z-index:1;">
            <ui5-card id="profileCard">
              <ui5-card-header title-text=${msg('Import Profile into Vines')}></ui5-card-header>
              <vines-edit-profile
                  .profile=${this._weProfilesDvm?.profilesZvm.getMyProfile()}
                  @save-profile=${async (e: CustomEvent<ProfileMat>) => {
                    console.log("createMyProfile()", e.detail);
                    try {
                      await profilesZvm.createMyProfile(e.detail);
                    } catch(e:any) {
                      console.warn("Failed creating my Profile", e);
                      return;
                    }
                    /** Wait for perspective to update */
                    /** TODO: add a timeout */
                    let maybeMeProfile: Profile | undefined = undefined;
                    do {
                        maybeMeProfile = profilesZvm.getMyProfile();
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

    console.log("<vines-app>.render() cells length:", this.cells.length);
    /** Render all Single */
    if (!this._isMulti) {
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
              <vines-page multi="true"
                        .selectedThreadHash=${this._maybeSelectedThreadAh}
                        .selectedBeadAh=${this._maybeSelectedBeadAh}
              ></vines-page>
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



