import {html, css, ReactiveElement} from "lit";
import { state, customElement } from "lit/decorators.js";
import {localized, msg} from '@lit/localize';
import {
  ActionHashB64,
  AdminWebsocket,
  AppSignal,
  AppWebsocket, encodeHashToBase64, Entry, EntryHash,
  EntryHashB64,
  InstalledAppId,
  RoleName, ZomeName
} from "@holochain/client";
import {
  Hrl,
  WeServices, weServicesContext,
} from "@lightningrodlabs/we-applet";
import {
  HCL,
  CellsForRole,
  HappElement,
  HvmDef,
  DvmDef,
  DnaViewModel, Cell,
} from "@ddd-qc/lit-happ";
import {
  DEFAULT_THREADS_DEF, globalProfilesContext,
} from "@threads/elements";

import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"
import {ThreadsDvm} from "@threads/elements/dist/viewModels/threads.dvm";
import {ProfilesDvm} from "@threads/elements/dist/viewModels/profiles.dvm";
import {consume, ContextProvider} from "@lit-labs/context";
import {BaseRoleName, CloneId} from "@ddd-qc/cell-proxy/dist/types";
import {AppProxy} from "@ddd-qc/cell-proxy/dist/AppProxy";


/**
 *
 */
@localized()
@customElement("threads-app")
export class ThreadsApp extends HappElement {

  @state() private _offlinePerspectiveloaded = false;


  @state() private _hasStartingProfile = false;
  @state() private _lang?: string

  @state() private _currentSpaceEh: null | EntryHashB64 = null;

  static readonly HVM_DEF: HvmDef = DEFAULT_THREADS_DEF;

  @state() private _canShowBuildView = false;
  @state() private _canShowDebug = false;


  /** All arguments should be provided when constructed explicity */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, private _canAuthorizeZfns?: boolean, readonly appId?: InstalledAppId, public showCommentThreadOnly?: ActionHashB64) {
    super(appWs? appWs : HC_APP_PORT, appId);
    if (_canAuthorizeZfns == undefined) {
      this._canAuthorizeZfns = true;
    }
    // if (showCommentThreadOnly == undefined) {
    //   this.showCommentThreadOnly = true;
    // }
  }


  /** -- We-applet specifics -- */

  private _profilesDvm?: ProfilesDvm;
  protected _profilesProvider?: unknown; // FIXME type: ContextProvider<this.getContext()> ?
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
    thisAppletId: EntryHash,
    showCommentThreadOnly?: ActionHashB64,
  ) : Promise<ThreadsApp> {
    const app = new ThreadsApp(appWs, adminWs, canAuthorizeZfns, appId, showCommentThreadOnly);
    /** Provide it as context */
    console.log(`\t\tProviding context "${weServicesContext}" | in host `, app);
    app._weProvider = new ContextProvider(app, weServicesContext, weServices);
    app.appletId = encodeHashToBase64(thisAppletId);
    /** Create Profiles Dvm from provided AppProxy */
    console.log("<thread-app>.ctor()", profilesProxy);
    await app.createProfilesDvm(profilesProxy, profilesAppId, profilesBaseRoleName, profilesCloneId, profilesZomeName);
    return app;
  }


  /** Create a Profiles DVM out of a different happ */
  async createProfilesDvm(profilesProxy: AppProxy, profilesAppId: InstalledAppId, profilesBaseRoleName: BaseRoleName,
                          profilesCloneId: CloneId | undefined,
                          profilesZomeName: ZomeName): Promise<void> {
    const profilesAppInfo = await profilesProxy.appInfo({installed_app_id: profilesAppId});
    const profilesDef: DvmDef = {ctor: ProfilesDvm, baseRoleName: profilesBaseRoleName, isClonable: false};
    const cell_infos = Object.values(profilesAppInfo.cell_info);
    console.log("createProfilesDvm() cell_infos:", cell_infos);
    /** Create Profiles DVM */
    //const profilesZvmDef: ZvmDef = [ProfilesZvm, profilesZomeName];
    const dvm: DnaViewModel = new profilesDef.ctor(this, profilesProxy, new HCL(profilesAppId, profilesBaseRoleName, profilesCloneId));
    console.log("createProfilesDvm() dvm", dvm);
    this._profilesDvm = dvm as ProfilesDvm;
    /** Load My profile */
    const maybeMyProfile = await this._profilesDvm.profilesZvm.probeProfile(encodeHashToBase64(profilesAppInfo.agent_pub_key));
    if (maybeMyProfile) {
      const maybeLang = maybeMyProfile.fields['lang'];
      if (maybeLang) {
        //setLocale(maybeLang);
      }
      this._hasStartingProfile = true;
    }
    /** Provide it as context */
    console.log(`\t\tProviding context "${globalProfilesContext}" | in host `, this);
    this._profilesProvider = new ContextProvider(this, globalProfilesContext, this._profilesDvm.profilesZvm);
  }


  /** -- Getters -- */

  get threadsDvm(): ThreadsDvm { return this.hvm.getDvm(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)! as ThreadsDvm }


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
      this._adminWs = await AdminWebsocket.connect(`ws://localhost:${HC_ADMIN_PORT}`);
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
    /** Grab ludo cells */
    const entryDefs = await this.threadsDvm.fetchAllEntryDefs();
    console.log("threads.entryDefs", entryDefs);
  }


  /** */
  async perspectiveInitializedOffline(): Promise<void> {
    console.log("<threads-app>.perspectiveInitializedOffline()");
    /** Done */
    this._offlinePerspectiveloaded = true;
  }


  /** */
  async perspectiveInitializedOnline(): Promise<void> {
    console.log("<threads-app>.perspectiveInitializedOnline()");

    await this.hvm.probeAll();

    /** Done */
    //this._loaded = true;
  }


  /** */
  shouldUpdate(): boolean {
    const canUpdate = super.shouldUpdate();
    console.log("<threads-app>.shouldUpdate()", canUpdate, this._offlinePerspectiveloaded);

    /** Wait for offlinePerspective */
    return canUpdate && this._offlinePerspectiveloaded;
  }


  // /** */
  // async createMyProfile(profile: ThreadsProfile) {
  //   //console.log("onNewProfile()", profile)
  //   await this.threadsDvm.profilesZvm.createMyProfile(profile);
  //   this._hasStartingProfile = true;
  // }



  /** */
  render() {
    console.log("*** <threads-app> render()", this._hasStartingProfile, this.threadsDvm.cell.print())
    if (!this._offlinePerspectiveloaded) {
      return html`        
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh">
        <span>Loading...</span>
      </div>
      `;
    }


    // const threadTestPage = html`
    //     <cell-context .cell="${this.threadsDvm.cell}">
    //         <threads-test-page></threads-test-page>
    //     </cell-context>
    // `;


    // const createProfile = html `
    //     <div class="column"
    //          style="align-items: center; justify-content: center; flex: 1; padding-bottom: 10px;"
    //     >
    //       <h1 style="font-family: arial;color: #5804A8;"><img src="logo.svg" width="32" height="32" style="padding-left: 5px;padding-top: 5px;"/> Threads</h1>
    //       <div class="column" style="align-items: center;">
    //         <sl-card style="box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;">
    //             <div class="title" style="margin-bottom: 24px; align-self: flex-start">
    //               ${msg('Create Profile')}
    //             </div>
    //               <edit-profile
    //                       .saveProfileLabel=${msg('Create Profile')}
    //                       @save-profile=${(e: CustomEvent) => this.createMyProfile(e.detail.profile)}
    //                       @lang-selected=${(e: CustomEvent) => {console.log("<app> set lang", e.detail); /*setLocale(e.detail)*/}}
    //               ></edit-profile>
    //         </sl-card>
    //         </div>
    //     </div>`;

    //const guardedPage = threadTestPage //this._hasStartingProfile? threadTestPage : createProfile;

    //const cells = this.conductorAppProxy.getAppCells(this.conductorAppProxy.appIdOfShame);


    //let inner = html`<slot></slot>`;
    let inner = html`
        <comment-thread-view .threadHash=${this.showCommentThreadOnly} showInput="true"></comment-thread-view>
    `;


    if (!this.showCommentThreadOnly) {
      if (this._canShowDebug) {
        inner = html`            
            <threads-devtest-page id="test" 
              @debug=${(e) => this._canShowDebug = e.detail}>
            </threads-devtest-page>
        `;
      } else {
        inner = html`            
            <semantic-threads-page style="height:100vh;"
              .appletId=${this.appletId}
              @debug=${(e) => this._canShowDebug = e.detail}>
            </semantic-threads-page>
        `;
      }
    }

    /** Dump button */
    //   <button @click="${() => {
    //   console.log("dumpLogs");
    //   //const el = this.shadowRoot.getElementById("test") as ThreadsTestPage;
    //   //el.requestUpdate();
    //   this.threadsDvm.dumpLogs();
    // }}">dumpLogs</button>


    /** Render all */
    return html`
        <cell-context .cell="${this.threadsDvm.cell}">
          ${inner}
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
          /*height: 100vh;*/
          width: 100%;
        }

        .column {
          display: flex;
          flex-direction: column;
        }

        .title {
          font-size: 20px;
        }

      `,

    ];
  }
}



