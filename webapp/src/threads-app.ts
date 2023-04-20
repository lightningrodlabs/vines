import {html, css} from "lit";
import { state } from "lit/decorators.js";
import {localized, msg} from '@lit/localize';
import {Button, CircularProgress, Dialog} from "@scoped-elements/material-web";
import {AdminWebsocket, AppSignal, AppWebsocket, EntryHashB64, InstalledAppId, RoleName} from "@holochain/client";
import {CellContext, delay, HCL, CellsForRole, HappElement, HvmDef} from "@ddd-qc/lit-happ";
import {
  DEFAULT_THREADS_DEF, SemanticTopicList, ThreadsDevtestPage
} from "@threads/elements";
import {ThreadsProfile} from "@threads/elements/dist/viewModels/profiles.proxy";

import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"
import {ThreadsDvm} from "@threads/elements/dist/viewModels/threads.dvm";
//import {SlCard} from "@scoped-elements/shoelace";


/**
 *
 */
@localized()
export class ThreadsApp extends HappElement {

  @state() private _loaded = false;


  @state() private _canLudotheque = false;
  @state() private _hasStartingProfile = false;
  @state() private _lang?: string

  @state() private _currentSpaceEh: null | EntryHashB64 = null;

  static readonly HVM_DEF: HvmDef = DEFAULT_THREADS_DEF;

  private _currentPlaysetEh: null | EntryHashB64 = null;

  @state() private _ludoRoleCells!: CellsForRole;
  @state() private _curLudoCloneId?: RoleName; // = LudothequeDvm.DEFAULT_BASE_ROLE_NAME;


  @state() private _canShowBuildView = false;



  /** */
  constructor(appWs?: AppWebsocket, private _adminWs?: AdminWebsocket, appId?: InstalledAppId) {
    super(appWs? appWs : HC_APP_PORT, appId);
  }


  /** -- Getters -- */

  get threadsDvm(): ThreadsDvm { return this.hvm.getDvm(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)! as ThreadsDvm }

  get importingDialogElem() : Dialog {
    return this.shadowRoot!.getElementById("importing-dialog") as Dialog;
  }

  /** -- Methods -- */

  /** */
  handleSignal(sig: AppSignal) {
    this.conductorAppProxy.onSignal(sig);
  }


  /** */
  async hvmConstructed() {
    console.log("hvmConstructed()")
    /** Authorize all zome calls */
    if (!this._adminWs) {
      this._adminWs = await AdminWebsocket.connect(`ws://localhost:${HC_ADMIN_PORT}`);
    }
    if (this._adminWs) {
      await this.hvm.authorizeAllZomeCalls(this._adminWs);
      console.log("*** Zome call authorization complete");
    } else {
      console.warn("No adminWebsocket provided (Zome call authorization done)")
    }

    /** Grab ludo cells */
    this._ludoRoleCells = await this.conductorAppProxy.fetchCells(DEFAULT_THREADS_DEF.id, ThreadsDvm.DEFAULT_BASE_ROLE_NAME);

  }


  /** */
  //async perspectiveInitializedOffline(): Promise<void> {}


  /** */
  async perspectiveInitializedOnline(): Promise<void> {
    console.log("<app>.perspectiveInitializedOnline()");
    /** Load My profile */
    const maybeMyProfile = this.threadsDvm.profilesZvm.perspective.profiles[this.threadsDvm.cell.agentPubKey]
    console.log("<app>.perspectiveInitializedOnline() maybeMyProfile", maybeMyProfile);
    if (maybeMyProfile) {
      const maybeLang = maybeMyProfile.fields['lang'];
      if (maybeLang) {
        //setLocale(maybeLang);
      }
      this._hasStartingProfile = true;
    }

    await this.hvm.probeAll();

    /** Done */
    this._loaded = true;
  }


  /** */
  async createMyProfile(profile: ThreadsProfile) {
    //console.log("onNewProfile()", profile)
    await this.threadsDvm.profilesZvm.createMyProfile(profile);
    this._hasStartingProfile = true;
  }


  /** */
  async onShowLudo(cloneId: RoleName | null) {
    if (cloneId) {
      this._curLudoCloneId = cloneId;
    } else {
      this._curLudoCloneId = undefined;
    }
    //this._whereInventory = await this.whereDvm.playsetZvm.probeInventory();
    this._canLudotheque = true;
  }


  /** */
  render() {
    console.log("*** <threads-app> render()", this._hasStartingProfile, this.threadsDvm.cell)
    if (!this._loaded) {
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


    /** Render all */
    return html`
        <button @click="${() => {
          console.log("dumpLogs"); 
          //const el = this.shadowRoot.getElementById("test") as ThreadsTestPage; 
          //el.requestUpdate();
            this.threadsDvm.dumpLogs();
        }}">dumpLogs</button>
        <cell-context .cell="${this.threadsDvm.cell}">
            <threads-test-page id="test"></threads-test-page>
            <!-- <semantic-topic-list></semantic-topic-list> -->
        </cell-context>
    `;
  }


  /** */
  static get scopedElements() {
    return {
      "threads-test-page": ThreadsDevtestPage,
      "semantic-topic-list": SemanticTopicList,
      "cell-context": CellContext,
    }
  }


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



