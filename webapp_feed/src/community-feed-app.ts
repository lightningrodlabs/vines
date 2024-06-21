import {css, html} from "lit";
import {customElement, state} from "lit/decorators.js";
import {ContextProvider} from "@lit/context";
import {PropertyValues} from "lit/development";
import {
  ActionHashB64,
  AdminWebsocket,
  AgentPubKeyB64,
  AppSignal,
  AppWebsocket,
  decodeHashFromBase64,
  encodeHashToBase64,
  InstalledAppId,
  ZomeName,
} from "@holochain/client";
import {AppletId, AppletView, CreatableName, Hrl, WAL, weaveUrlFromWal, WeaveServices} from "@lightningrodlabs/we-applet";
import {delay, DnaViewModel, DvmDef, HappElement, HCL, HvmDef, pascal,} from "@ddd-qc/lit-happ";
import {
  appProxyContext,
  cardStyleTemplate,
  determineSubjectName,
  doodle_threads,
  globaFilesContext,
  JumpDestinationType,
  JumpEvent,
  MAIN_TOPIC_HASH,
  materializeSubject,
  NotifySetting,
  onlineLoadedContext,
  ParticipationProtocol,
  Subject,
  THREADS_DEFAULT_COORDINATOR_ZOME_NAME,
  THREADS_DEFAULT_INTEGRITY_ZOME_NAME,
  ThreadsDvm,
  ThreadsEntryType,
  toasty,
  VINES_DEFAULT_ROLE_NAME,
  weaveUrlToWal,
  weClientContext,
  getMainThread, MAIN_SEMANTIC_TOPIC,
} from "@vines/elements";
import {setLocale} from "./localization";
import {localized, msg} from '@lit/localize';
import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"

import {AssetViewInfo, WeServicesEx} from "@ddd-qc/we-utils";
import {AppProxy, BaseRoleName, CloneId} from "@ddd-qc/cell-proxy";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FILES_DEFAULT_COORDINATOR_ZOME_NAME, FilesDvm} from "@ddd-qc/files";
import {DEFAULT_THREADS_DEF} from "./happDef";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";


import Button from "@ui5/webcomponents/dist/Button";

import "./community-feed-page"


/** */
@localized()
@customElement("community-feed-app")
export class CommunityFeedApp extends HappElement {

  @state() private _offlineLoaded = false;
  @state() private _onlineLoaded = false;
           private _onlineLoadedProvider?: any;
  @state() private _hasHolochainFailed = undefined;

  @state() private _hasWeProfile = false;
  @state() private _lang?: string

  static readonly HVM_DEF: HvmDef = DEFAULT_THREADS_DEF;

  @state() private _selectedPostAh: ActionHashB64 = '';


  /** -- We-applet specifics -- */

  private _weProfilesDvm?: ProfilesDvm;
  protected _weServices?: WeServicesEx;



  /** -- Ctor -- */

  /** All arguments should be provided when constructed explicity */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, private _canAuthorizeZfns?: boolean, readonly appId?: InstalledAppId, public appletView?: AppletView) {
    const adminUrl = _adminWs
      ? undefined
      : HC_ADMIN_PORT
        ? new URL(`ws://localhost:${HC_ADMIN_PORT}`)
        : undefined;
    //console.log("adminUrl", adminUrl);
    super(appWs? appWs : HC_APP_PORT, appId, adminUrl);
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
    weServices: WeaveServices,
    thisAppletId: AppletId,
    //showCommentThreadOnly?: boolean,
    appletView: AppletView,
  ) : Promise<CommunityFeedApp> {
    const app = new CommunityFeedApp(appWs, adminWs, canAuthorizeZfns, appId, appletView);
    /** Provide it as context */
    app._weServices = new WeServicesEx(weServices, thisAppletId);
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
    const profilesDef: DvmDef = {ctor: ProfilesDvm, baseRoleName: profilesBaseRoleName, isClonable: false};
    const cell_infos = Object.values(profilesAppInfo.cell_info);
    console.log("<community-feed-app> createProfilesDvm() cell_infos:", cell_infos);
    /** Create Profiles DVM */
    //const profilesZvmDef: ZvmDef = [ProfilesZvm, profilesZomeName];
    const dvm: DnaViewModel = new profilesDef.ctor(this, profilesProxy, new HCL(profilesAppId, profilesBaseRoleName, profilesCloneId));
    console.log("<community-feed-app> createProfilesDvm() dvm", dvm);
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
        console.log("<community-feed-app> Setting locale from We Profile", maybeLang);
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
    console.log("<community-feed-app>.handleSignal()")
    this.appProxy.onSignal(sig);
  }


  /** */
  async hvmConstructed() {
    console.log("<community-feed-app>.hvmConstructed()", this._adminWs, this._canAuthorizeZfns)
    /** Attempt EntryDefs (triggers genesis) */
    const threadsOk = await this.attemptThreadsEntryDefs(5, 1000);
    const filesOk = await this.attemptFilesEntryDefs(5, 1000);
    this._hasHolochainFailed = !threadsOk || !filesOk;
    /** Provide Files as context */
    console.log(`<community-feed-app>\t\tProviding context "${globaFilesContext}" | in host `, this);
    let _filesProvider = new ContextProvider(this, globaFilesContext, this.filesDvm);
  }


  async attemptThreadsEntryDefs(attempts: number, delayMs: number): Promise<boolean> {
    while(attempts > 0) {
      attempts -= 1;
      const allAppEntryTypes = await this.threadsDvm.fetchAllEntryDefs();
      if (allAppEntryTypes[THREADS_DEFAULT_COORDINATOR_ZOME_NAME].length == 0) {
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
      if (allAppEntryTypes[FILES_DEFAULT_COORDINATOR_ZOME_NAME].length == 0) {
        console.warn(`No entries found for ${FILES_DEFAULT_COORDINATOR_ZOME_NAME}`);
        await delay(delayMs);
      } else {
        return true;
      }
    }
    return false;
  }


  /** */
  async perspectiveInitializedOffline(): Promise<void> {
    console.log("<community-feed-app>.perspectiveInitializedOffline()");
    const maybeProfile = await this.threadsDvm.profilesZvm.probeProfile(this.filesDvm.cell.agentPubKey);
    console.log("<community-feed-app> perspectiveInitializedOffline() maybeProfile", maybeProfile, this.threadsDvm.cell.agentPubKey);
    /** Done */
    this.threadsDvm.dumpCallLogs();
    this._offlineLoaded = true;
  }


  /** */
  async perspectiveInitializedOnline(): Promise<void> {
    console.log("<community-feed-app>.perspectiveInitializedOnline() START", this.appletView);

    if (!this.appletView || (this.appletView && this.appletView.type == "main")) {
      await this.hvm.probeAll();
    }
    await this.networkInfoAll(); // FIXME: should propable store result in class field


    /** Make sure main topic and thread exists */
    this.threadsDvm.threadsZvm.storeSemanticTopic(MAIN_TOPIC_HASH, MAIN_SEMANTIC_TOPIC);
    this.threadsDvm.threadsZvm.pullSubjectThreads(MAIN_TOPIC_HASH);
    const mainThreads = this.threadsDvm.threadsZvm.perspective.threadsPerSubject[MAIN_TOPIC_HASH];
    console.log("<community-feed-app>.perspectiveInitializedOnline() threads", mainThreads);
    if (mainThreads && mainThreads.length > 0) {
      const mainThreadAh = getMainThread(this.threadsDvm);
      console.log("<community-feed-app>.perspectiveInitializedOnline() mainThreadAh", mainThreadAh);
      /** Make sure subscribe to notifications for main thread */
      await this.threadsDvm.threadsZvm.pullNotifSettings(mainThreadAh);
      const notif = this.threadsDvm.threadsZvm.getNotifSetting(mainThreadAh, this.threadsDvm.cell.agentPubKey);
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
  protected async updated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow parts CSS */
    const profileCard = this.shadowRoot.getElementById('profileCard') as HTMLElement;
    if (profileCard) {
      profileCard.shadowRoot.appendChild(cardStyleTemplate.content.cloneNode(true));
    }
  }


  /** */
  async onDumpNetworkLogs(e) {
    console.log("<community-feed-app>.onDumpNetworkLogs()")
    await this.networkInfoAll();
    this.dumpNetworkInfoLogs();
  }


  /** */
  async onJump(e: CustomEvent<JumpEvent>) {
    console.log("<community-feed-app>.onJump()", e.detail);
    if (e.detail.type == JumpDestinationType.Applet) {
      if (this._weServices) {
        this._weServices.openAppletMain(decodeHashFromBase64(e.detail.hash));
      }
    }
    if (e.detail.type == JumpDestinationType.Thread) {
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
    if (e.detail.type == JumpDestinationType.Bead) {
      /** Directly to post or get post from comment thread subject */
      const beadInfo = await this.threadsDvm.threadsZvm.getBeadInfo(e.detail.hash);
      if (beadInfo) {
        const [pp, _ts, _author] = await this.threadsDvm.threadsZvm.fetchPp(beadInfo.bead.ppAh);
        if (pp.subject_name == MAIN_SEMANTIC_TOPIC) {
          this._selectedPostAh = e.detail.hash;
        } else {
          this._selectedPostAh = pp.subject.hash;
        }
      } else {
        console.warn("JumpEvent failed. Bead not found", e.detail.hash);
      }
      this.requestUpdate();
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
        <div style="width: auto; height: auto; font-size: 3rem;">${msg("Failed to connect to Holochain Conductor and/or \"CommunityFeed\" cell.")};</div>
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
            <community-feed-page
                      .selectedPostAh=${this._selectedPostAh}
                      .networkInfoLogs=${this.appProxy.networkInfoLogs} 
                      @dumpNetworkLogs=${this.onDumpNetworkLogs}
                      @queryNetworkInfo=${(e) => this.networkInfoAll()}
            ></community-feed-page>`;
    if (this.appletView) {
      console.log("<community-feed-app> appletView", this.appletView);
      switch (this.appletView.type) {
        case "main":
          let _provider = new ContextProvider(this, appProxyContext, this.appProxy);
        break;
        case "block":
          throw new Error("Threads/we-applet: Block view is not implemented.");
        case "asset":
          const assetViewInfo = this.appletView as AssetViewInfo;
          if (!assetViewInfo.recordInfo) {
            throw new Error(`Feed/we-applet: Missing AssetViewInfo.recordInfo.`);
          }
          if (assetViewInfo.recordInfo.roleName != VINES_DEFAULT_ROLE_NAME) {
            throw new Error(`Feed/we-applet: Unknown role name '${this.appletView.recordInfo.roleName}'.`);
          }
          if (assetViewInfo.recordInfo.integrityZomeName != THREADS_DEFAULT_INTEGRITY_ZOME_NAME) {
            throw new Error(`Feed/we-applet: Unknown zome '${this.appletView.recordInfo.integrityZomeName}'.`);
          }
          const entryType = pascal(assetViewInfo.recordInfo.entryType);
          //console.log("pascal entryType", assetViewInfo.entryType, entryType);
          switch (entryType) {
            case ThreadsEntryType.ParticipationProtocol:
              const ppAh = encodeHashToBase64(assetViewInfo.wal.hrl[1]);
              //console.log("asset ppAh:", ppAh);
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
                        const hrlc = weaveUrlToWal(e.detail.wurl);
                        const attLocInfo = await this._weServices.assetInfo(hrlc);
                        const subject: Subject = {
                            hash: hrlc.hrl[1],
                            typeName: 'Asset',//attLocInfo.assetInfo.icon_src,
                            dnaHash: hrlc.hrl[0],
                            appletId: encodeHashToBase64(attLocInfo.appletHash),
                        }
                        const subject_name = determineSubjectName(materializeSubject(subject), this.threadsDvm.threadsZvm, this.filesDvm, this._weServices);
                        //console.log("@create event subject_name", subject_name);                        
                        const pp: ParticipationProtocol = {
                            purpose: e.detail.purpose,
                            rules: e.detail.rules,
                            subject,
                            subject_name,
                        };
                        const [_ts, ppAh] = await this.threadsDvm.threadsZvm.publishParticipationProtocol(pp);
                        const wal: WAL = {hrl: [decodeHashFromBase64(this.threadsDvm.cell.dnaHash), decodeHashFromBase64(ppAh)], context: encodeHashToBase64(pp.subject.hash)}
                        await creatableViewInfo.resolve(wal);
                      } catch(e) {
                          creatableViewInfo.reject(e)
                    }}}
                    @cancel=${(_e) => creatableViewInfo.cancel()}
                    @reject=${(e) => creatableViewInfo.reject(e.detail)}
            ></create-post-panel>`;
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
              <ui5-card-header title-text=${msg('Import Profile into CommunityFeed')}></ui5-card-header>
              <vines-edit-profile
                  .profile=${this._weProfilesDvm.profilesZvm.getMyProfile()}
                  @save-profile=${async (e: CustomEvent<ProfileMat>) => {
                    console.log("<community-feed-app> createMyProfile()", e.detail);
                    try {
                      await this.threadsDvm.profilesZvm.createMyProfile(e.detail);
                    } catch(e) {
                      console.warn("Failed creating my Profile", e);
                    }
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
  static get styles() {
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



