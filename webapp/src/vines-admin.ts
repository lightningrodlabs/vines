import {html, css, LitElement, TemplateResult} from "lit";
import {state, customElement} from "lit/decorators.js";
import {msg, localized} from '@lit/localize';
import {
    AdminWebsocket, AppInfo, ProvisionedCell,
} from "@holochain/client";
import {setLocale} from "./localization";
import {DnaId, HAPP_BUILD_MODE, HappBuildModeType} from "@ddd-qc/lit-happ";
import {HC_ADMIN_PORT, HC_APP_PORT} from "./globals"
import * as APPV from './generated/version.js';
import { invoke } from '@tauri-apps/api/core';
import Switch from "@ui5/webcomponents/dist/Switch";
import QRCode from "qrcode";
import {decodeDnaJoiningInfo, DnaJoiningInfo, encodeDnaJoiningInfo} from "@ddd-qc/cell-proxy/dist/dnaJoiningInfo";
import {decodeQrCodeString, isJoiningCode, DNA_FROM_URL} from "./qr-scanner";

console.log("<vines-admin>", APPV.APP_VERSION);

/** */
@localized()
@customElement("vines-admin")
export class VinesAdmin extends LitElement {

  @state() private _adminWs?: AdminWebsocket;
  @state() private _apps?: Array<AppInfo>;

  @state() private _inviteLink: string = '';
  @state() private _name: string = '';

  @state() private _loading: string | undefined = ""; // Display loading string if this is defined

  @state() private _showAddGroup: boolean = false;
  @state() private _showGroupInvite: AppInfo | undefined = undefined; // Display if this is defined
  @state() private _showScanner: boolean = false;

  constructor() {
    console.debug("<vines-admin>.ctor()", APPV.APP_VERSION, HC_APP_PORT, HC_ADMIN_PORT);
    super();
    const adminUrl = HC_ADMIN_PORT? new URL(`ws://localhost:${HC_ADMIN_PORT}`) : undefined;
    AdminWebsocket.connect({url: adminUrl}).then(async (ws) => {
        this._adminWs = ws;
        this._apps = await this._adminWs.listApps({});
        console.log("Installed apps:", this._apps);
    });
  }


  /** Handle global events */
  override connectedCallback() {
    super.connectedCallback();
    // @ts-ignore
    this.addEventListener('lang-selected', this.onLang);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // @ts-ignore
    this.removeEventListener('lang-selected', this.onLang);
  }


  /** -- Methods -- */

  /** Open Vines App if jump requested from a non-main view */
  async onLang(e: CustomEvent) {
    console.log("set locale", e.detail);
    return setLocale(e.detail);
  }

  /** */
  private onReload() {
    window.location.reload();
  }


    override async firstUpdated() {
      console.debug("<vines-admin>.firstUpdated()")
        // // Initialize camera system
        // await invoke('plugin:crabcamera|initialize_camera_system');
        // // Get available cameras
        // const cameras = await invoke('plugin:crabcamera|get_available_cameras');
        // console.log('Available cameras:', cameras);
        // // Get recommended format for high quality
        // const format = await invoke('plugin:crabcamera|get_recommended_format');
        // console.log('Available formats:', format);
    }

  /** */
  renderGroupInvite(): TemplateResult<1> {
      const appInfo = this._showGroupInvite!;
      const cell: ProvisionedCell = appInfo.cell_info["rVines"]![0]!.value as ProvisionedCell;
      const shareCode = encodeDnaJoiningInfo(cell.cell_id[0], appInfo.installed_app_id, cell.dna_modifiers.network_seed);
      const popover = this.shadowRoot!.getElementById('popover');
      let existingImg = null;
      if (popover) { existingImg = popover.querySelector('img')}
      console.debug("renderQrCode()", existingImg, popover);
      if (!existingImg) {
          try {
              console.debug("Generating QR code for:", shareCode);
              QRCode.toDataURL(shareCode).then(generateQR => {
              console.debug("Generated QR code");
              const img = document.createElement('img');
              img.src = generateQR;
              img.style.width = '100%';
              const popover2 = this.shadowRoot!.getElementById('popover');
              if (popover2) { popover2.append(img); this.requestUpdate();}
              });
          } catch (err) {
              console.error(err);
          }
      }

      return html`
          <div class="column center-content flex-1 launch-bg" style="margin-left:5px; margin-right:5px;">
              <div class="column items-center" style="margin-bottom: 15px;">
                  <div style="margin-bottom:8px; margin-top:14px;">
                      <img src="icon.png" style="height: 64px"/>
                  </div>
                  <div class="dialog-title">${this._showGroupInvite?.installed_app_id}</div>
              </div>
              <h3 style="margin:0px;margin-bottom:10px;">${msg('Invite code')}</h3>
              <div id="popover"></div>
              <ui5-textarea .value=${shareCode} style="height:80px; width: 90%;"></ui5-textarea>
              <button id="cancel-btn"
                      class="moss-button"
                      style="width: 120px; margin-top: 15px;"
                      @click=${() => this._showGroupInvite = undefined}
              >
                  <div class="row center-content">
                      <ui5-icon name="nav-back" style="margin-right:10px;"></ui5-icon>
                      <div>${msg('Back')}</div>
                  </div>
              </button>              
          </div>
      `;
  }

  /** */
  renderAddGroup(greet: boolean): TemplateResult<1> {
      let inviteGroup: DnaJoiningInfo | undefined = undefined;
      if (this._inviteLink) {
          try {
              const maybe = decodeQrCodeString(this._inviteLink);
              console.debug("maybe: " + JSON.stringify(maybe));
              if (isJoiningCode(maybe)) {
                  if (new DnaId(maybe.originalDnaHash).b64 == DNA_FROM_URL) {
                    // FIXME: Check if group already joined
                    inviteGroup = maybe as DnaJoiningInfo;
                  }
              } else {
                  console.debug("maybe: NOPE");
              }
          } catch (e) {
              console.debug("BAD INVITE LINK: " + JSON.stringify(e));
          }
      }
      console.debug("inviteGroup: " + JSON.stringify(inviteGroup));
      return html`
            <div class="column center-content flex-1 launch-bg" style="margin-left:5px; margin-right:5px;">
                <div class="column items-center" style="margin-bottom: 15px;">
                    <div style="margin-bottom:8px; margin-top:14px;"><img src="icon.png" style="height: 64px"/></div>
                    ${greet? html`
                        <div class="dialog-title">${msg('Welcome to Vines.')}</div>
                        <div class="dialog-title">${msg('What brought you here today?')}</div>
                    ` : html`
                        <button id="cancel-btn"
                                class="moss-button"
                                style="width: 120px;"
                                @click=${() => this._showAddGroup = false}
                        >
                            <div class="row center-content">
                                <ui5-icon name="nav-back"></ui5-icon>
                                <div style="margin-left: 10px;">${msg('Back')}</div>
                            </div>
                        </button>
                    `}
                </div>

                <div class="column" style="max-width: 100%;">
                    <div class="moss-card column items-center" style="margin: 6px;">
                        <div class="dialog-title" style="margin-bottom: 2px; margin-top: 2px;">
                            ${msg('I have an invite link to join a group')}
                        </div>
                        <div class="column center-content hint" style="margin-bottom: 12px; max-width:100%;">
                            <div style="margin-bottom:3px;">${msg('An invite link looks like:')}</div>
                            <div style="background: rgba(230,246,215,0.58); padding:3px;text-overflow: ellipsis;overflow: clip;max-width: 100%;">
                                g69vcmlnaW5hbERuYUhhc2jEJ4QtJEUWYfwZRyGSlKexuB/xOV02DsJ+RON4IFANf+C7cdRx0a5/GaRu
                            </div>
                        </div>

                        <div class="row items-center justify-center" style="margin-bottom: 2px; margin-top:1px;">
                            ${inviteGroup? html`                           
                            <button
                                    id="invited-group-btn"
                                    class="group-button"
                                    @click=${() => this._inviteLink = ''}
                                    style=""
                            >
                            ${inviteGroup.name}
                            ${closeIcon(30)}                                
                            </button>
                            <button
                                    id="join-group-btn"
                                    class="moss-button"
                                    @click=${() => {
                                        this._loading = msg('Joining space...');
                                        this.onJoinGroup().then(() => this._loading = undefined);
                                    }}
                                    style="width: 30px; margin-left:10px;"
                            >${msg('Join')}
                            </button>
                            ` : html`
                            <sl-input
                                    class="moss-input"
                                    id="invite-link-input"
                                    placeholder=${msg('paste invite link here')}
                                    label=${msg('invite link')}
                                    style="margin-right: 1px;"
                                    @change=${() => {this.requestUpdate()}}
                                    @input=${() => {
                                          const inviteLinkInput = this.shadowRoot?.getElementById(
                                              'invite-link-input',
                                          ) as HTMLInputElement;
                                          this._inviteLink = inviteLinkInput.value;
                                      }}
                            ></sl-input>
                            <div style="margin-left:10px;">${msg('or')}</div>
                            <button
                                    id="scan-btn"
                                    class="moss-button"
                                    @click=${() => this._showScanner = true}
                                    style="margin-left:10px; display:inline-flex; align-items:center; justify-content:center;"
                            >
                            <ui5-icon name="qr-code" style="margin-right:10px;"></ui5-icon>
                            ${msg('Scan')}
                            </button>

                            `
                            }
                        </div>
                        ${this._inviteLink != '' && !inviteGroup? html`<div class="error" style="margin-bottom:0px;">${msg("INVALID INVITE LINK")}</div>` : html``}
                    </div>

                    <div class="moss-card column items-center" style="margin:6px;">
                        <div class="dialog-title" style="margin-top:2px;">
                            ${msg('I want to start a space for my group')}
                        </div>
                        <span class="flex flex-1"></span>
                        <sl-input
                                class="moss-input"
                                id="name-input"
                                placeholder=${msg('enter space name')}
                                label=${msg('Space name')}
                                style="margin-top: 10px; margin-bottom: 10px; width: 80%;"
                                @input=${() => {
                                      const inviteLinkInput = this.shadowRoot?.getElementById('name-input',
                                      ) as HTMLInputElement;
                                      this._name = inviteLinkInput.value;
                                  }}
                        ></sl-input>
                        <button
                                class="moss-button"
                                style="margin-bottom: 2px;"
                                ?disabled=${this._name === ''}
                                @click=${() => {
                                    this._loading = "Creating new group space...";
                                    this.createNewGroup(this._name).then(() => this._loading = undefined);
                                }}
                        >
                            <div class="row center-content">
                                ${plusCircleIcon(30)}
                                <div style="margin-left: 10px;">${msg('Create new group space')}</div>
                            </div>
                        </button>
                    </div>                     
                </div>
        `;
  }


  /** */
  override render() {
    console.log("<vines-admin>.render()", this._apps);
    /** Check init has been done */
    if (this._apps == undefined || !!this._loading) {
      return html`
          <div class="centered">
              <ui5-busy-indicator delay="0" size="Large" active
                                  style="color:#9e9c65"
              ></ui5-busy-indicator>
              <div style="font-size: 18px; color: #131312;">${this._loading}</div>
              ${HAPP_BUILD_MODE != HappBuildModeType.Retail ? html`
                  <button id="retryBtn"
                          style="max-width:300px"
                          @click=${(_e: any) => this.onReload()}>
                      ${msg('Reload')}
                  </button>
              ` : html``}
          </div>
      `;
    }

      if (this._showScanner) {
          return html`
            <qr-scanner 
                    @quit=${() => {
                        console.debug("STOP SCANNER RECEIVED");
                        this._showScanner = false;
                    }}
                    @scan=${(e: CustomEvent<string>) => {
                        console.debug("QR SCAN FTW:" + e.detail);
                        this._showScanner = false;
                        this._inviteLink = e.detail;
                    }}
            >
            </qr-scanner>`;
      }
    if (this._apps!.length == 0) {
      return this.renderAddGroup(true);
    }
    if (this._showAddGroup) {
      return this.renderAddGroup(false);
    }
    if (this._showGroupInvite) {
      return this.renderGroupInvite();
    }

    let apps  = [html``];
        this._apps.forEach(app => {
            const elem = html`
                <div class="app-card row items-center"
                     @click=${() => {
                         this._loading = msg("Launching...");
                         this.onSelectApp(app.installed_app_id)
                                 .then(() => this._loading = undefined)
                     }}>
                    <ui5-button icon="share-2" design="Transparent" 
                                style="border-radius: 10px;"
                                @click=${(e:any) => {
                                    e.stopPropagation();
                                    this._showGroupInvite = app
                                }}
                    ></ui5-button>
                    <div class="app-name">${app.installed_app_id}</div>
                    <span class="flex flex-1"></span>
                    <ui5-switch id="toggle-${app.installed_app_id}" ?checked=${app.status.type == "enabled"}
                                @change=${() =>  {
                                    const elem = this.shadowRoot!.getElementById("toggle-"+app.installed_app_id) as Switch;
                                    this.onToggleApp(app, elem!.checked)}}
                                @click=${(e:any) => e.stopPropagation()}
                    ></ui5-switch>
                </div>
            `;
            apps.push(elem);
        })
    /** Render all */
    return html`
        <div class="column center-content flex-1 launch-bg">
            
            <div class="column items-center" style="margin-bottom: 12px;">
                <div style="margin-bottom:4px; margin-top:14px;"><img src="icon.png" style="height: 64px"/></div>
                <div class="dialog-title">${msg('Select group')}</div>
            </div>

            <div class="column items-center" style="margin-bottom: 20px; gap:15px; width:90%;">
                ${apps}
            </div>
            <div class="column items-center">
                <button
                        class="moss-button"
                        style="width: 180px; margin-bottom: 28px;"
                        @click=${() => this._showAddGroup = true}>
                    <div class="row center-content">
                        ${plusCircleIcon(20)}
                        <div style="margin-left: 10px;">${msg('Add group')}</div>
                    </div>
                </button>
            </div>
        </div>
    `;

  }

    async onSelectApp(name: string) {
        console.log("onSelectApp()");
        try {
            const result = await invoke('select', { name });
            console.log('Result:', result);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async onJoinGroup() {
        console.log("JOINING group space: " + this._inviteLink);
        try {
            const decoded: DnaJoiningInfo = decodeDnaJoiningInfo(this._inviteLink);
            const joinDnaId = new DnaId(decoded.originalDnaHash);
            if (joinDnaId.b64 != DNA_FROM_URL) {
                console.error("DNA MISMATCH.\n Expected: " + DNA_FROM_URL + "\n    got: " + joinDnaId.b64);
                return;
            }
            console.log("JOINING group space: installing " + joinDnaId.b64);
            await invoke("install", {name: decoded.name, seed: decoded.networkSeed});
        } catch(e) {
            console.error("failed to decode joining code");
            return;
        }
    }


  async createNewGroup(name: string) {
      console.log("createNewGroup()", name);
      try {
          const result = await invoke('install', {name});
          console.log('Result:', result);
      } catch (error) {
          console.error('Error:', error);
      }
  }

    async onToggleApp(app: AppInfo, enable: boolean) {
        console.log("onToggleApp()", app.installed_app_id, enable);
        try {
            let result = await invoke('toggle_app', { enable, name: app.installed_app_id });
            console.log('Result:', result);
        } catch (error) {
            console.error('Error:', error);
        }
    }


  /** */
  static override get styles() {
    return [
      css`
          .default-font {
              font-family: 'Inter Variable', 'Aileron', 'Open Sans', 'Helvetica Neue', sans-serif;
          }

          :host {
              background: #d1f6ce;
              display: block;
              height: 100vh;
              width: 100%;

              /* for cards */
              --sl-border-radius-medium: 6px;
              --sl-shadow-x-small: 1px 1px 5px 0 #9b9b9b;

              /* for buttons */
              --sl-input-border-radius-medium: 6px;

              --sl-input-height-large: 60px;

              /* Fonts */
              --sl-font-mono: 'Inter Variable', 'Aileron', 'Open Sans', 'Helvetica Neue', sans-serif;

              /* Colors */
              --moss-main-green: #e0eed5;

              --moss-light-green: #f4fed6;

              --moss-inactive-green: #b7c3b0;

              --moss-medium-green: #85b46e;

              --moss-fishy-green: #bac9af;

              --moss-dark-green: #1c251e;

              --moss-hint-green: #324d47;

              --moss-grey-green: #4c6a39;

              --moss-grey-light: #e8e8e8;
              --moss-grey-dark: #757575;

              --moss-dark-button: #151a11;

              --moss-purple: #7461eb;
              --moss-purple-semi-transparent: #2d2941;

              --moss-field-grey: #f4f4f4;

              /* shoelace dialog overlay background */
              --sl-overlay-background-color: #324d4781;

              /* tooltip border radius */
              --sl-tooltip-border-radius: 8px;
          }

          .error {
              background-color: #ffebee;
              color: #c62828;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
          }

          .centered {
              display: flex;
              flex-direction: column;
              margin: 0;
              gap: 10px;
              position: absolute;
              top: 50%;
              left: 50%;
              -ms-transform: translate(-50%, -50%);
              transform: translate(-50%, -50%);
          }

          .items-center {
              align-items: center;
          }

          .items-start {
              align-items: flex-start;
          }

          .items-end {
              align-items: flex-end;
          }

          .justify-center {
              justify-content: center;
          }

          .flex {
              display: flex;
          }

          .flex-1 {
              flex: 1;
          }

          .font-bold {
              font-weight: bold;
          }

          /* Invisible scrollbars */

          .invisible-scrollbars {
              -ms-overflow-style: none; /* IE and Edge */
              scrollbar-width: none; /* Firefox */
          }

          .invisible-scrollbars::-webkit-scrollbar {
              display: none;
          }

          /* Shoelace element styling */

          /* moss-button */

          .moss-button {
              all: unset;
              background: black;
              border-radius: 16px;
              padding: 16px 20px;
              font-size: 18px;
              font-weight: 500;
              line-height: 20px;
              color: white;
              cursor: pointer;
              text-align: center;
              --sl-color-neutral-0: black;
              --sl-color-primary-50: #455b36;
          }

          .moss-button:hover {
              background: #455b36;
          }

          .moss-button:disabled {
              opacity: 0.4;
              background: var(--moss-grey-green);
              cursor: default;
          }

          .moss-button:focus-visible {
              outline: 2px solid var(--moss-purple);
          }

          /* moss-button-secondary */

          .moss-button-secondary {
              all: unset;
              border-radius: 16px;
              padding: 14px 18px;
              font-size: 18px;
              font-weight: 500;
              line-height: 20px;
              color: black;
              border: 2px solid #334128;
              cursor: pointer;
              background: transparent;
          }

          .moss-button-secondary:hover {
              background: #f2ffd8;
          }

          .moss-button-secondary:disabled {
              opacity: 0.4;
              cursor: default;
              background: transparent;
          }

          .moss-button-secondary:focus-visible {
              outline: 2px solid var(--moss-purple);
          }

          .app-name {
              margin-left: 20px;
              font-size: 20px;
          }

          #cancel-btn {
              background: rgb(18, 77, 4);
          }

          #cancel-btn:hover {
              background: black;
          }

          .app-card {
              background: #f8f8f8;
              border-radius: 20px;
              padding: 15px 20px 15px 15px;
              width: 90%;
              /*transition: width 0.2s ease-in-out;*/
          }

          .app-card:hover {
              cursor: pointer;
              background: #ffffff;
              /*width: 95%;*/
          }

          .group-button {
              background: #cfe4ae;
              cursor: pointer;
              border-radius: 20px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: large;
              padding: 10px;
              padding-left: 20px;
              color: black;
          }
          
          /* moss-card */

          .moss-card {
              background: white;
              border-radius: 20px;
              padding: 15px;
          }

          /* moss-dialog */

          .moss-dialog {
              color: black;
          }

          .moss-dialog::part(panel) {
              border-radius: 20px;
              background: white;
          }

          .moss-dialog::part(title) {
              font-size: 26px;
              font-weight: 500;
              letter-spacing: -0.56px;
          }

          /* dialog-title */

          .dialog-title {
              font-size: 28px;
              font-weight: 500;
              letter-spacing: -0.56px;
              text-align: center;
          }

          /* moss-input */

          .moss-input {
              position: relative;
              /* For the label color to only show up on :focus-within the default color is transparent */
              /* color: transparent; */
              color: var(--moss-grey-dark);
          }

          .moss-input::part(base) {
              border-radius: 12px;
              border: 1px solid --moss-grey-light;
              font-size: 16px;
          }

          .moss-input {
              --sl-input-focus-ring-color: var(--moss-main-green);
              --sl-input-border-color-hover: var(--moss-dark-button);
              --sl-input-border-color-focus: var(--moss-dark-button);
              --sl-input-placeholder-color: var(--moss-grey-dark);
              --sl-input-height-medium: 52px;
          }

          .moss-input::part(form-control-label) {
              position: absolute;
              z-index: 1;
              font-size: 12px;
              margin-left: 17px;
              margin-top: 3px;
          }

          .moss-input:focus-within {
              /* hide the placeholder */
              --sl-input-placeholder-color: transparent;
          }

          .moss-input::part(input) {
              color: black;
          }

          .moss-input::part(input):placeholder-shown {
              color: var(--moss-grey-dark);
              z-index: 1;
          }

          .moss-input::part(input):focus {
              /* let the label shine through */
              background: transparent;
              margin-top: 3px;
          }

          .moss-input::part(input):not(:placeholder-shown) {
              /* let the label shine through */
              background: transparent;
              margin-top: 3px;
          }

          .moss-input::part(form-control-help-text) {
              margin-left: 14px;
              color: var(--moss-purple);
              font-size: 12px;
          }

          /* moss-input-no-label */

          .moss-input-no-label {
              position: relative;
              /* For the label color to only show up on :focus-within the default color is transparent */
              /* color: transparent; */
              color: var(--moss-grey-dark);
          }

          .moss-input-no-label::part(base) {
              border-radius: 12px;
              border: 1px solid --moss-grey-light;
              font-size: 16px;
          }

          .moss-input-no-label {
              --sl-input-focus-ring-color: var(--moss-main-green);
              --sl-input-border-color-hover: var(--moss-dark-button);
              --sl-input-border-color-focus: var(--moss-dark-button);
              --sl-input-placeholder-color: var(--moss-grey-dark);
              --sl-input-height-medium: 52px;
          }

          /* moss-hover-icon */

          .moss-hover-icon-button {
              all: unset;
              display: flex;
              flex-direction: row;
              align-items: center;
              cursor: pointer;
          }

          .moss-hover-icon-button:hover .moss-hover-icon-button-text {
              color: black;
          }

          .moss-hover-icon-button-text {
              color: transparent;
          }

          .moss-hover-icon-button-icon {
              border-radius: 8px;
              height: 24px;
          }

          .moss-hover-icon-button:hover .moss-hover-icon-button-icon {
              background: var(--moss-main-green);
          }

          /* moss dialog close button */

          .moss-dialog-close-button {
              all: unset;
              display: flex;
              flex-direction: row;
              align-items: center;
              cursor: pointer;
              border-radius: 8px;
              height: 24px;
          }

          .moss-dialog-close-button:hover {
              background: var(--moss-main-green);
          }

          /* moss dialog page indicator dots */

          .dialog-dot {
              height: 8px;
              width: 8px;
              border-radius: 50%;
              background-color: #d9d9d9;
          }

          /* radio button styles */

          sl-radio {
              /* --sl-input-background-color: var(--moss-main-green); */
              --sl-color-neutral-0: black;
              --sl-color-primary-600: var(--moss-main-green);
              --sl-input-background-color: var(--moss-main-green);
              --sl-color-primary-500: var(--moss-main-green);
              --sl-input-background-color-hover: var(--moss-light-green);
          }

          /* sidebar buttons */

          .moss-sidebar-button {
              all: unset;
              cursor: pointer;
              height: 48px;
              width: 48px;
              color: #fff;
              border-radius: 12px;
          }

          .moss-sidebar-button:hover {
              background: var(--moss-dark-button);
          }

          .moss-sidebar-button:focus-visible {
              outline: 2px solid var(--moss-purple);
              background: var(--moss-dark-button);
          }

          .install-button {
              display: flex;
              height: 32px;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              border: solid 2px;
              border-color: black;
              color: black;
              background-color: white;
              font-style: normal;
              font-size: 14px;
              line-height: 16px;
              padding: 8px 10px;
          }

          .install-button:hover {
              color: white;
              background-color: black;
          }

          .moss-mini-button-primary,
          .moss-mini-button-secondary {
              display: flex;
              height: 32px;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              border: solid 2px;
              font-style: normal;
              font-size: 14px;
              line-height: 16px;
              padding: 8px 10px;
          }

          .moss-mini-button-secondary {
              border-color: black;
              color: black;
              background-color: white;
          }

          .moss-mini-button-secondary:hover {
              color: white;
              background-color: black;
          }

          .moss-mini-button-primary:hover {
              color: black;
              background-color: white;
          }

          .moss-mini-button-primary {
              border-color: black;
              color: white;
              background-color: black;
          }

          .moss-mini-button-disabled {
              opacity: 0.4;
              pointer-events: none;
          }

          .tab-bar {
              border-bottom: 2px solid var(--moss-grey-light);
              /* margin-bottom: -2px; */
          }

          .tab {
              all: unset;
              display: flex;
              flex-direction: row;
              align-items: center;
              height: 38px;
              padding: 0 20px;
              cursor: pointer;
              margin-bottom: -2px;
              border-bottom: 2px solid transparent;
          }

          .tab:focus-visible {
              background: var(--moss-purple-semi-transparent);
          }

          .tab:hover {
              color: var(--moss-purple);
              border-bottom: 2px solid var(--moss-purple);
          }

          .tab-selected {
              border-bottom: 2px solid var(--moss-purple);
              color: var(--moss-purple);
          }

          /* Loading dots for buttons */
          /* https://codepen.io/nzbin/pen/GGrXbp */

          .dot-carousel {
              position: relative;
              left: -9999px;
              width: 10px;
              height: 10px;
              border-radius: 5px;
              background-color: var(--carousel-color, #ffffff);
              color: var(--carousel-color, #ffffff);
              box-shadow: 9984px 0 0 0 var(--carousel-color, #ffffff),
              9999px 0 0 0 var(--carousel-color, #ffffff),
              10014px 0 0 0 var(--carousel-color, #ffffff);
              animation: dot-carousel 1.5s infinite linear;
          }

          @keyframes dot-carousel {
              0% {
                  box-shadow: 9984px 0 0 -1px var(--carousel-color, #ffffff),
                  9999px 0 0 1px var(--carousel-color, #ffffff),
                  10014px 0 0 -1px var(--carousel-color, #ffffff);
              }
              50% {
                  box-shadow: 10014px 0 0 -1px var(--carousel-color, #ffffff),
                  9984px 0 0 -1px var(--carousel-color, #ffffff),
                  9999px 0 0 1px var(--carousel-color, #ffffff);
              }
              100% {
                  box-shadow: 9999px 0 0 1px var(--carousel-color, #ffffff),
                  10014px 0 0 -1px var(--carousel-color, #ffffff),
                  9984px 0 0 -1px var(--carousel-color, #ffffff);
              }
          }

          /** */

          .row {
              display: flex;
              flex-direction: row;
          }

          .column {
              display: flex;
              flex-direction: column;
          }

          .small-margin {
              margin-top: 6px;
          }

          .big-margin {
              margin-top: 23px;
          }

          .fill {
              flex: 1;
              height: 100%;
          }

          .title {
              font-size: 20px;
          }

          .center-content {
              align-items: center;
              justify-content: center;
          }

          .placeholder {
              color: var(--sl-color-gray-700);
          }

          .flex-scrollable-parent {
              position: relative;
              display: flex;
              flex: 1;
          }

          .flex-scrollable-container {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
          }

          .flex-scrollable-x {
              max-width: 100%;
              overflow-x: auto;
          }

          .flex-scrollable-y {
              max-height: 100%;
              overflow-y: auto;
          }

          :host {
              color: var(--sl-color-neutral-1000);
          }

          sl-card {
              display: flex;
          }

          sl-card::part(base) {
              flex: 1;
          }

          sl-card::part(body) {
              display: flex;
              flex: 1;
          }

          sl-drawer::part(body) {
              display: flex;
          }

          /* color classes */

          .bg-black {
              background-color: black;
          }
      `,

    ];
  }
}


export const plusCircleIcon = (size = 16) => html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${size}
    height=${size}
    fill="currentColor"
    class="bi bi-plus-circle"
    viewBox="0 0 16 16"
  >
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
    <path
      d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"
    />
  </svg>
`;

export const closeIcon = (size = 16) => html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width=${size}
    height=${size}
    fill="currentColor"
    class="bi bi-x"
    viewBox="0 0 16 16"
  >
    <path
      d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
    />
  </svg>
`;