import {html, css, ReactiveElement} from "lit";
import { state, customElement } from "lit/decorators.js";
import {localized, msg} from '@lit/localize';
import {
  AdminWebsocket,
  AppAgentClient, AppAgentWebsocket, AppInfo,
  AppSignal,
  AppWebsocket, CellInfo, encodeHashToBase64,
  EntryHashB64,
  InstalledAppId,
  RoleName, ZomeName
} from "@holochain/client";
import {
  Profile,
  ProfilesClient,
  ProfilesStore,
  profilesStoreContext
} from '@holochain-open-dev/profiles';
import {
  Hrl,
  WeServices,
} from "@lightningrodlabs/we-applet";
import {
  HCL,
  CellsForRole,
  HappElement,
  HvmDef,
  DvmDef,
  DnaViewModel, Cell, ZvmDef, delay
} from "@ddd-qc/lit-happ";
import {
  DEFAULT_THREADS_DEF, globalProfilesContext, ProfilesZvm,
} from "@threads/elements";

import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"
import {ThreadsDvm} from "@threads/elements/dist/viewModels/threads.dvm";
import {ProfilesDvm} from "@threads/elements/dist/viewModels/profiles.dvm";
import {ContextProvider} from "@lit-labs/context";
import {BaseRoleName} from "@ddd-qc/cell-proxy/dist/types";
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

  private _currentPlaysetEh: null | EntryHashB64 = null;

  @state() private _ludoRoleCells!: CellsForRole;
  @state() private _curLudoCloneId?: RoleName; // = LudothequeDvm.DEFAULT_BASE_ROLE_NAME;


  @state() private _canShowBuildView = false;


  @state() private _canShowDebug = false;


  /** All arguments should be provided when constructed explicity */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, private _canAuthorizeZfns?: boolean, readonly appId?: InstalledAppId) {
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
    profilesZomeName: ZomeName,
    profilesProxy: AppProxy,
    weServices: WeServices
  ) : Promise<ThreadsApp> {

    const app = new ThreadsApp(appWs, adminWs, canAuthorizeZfns, appId);

    /** Create Profiles Dvm out of profilesAppInfo */
    console.log("<thread-app>.ctor()", profilesProxy);
    await app.createProfilesDvm(profilesProxy, profilesAppId, profilesBaseRoleName, profilesZomeName);
    return app;
  }


  /** -- Provide a Profiles DVM from a different happ -- */

  /** */
  async createProfilesDvm(profilesProxy: AppProxy, profilesAppId: InstalledAppId, profilesBaseRoleName: BaseRoleName, profilesZomeName: ZomeName): Promise<void> {
    const profilesAppInfo = await profilesProxy.appInfo({installed_app_id: profilesAppId});
    const profilesDef: DvmDef = {ctor: ProfilesDvm, baseRoleName: profilesBaseRoleName, isClonable: false};
    const cell_infos = Object.values(profilesAppInfo.cell_info);
    console.log("createProfilesDvm() cell_infos", cell_infos);
    /** Create Profiles "Cell" */
    this._profilesCell = Cell.from(cell_infos[0][0], profilesAppInfo.installed_app_id, profilesBaseRoleName); // assuming a single provisioned profiles cell and no clones
    /** Create Profiles DVM */
    //const profilesZvmDef: ZvmDef = [ProfilesZvm, profilesZomeName];
    const dvm: DnaViewModel = new profilesDef.ctor(this, profilesProxy, new HCL(profilesAppId, profilesBaseRoleName));
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
    this.provideProfilesContext(this);
  }


  private _profilesCell?: Cell;
  private _profilesDvm?: ProfilesDvm;
  protected _provider?: unknown; // FIXME type: ContextProvider<this.getContext()> ?


  // /** */
  // get profilesCellName(): string {
  //   if (!this._profilesCell) {
  //     return "error: profiles cell not found";
  //   }
  //   return this._profilesCell.name;
  // }


  /** Set ContextProvider for host */
  provideProfilesContext(providerHost: ReactiveElement): void {
    console.log(`\t\tProviding context "${globalProfilesContext}" | in host `, providerHost);
    this._provider = new ContextProvider(providerHost, globalProfilesContext, this._profilesDvm.profilesZvm);
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
    this._ludoRoleCells = await this.appProxy.fetchCells(DEFAULT_THREADS_DEF.id, ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
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


    /** Render all */
    return html`
        <cell-context .cell="${this.threadsDvm.cell}">
            <!--
                    <button @click="${() => {
                console.log("dumpLogs");
                //const el = this.shadowRoot.getElementById("test") as ThreadsTestPage; 
                //el.requestUpdate();
                this.threadsDvm.dumpLogs();
            }}">dumpLogs</button> 
                    -->
            <threads-devtest-page id="test" style="display:${this._canShowDebug? "block" : "none" };"
                                  @debug=${(e) => this._canShowDebug = e.detail}>
            </threads-devtest-page> 
            <semantic-threads-page style="display:${!this._canShowDebug? "block" : "none" };"
                                   @debug=${(e) => this._canShowDebug = e.detail}>
            </semantic-threads-page>
        </cell-context>
    `;
  }


  // /** */
  // static get scopedElements() {
  //   return {
  //     "threads-devtest-page": ThreadsDevtestPage,
  //     "semantic-threads-page": SemanticThreadsPage,
  //     "cell-context": CellContext,
  //   }
  // }


  /** */
  static get styles() {
    return [
      css`
        :host {
          background: #f7f6f8;
          display: block;
          height: 100vh;
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



