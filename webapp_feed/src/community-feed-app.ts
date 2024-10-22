import {css, html} from "lit";
import {customElement, state} from "lit/decorators.js";
import {ContextProvider} from "@lit/context";
import {PropertyValues} from "lit/development";
import {
  AdminWebsocket,
  Signal,
  AppWebsocket,
  InstalledAppId,
  ZomeName,
} from "@holochain/client";
import {AppletView, CreatableName, Hrl, WAL, weaveUrlFromWal, WeaveServices} from "@theweave/api";
import {
  ActionId,
  AgentId,
  delay,
  DnaViewModel,
  DvmDef,
  EntryId,
  HappElement,
  HCL,
  HvmDef,
  pascal,
} from "@ddd-qc/lit-happ";
import {
  cardStyleTemplate,
  determineSubjectName,
  doodle_threads,
  filesContext,
  MainViewType,
  JumpEvent,
  MAIN_TOPIC_ID,
  NotifySetting,
  onlineLoadedContext,
  ParticipationProtocol,
  Subject,
  THREADS_DEFAULT_INTEGRITY_ZOME_NAME,
  ThreadsDvm,
  ThreadsEntryType,
  toasty,
  VINES_DEFAULT_ROLE_NAME,
  weaveUrlToWal,
  weClientContext,
  getMainThread, MAIN_SEMANTIC_TOPIC, SpecialSubjectType, hrl2Id,
} from "@vines/elements";
import {setLocale} from "./localization";
import {localized, msg} from '@lit/localize';
import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"

import {AssetViewInfo, intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {AppProxy, BaseRoleName, CloneId} from "@ddd-qc/cell-proxy";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";
import {DEFAULT_THREADS_DEF} from "./happDef";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";


//import Button from "@ui5/webcomponents/dist/Button";

import "./community-feed-page"


/** */
@localized()
@customElement("community-feed-app")
export class CommunityFeedApp extends HappElement {

  @state() private _offlineLoaded = false;
  @state() private _onlineLoaded = false;
           private _onlineLoadedProvider?: any;
  @state() private _hasHolochainFailed: boolean | undefined = undefined;

  @state() private _hasWeProfile = false;
  //@state() private _lang?: string;

  static override readonly HVM_DEF: HvmDef = DEFAULT_THREADS_DEF;

  @state() private _selectedPostAh?: ActionId;


  /** -- We-applet specifics -- */

  private _weProfilesDvm?: ProfilesDvm;
  protected _weServices?: WeServicesEx;



  /** -- Ctor -- */

  /** All arguments should be provided when constructed explicity */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, readonly appId?: InstalledAppId, public appletView?: AppletView) {
    const adminUrl = _adminWs
      ? undefined
      : HC_ADMIN_PORT
        ? new URL(`ws://localhost:${HC_ADMIN_PORT}`)
        : undefined;
    super(appWs? appWs : HC_APP_PORT, appId, adminUrl);
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
  ) : Promise<CommunityFeedApp> {
    const app = new CommunityFeedApp(appWs, adminWs, appId, appletView);
    /** Provide it as context */
    app._weServices = new WeServicesEx(weServices, [thisAppletId]);
    console.log(`<community-feed-app> \t\tProviding context "${weClientContext}" | in host `, app);
    /*let _weProvider =*/ new ContextProvider(app, weClientContext, app._weServices);
    /** Create Profiles Dvm from provided AppProxy */
    console.log("<<community-feed-app>.fromWe()", profilesProxy);
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
    console.log("<community-feed-app> createProfilesDvm() cell_infos:", cell_infos);
    /** Create Profiles DVM */
    //const profilesZvmDef: ZvmDef = [ProfilesZvm, profilesZomeName];
    const dvm: DnaViewModel = new profilesDef.ctor(this, profilesProxy, new HCL(profilesAppId, profilesBaseRoleName, profilesCloneId));
    console.log("<community-feed-app> createProfilesDvm() dvm", dvm);
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
        console.log("<community-feed-app> Setting locale from We Profile", maybeLang);
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
  handleSignal(sig: Signal) {
    console.log("<community-feed-app>.handleSignal()")
    this.appProxy.onSignal(sig);
  }


  /** */
  override async hvmConstructed() {
    console.log("<community-feed-app>.hvmConstructed()", this._adminWs)
    this._hasHolochainFailed = false;
    /** Provide Files as context */
    console.log(`<community-feed-app>\t\tProviding context "${filesContext}" | in host `, this);
    // @ts-ignore
    let _filesProvider = new ContextProvider(this, filesContext, this.filesDvm);
  }


  /** */
  override async perspectiveInitializedOffline(): Promise<void> {
    console.log("<community-feed-app>.perspectiveInitializedOffline()");
    const maybeProfile = await this.threadsDvm.profilesZvm.findProfile(this.filesDvm.cell.address.agentId);
    console.log("<community-feed-app> perspectiveInitializedOffline() maybeProfile", maybeProfile, this.threadsDvm.cell.address.agentId);
    /** Done */
    this.threadsDvm.dumpCallLogs();
    this._offlineLoaded = true;
  }


  /** */
  override async perspectiveInitializedOnline(): Promise<void> {
    console.log("<community-feed-app>.perspectiveInitializedOnline() START", this.appletView);

    if (!this.appletView || (this.appletView && this.appletView.type == "main")) {
      await this.hvm.probeAll();
    }
    await this.networkInfoAll(); // FIXME: should propable store result in class field


    /** Make sure main topic and thread exists */
    this.threadsDvm.threadsZvm.storeMainTopic();
    this.threadsDvm.threadsZvm.pullSubjectThreads(MAIN_TOPIC_ID);
    const mainThreads = this.threadsDvm.threadsZvm.perspective.threadsPerSubject.get(MAIN_TOPIC_ID.b64);
    console.log("<community-feed-app>.perspectiveInitializedOnline() threads", mainThreads);
    if (mainThreads && mainThreads.length > 0) {
      const mainThreadAh = getMainThread(this.threadsDvm)!;
      console.log("<community-feed-app>.perspectiveInitializedOnline() mainThreadAh", mainThreadAh);
      /** Make sure subscribe to notifications for main thread */
      await this.threadsDvm.threadsZvm.pullNotifSettings(mainThreadAh);
      const notif = this.threadsDvm.threadsZvm.perspective.getNotifSetting(mainThreadAh, this.threadsDvm.cell.address.agentId);
      if (notif != NotifySetting.AllMessages) {
        await this.threadsDvm.threadsZvm.publishNotifSetting(mainThreadAh, NotifySetting.AllMessages);
      }
    }

    /** */
    console.log("<community-feed-app>.perspectiveInitializedOnline() DONE");
    this._onlineLoaded = true;
    this._onlineLoadedProvider.setValue(true);
  }


  /** USE FOR DEBUGGING */
  // /** */
  // shouldUpdate(): boolean {
  //   const canUpdate = super.shouldUpdate();
  //   console.log("<community-feed-app>.shouldUpdate()", canUpdate, this._offlineLoaded);
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
    console.log("<community-feed-app>.onDumpNetworkLogs()")
    await this.networkInfoAll();
    this.dumpNetworkInfoLogs();
  }


  /** */
  async onJump(e: CustomEvent<JumpEvent>) {
    console.log("<community-feed-app>.onJump()", e.detail);
    if (e.detail.type == MainViewType.Thread) {
      // if (this.appletView && this.appletView.type != "main") {
      //   if (this._weServices) {
      //     this._weServices.openAppletMain(decodeHashFromBase64(this._weServices.appletId));
      //     //this._weServices.openHrl();
      //   }
      // } else {
      //   this._selectedThreadHash = e.detail.hash;
      //   this._selectedBeadAh = '';
      // }
    }
    if (e.detail.bead) {
      /** Directly to post or get post from comment thread subject */
      const beadAh = e.detail.bead;
      const beadInfo = await this.threadsDvm.threadsZvm.perspective.getBeadInfo(beadAh);
      if (!beadInfo) {
        console.warn("JumpEvent failed. Bead not found", beadAh.short);
        return;
      }
      const maybe = await this.threadsDvm.threadsZvm.fetchPp(beadInfo.bead.ppAh);
      if (!maybe) {
        console.warn("JumpEvent failed. Bead's PP not found", beadInfo.bead.ppAh.short);
        return;
      }
      const [pp, _title, _ts, _author] = maybe;
      if (pp.subject.name == MAIN_SEMANTIC_TOPIC) {
        this._selectedPostAh = beadAh;
      } else {
        this._selectedPostAh = new ActionId(pp.subject.address);
      }
      this.requestUpdate();
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
    console.log("<community-feed-app>.render()", !this._hasHolochainFailed,  this._offlineLoaded, this._onlineLoaded, this._hasWeProfile, this.threadsDvm.cell.print());

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
        <div style="width: auto; height: auto; font-size: 3rem;">${msg("Failed to connect to Holochain Conductor and/or \"Feed\" cell.")};</div>
        <ui5-button id="retryBtn" design="Emphasized"
                    style="max-width:300px"
                    @click=${async (_e:any) => window.location.reload()}
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
            <community-feed-page
                      .selectedPostAh=${this._selectedPostAh}
                      .networkInfoLogs=${this.appProxy.networkInfoLogs} 
                      @dumpNetworkLogs=${this.onDumpNetworkLogs}
                      @queryNetworkInfo=${(_e:any) => this.networkInfoAll()}
            ></community-feed-page>`;
    if (this.appletView) {
      console.log("<community-feed-app> appletView", this.appletView);
      switch (this.appletView.type) {
        case "main":
        break;
        case "block":
          throw new Error("Threads/we-applet: Block view is not implemented.");
        case "asset":
          const assetViewInfo = this.appletView as AssetViewInfo;
          if (!assetViewInfo.recordInfo) {
            throw new Error(`Feed/we-applet: Missing AssetViewInfo.recordInfo.`);
          }
          if (assetViewInfo.recordInfo.roleName != VINES_DEFAULT_ROLE_NAME) {
            throw new Error(`Feed/we-applet: Unknown role name '${assetViewInfo.recordInfo.roleName}'.`);
          }
          if (assetViewInfo.recordInfo.integrityZomeName != THREADS_DEFAULT_INTEGRITY_ZOME_NAME) {
            throw new Error(`Feed/we-applet: Unknown zome '${assetViewInfo.recordInfo.integrityZomeName}'.`);
          }
          const entryType = pascal(assetViewInfo.recordInfo.entryType);
          //console.log("pascal entryType", assetViewInfo.entryType, entryType);
          const [_dnaId, dhtId] = hrl2Id(assetViewInfo.wal.hrl);
          switch (entryType) {
            case ThreadsEntryType.ParticipationProtocol:
              const ppAh = new ActionId(dhtId.b64);
              //console.log("asset ppAh:", ppAh);
              //   const viewContext = attachableViewInfo.wal.context as AttachableThreadContext;
              view = html`<comment-thread-view style="height: 100%;" showInput="true" .threadHash=${ppAh}></comment-thread-view>`;
            break;
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
            view = html`<create-post-panel 
                    @create=${async (e: CustomEvent/*<CreatePostRequest>*/) => {
                      try {
                        //console.log("@create post event", e.detail);
                        const wal0 = weaveUrlToWal(e.detail.wurl);
                        const [dnaId, dhtId] = hrl2Id(wal0.hrl);
                        const attLocInfo = await this._weServices!.assetInfo(wal0);
                        if (!attLocInfo) {
                          throw Error("Missing assetInfo");
                        }
                        const subject: Subject = {
                            address: dhtId.b64,
                            name: "",
                            typeName: SpecialSubjectType.Asset,
                            dnaHashB64: dnaId.b64,
                            appletId: new EntryId(attLocInfo.appletHash).b64,
                        }
                        subject.name = determineSubjectName(subject, this.threadsDvm.threadsZvm, this.filesDvm, this._weServices);
                        //console.log("@create event subject_name", subject_name);                        
                        const pp: ParticipationProtocol = {
                            purpose: e.detail.purpose,
                            rules: e.detail.rules,
                            subject,
                        };
                        const [_ts, ppAh] = await this.threadsDvm.threadsZvm.publishParticipationProtocol(pp);
                        const wal: WAL = {hrl: intoHrl(this.threadsDvm.cell.address.dnaId, ppAh), context: pp.subject.address}
                        await creatableViewInfo.resolve(wal);
                      } catch(e:any) {
                          creatableViewInfo.reject(e);
                    }}}
                    @cancel=${(_e:any) => creatableViewInfo.cancel()}
                    @reject=${(e:any) => creatableViewInfo.reject(e.detail)}
            ></create-post-panel>`;
          } else {
            throw new Error(`Unhandled creatable type ${creatableViewInfo.name}.`)
          }
        break;
        default:
          console.error("Unknown applet-view type", this.appletView);
          throw new Error(`Unknown applet-view type: ${(this.appletView as any).type}`);
      }
    }


    const doodle_bg =  html `
      <div style="flex-grow:1; position: absolute; top:0; left:0; width:100%; height:100%;">
        ${doodle_threads}
      </div>
    `;

    /** Import profile from We */
    let guardedView = view;
    const maybeMyProfile = this.threadsDvm.profilesZvm.getMyProfile();
    console.log("<community-feed-app> Profile", this._hasWeProfile, maybeMyProfile);
    if (this._hasWeProfile && !maybeMyProfile) {
      guardedView = html`
          ${doodle_bg}          
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; padding-bottom:10px; margin:auto; min-width:400px;">
          <h1 style="font-family:arial; color:#5804A8; z-index:1;"><img src="icon.png" width="32" height="32"
                                                              style="padding-left: 5px;padding-top: 5px;"/> Community Feed</h1>
          <div style="align-items: center; z-index:1;">
            <ui5-card id="profileCard">
              <ui5-card-header title-text=${msg('Import Profile into Feed')}></ui5-card-header>
              <vines-edit-profile
                  .profile=${this._weProfilesDvm?.profilesZvm.getMyProfile()}
                  @save-profile=${async (e: CustomEvent<ProfileMat>) => {
                    console.log("<community-feed-app> createMyProfile()", e.detail);
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
                    console.log("<community-feed-app> set locale", e.detail);
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
          overflow-x: clip; /* HACK */
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



