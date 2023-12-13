import {html, css} from "lit";
import { state, customElement } from "lit/decorators.js";
import {
  AdminWebsocket, AgentPubKeyB64,
  AppSignal,
  AppWebsocket, encodeHashToBase64,
  EntryHashB64,
  InstalledAppId,
  ZomeName,
} from "@holochain/client";
import {
  AppletId, AppletView,
  WeServices,
} from "@lightningrodlabs/we-applet";
import {
  HCL,
  HappElement,
  HvmDef,
  DvmDef,
  DnaViewModel, snake, pascal,
} from "@ddd-qc/lit-happ";
import {
  ThreadsDvm,
  THREADS_DEFAULT_ROLE_NAME,
  ThreadsEntryType,
  THREADS_DEFAULT_COORDINATOR_ZOME_NAME,
  THREADS_DEFAULT_INTEGRITY_ZOME_NAME,
  globaFilesContext,
  weClientContext,
  ChatThreadView, shellBarStyleTemplate, cardStyleTemplate,
} from "@threads/elements";
import {setLocale} from "./localization";
import { msg, localized } from '@lit/localize';

import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"
import {ContextProvider} from "@lit/context";
import {BaseRoleName, CloneId, AppProxy} from "@ddd-qc/cell-proxy";
import {EntryViewInfo} from "@ddd-qc/we-utils";
import {ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";
import {DEFAULT_THREADS_DEF} from "./happDef";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";

import "./threads-page"
import {PropertyValues} from "lit/development";


export interface ViewThreadContext {
  detail: string,
  subjectType: string,
  subjectName: string,
}


/**
 *
 */
@localized()
@customElement("threads-app")
export class ThreadsApp extends HappElement {

  @state() private _offlinePerspectiveloaded = false;
  @state() private _hasHolochainFailed = true;

  @state() private _hasWeProfile = false;
  @state() private _lang?: string

  @state() private _currentSpaceEh: null | EntryHashB64 = null;

  static readonly HVM_DEF: HvmDef = DEFAULT_THREADS_DEF;

  //@state() private _canShowBuildView = false;
  //@state() private _canShowDebug = false;


  /** All arguments should be provided when constructed explicity */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, private _canAuthorizeZfns?: boolean, readonly appId?: InstalledAppId, public appletView?: AppletView) {
    super(appWs? appWs : HC_APP_PORT, appId);
    if (_canAuthorizeZfns == undefined) {
      this._canAuthorizeZfns = true;
    }
  }


  /** -- We-applet specifics -- */

  protected _filesProvider?: unknown; // FIXME type: ContextProvider<this.getContext()> ?
  private _weProfilesDvm?: ProfilesDvm;
  protected _weProvider?: unknown; // FIXME type: ContextProvider<this.getContext()> ?
  public appletId?: EntryHashB64;

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
    console.log(`\t\tProviding context "${weClientContext}" | in host `, app);
    app._weProvider = new ContextProvider(app, weClientContext, weServices);
    app.appletId = thisAppletId;
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

    /** Probe EntryDefs */
    const allAppEntryTypes = await this.threadsDvm.fetchAllEntryDefs();
    console.log("happInitialized(), allAppEntryTypes", allAppEntryTypes);
    console.log(`${THREADS_DEFAULT_COORDINATOR_ZOME_NAME} entries`, allAppEntryTypes[THREADS_DEFAULT_COORDINATOR_ZOME_NAME]);
    if (allAppEntryTypes[THREADS_DEFAULT_COORDINATOR_ZOME_NAME].length == 0) {
      console.warn(`No entries found for ${THREADS_DEFAULT_COORDINATOR_ZOME_NAME}`);
    } else {
      this._hasHolochainFailed = false;
    }


    /** Provide Files as context */
    //const filesContext = this.filesDvm.getContext();
    console.log(`\t\tProviding context "${globaFilesContext}" | in host `, this);
    this._filesProvider = new ContextProvider(this, globaFilesContext, this.filesDvm);
  }


  /** */
  async perspectiveInitializedOffline(): Promise<void> {
    console.log("<threads-app>.perspectiveInitializedOffline()");
    /** Done */
    this._offlinePerspectiveloaded = true;
  }


  /** */
  async perspectiveInitializedOnline(): Promise<void> {
    console.log("<threads-app>.perspectiveInitializedOnline()", this.appletView);

    if (this.appletView && this.appletView.type == "main") {
      await this.hvm.probeAll();
    }
  }


  /** */
  shouldUpdate(): boolean {
    const canUpdate = super.shouldUpdate();
    console.log("<threads-app>.shouldUpdate()", canUpdate, this._offlinePerspectiveloaded);
    /** Wait for offlinePerspective */
    return canUpdate && this._offlinePerspectiveloaded;
  }


  /** */
  protected async updated(_changedProperties: PropertyValues) {
    /** Fiddle with shadow parts CSS */
    const profileCard = this.shadowRoot.getElementById('profileCard') as HTMLElement;
    if (profileCard) {
      profileCard.shadowRoot.appendChild(cardStyleTemplate.content.cloneNode(true));
    }
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
      return html`<div style="width: auto; height: auto; font-size: 4rem;">
        ${msg("Failed to connect to Holochain Conductor and/or <b>Threads</b> cell.")};
      </div>
      `;
    }


    //let view = html`<slot></slot>`;
    let view = html`<threads-page style="height:100vh;" .appletId=${this.appletId}</semantic-threads-page>`;

    if (this.appletView) {
      console.log("appletView", this.appletView);
      switch (this.appletView.type) {
        case "main":
          break;
        case "block":
          throw new Error("Threads/we-applet: Block view is not implemented.");
        case "entry":
          const entryViewInfo = this.appletView as EntryViewInfo;
          if (entryViewInfo.roleName != THREADS_DEFAULT_ROLE_NAME) {
            throw new Error(`Threads/we-applet: Unknown role name '${this.appletView.roleName}'.`);
          }
          if (entryViewInfo.integrityZomeName != THREADS_DEFAULT_INTEGRITY_ZOME_NAME) {
            throw new Error(`Threads/we-applet: Unknown zome '${this.appletView.integrityZomeName}'.`);
          }
          const entryType = pascal(entryViewInfo.entryType);
          console.log("pascal entryType", entryViewInfo.entryType, entryType);
          switch (entryType) {
            case ThreadsEntryType.ParticipationProtocol:
              console.log("pp entry:", encodeHashToBase64(entryViewInfo.hrl[1]));
              const viewContext = entryViewInfo.context as ViewThreadContext;
              view = html`
                  <comment-thread-view .threadHash=${encodeHashToBase64(entryViewInfo.hrl[1])} showInput="true"
                                       .subjectName=${viewContext.subjectName}
                                       .subjectType=${viewContext.subjectType}></comment-thread-view>
              `;
              break;
            default:
              throw new Error(`Unhandled entry type ${entryViewInfo.entryType}.`);
          }
          break;
        default:
          console.error("Unknown We applet-view type", this.appletView);
          throw new Error(`Unknown We applet-view type`);
      }
    }


    /** Import profile from We */
    let guardedView = view;
    const maybeMyProfile = this.threadsDvm.profilesZvm.getMyProfile();
    console.log("<files-app> Profile", this._hasWeProfile, maybeMyProfile);
    if (this._hasWeProfile && !maybeMyProfile) {
      guardedView = html`
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; padding-bottom: 10px;margin:auto: min-width:400px;">
          <h1 style="font-family: arial;color: #5804A8;"><img src="assets/icon.png" width="32" height="32"
                                                              style="padding-left: 5px;padding-top: 5px;"/> Threads</h1>
          <div style="align-items: center;">
            <ui5-card id="profileCard">
              <ui5-card-header title-text=${msg('Import Profile into Threads applet')}></ui5-card-header>
              <threads-edit-profile
                  .profile=${this._weProfilesDvm.profilesZvm.getMyProfile()}
                  @lang-selected=${(e: CustomEvent) => {
                    console.log("set locale", e.detail);
                    setLocale(e.detail)
                  }}
                  @save-profile=${async (e: CustomEvent<ProfileMat>) => {
                    console.log("createMyProfile()", e.detail);
                    await this.threadsDvm.profilesZvm.createMyProfile(e.detail);
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



