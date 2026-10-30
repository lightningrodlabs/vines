import {css, html, LitElement, PropertyValues, TemplateResult} from "lit";
import {customElement, state} from "lit/decorators.js";
import {localized, msg} from '@lit/localize';
import {AdminWebsocket, AppInfo, ProvisionedCell,} from "@holochain/client";
import {setLocale} from "./localization";
import {
  decodeHappJoinInfo,
  DnaId,
  DnaIdMap,
  encodeHappJoinInfo,
  HAPP_BUILD_MODE,
  HappBuildModeType
} from "@ddd-qc/lit-happ";
import * as APPV from './generated/version.js';
import {invoke} from '@tauri-apps/api/core';
import {writeText,} from '@tauri-apps/plugin-clipboard-manager'
import QRCode from "qrcode";
import {decodeQrCodeString, isHappJoiningInfo} from "./qr-scanner";
import {dayTimestamp} from "@ddd-qc/files";
import {HappConnectInfo} from "./vines-index";
import {toasty} from "@vines/elements";
import {HappJoinInfo} from "@ddd-qc/cell-proxy";
import {getBootstrapPeers, MyTauriConfig} from "./globals";
import {ICON_B64} from "./icon";

/** */
@localized()
@customElement("vines-admin")
export class VinesAdmin extends LitElement {

  @state() private _adminWs?: AdminWebsocket;

  @state() private _inviteLink: string = '';
  @state() private _name: string = '';

  @state() private _initLoading: boolean = true;

  @state() private _loading: string | undefined = ""; // Display loading string if this is defined

  @state() private _showShareApp: boolean = false;
  @state() private _showAddGroup: boolean = false;
  @state() private _showGroupInvite: [AppInfo, string] | undefined = undefined; // Display if this is defined
  @state() private _showScanner: boolean = false;

  @state() private _defaultApp: string = localStorage.getItem('vinesDefaultApp')? localStorage.getItem('vinesDefaultApp')!: "";

  /*** Dna -> peer count found on bootstrap server */
  @state() private _peers: DnaIdMap<number> = new DnaIdMap();

  /** happId -> [appInfo, customName] */
  private _happList: Map<string, [AppInfo, string]> = new Map();


  /** */
  constructor() {
    console.debug("<vines-admin>.ctor()", APPV.APP_VERSION, HC_APP_PORT, HC_ADMIN_PORT);
    super();
    const adminUrl = HC_ADMIN_PORT? new URL(`ws://localhost:${HC_ADMIN_PORT}`) : undefined;
    AdminWebsocket.connect({url: adminUrl}).then(async (ws) => {
        this._adminWs = ws;
        await this.getApps();
        this._initLoading = false;
        //console.log("Installed apps:", this._apps);
    });
      if (globalThis.IS_TAURI) {
          console.debug("REQUESTING TAURI CONFIG...");
          invoke<MyTauriConfig>("get_config").then((config: MyTauriConfig) => {
              console.log("GOT TAURI CONFIG: " + JSON.stringify(config));
              globalThis.TAURI_HAPP_SHA256 = config.happ_sha256;
              globalThis.TAURI_TARGET_ARC = config.arc;
              globalThis.TAURI_BOOTSTRAP_URL = config.bootstrap_url;
          })
      }
  }

    protected override willUpdate(_changedProperties: PropertyValues) {
        super.willUpdate(_changedProperties);
        console.debug("<vines-admin>.willUpdate()", TAURI_CAN_DEFAULT, this._defaultApp, this._happList);
        /** Load default happ if any */
        if (TAURI_CAN_DEFAULT && this._defaultApp) {
            this.onSelectApp(this._defaultApp);
            globalThis.TAURI_CAN_DEFAULT = false; // do it only once
        }
    }


    /** */
    queryBootStrapServer(dnaId: DnaId) {
        getBootstrapPeers(globalThis.TAURI_BOOTSTRAP_URL!, dnaId.b64)
            .then((data) => {
                console.log(`<vines-admin>.queryBootStrapServer() found ${data.length} peers for dna`, dnaId.b64);
                this._peers.set(dnaId, data.length);
            })
            .catch((e) => console.warn(`<vines-admin>.queryBootStrapServer() failed:`, JSON.stringify(e)))
    }


    /** */
    async getApps() {
      if (!this._adminWs) {
          console.error("Missing _adminWs");
          return;
      }
      this._happList.clear();
      const apps: Array<AppInfo> = await this._adminWs.listApps({});
      for (const appInfo of apps) {
          const cell: ProvisionedCell = appInfo.cell_info["rVines"]![0]!.value as ProvisionedCell;
          const customName = localStorage.getItem("vinesCustomName_" + appInfo.installed_app_id);
          //const code = encodeHappJoinInfo(globalThis.TAURI_HAPP_SHA256!, appInfo.installed_app_id, cell.dna_modifiers.network_seed, [], customName);
          this._happList.set(appInfo.installed_app_id, [appInfo, customName ?? ""]);
          this.queryBootStrapServer(new DnaId(cell.cell_id[0]))
      }
      this.requestUpdate();

      // return apps.sort((a, b) => {
      //     if (a.status.type != b.status.type) {
      //         return b.status.type.localeCompare(a.status.type);
      //     }
      //     return a.installed_app_id.localeCompare(b.installed_app_id);
      // })
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


  // override async firstUpdated() {
  //   console.debug("<vines-admin>.firstUpdated() " + this._defaultApp)
  // }

  renderShareApp(): TemplateResult<1> {
      const appVersion = APPV.APP_VERSION;
      const happDownloadLinkUrl = `https://github.com/lightningrodlabs/vines/releases/download/v${appVersion}/vines-${appVersion}.apk`;

        const popover = this.shadowRoot!.getElementById('popover-happ');
        let existingImg = null;
        if (popover) { existingImg = popover.querySelector('img')}
        console.debug("renderQrCode() happ", existingImg, popover);
        if (!existingImg) {
            try {
                console.debug("Generating QR code for:", happDownloadLinkUrl);
                QRCode.toDataURL(happDownloadLinkUrl).then(generateQR => {
                    console.debug("Generated QR code");
                    const img = document.createElement('img');
                    img.src = generateQR;
                    img.style.width = '100%';
                    const popover2 = this.shadowRoot!.getElementById('popover-happ');
                    if (popover2) { popover2.append(img); this.requestUpdate();}
                    const popoverDiv = this.shadowRoot!.getElementById('happ-sha') as HTMLElement;
                    if (popoverDiv) { popoverDiv.innerText = globalThis.TAURI_HAPP_SHA256!}
                });
            } catch (err) {
                console.error(err);
            }
        }

        return html`
          <div class="column center-content flex-1" style="gap:15px; height:100%;">
              <div class="dialog-title" style="display:flex; flex-direction:row; gap:5px; align-items:baseline">
                  <span>Vines v${appVersion}</span>
              </div>
              <span class="flex flex-1"></span>
              <h3 style="margin:0px; margin-bottom:10px;">
                  <div style="width: fit-content; margin:auto; margin-bottom:5px;">${msg('APK download link')}</div>
                  <div id="popover-happ" style="cursor:pointer" 
                       @click=${async () => {
                            console.debug("writing to clipboard: " + happDownloadLinkUrl);
                            await writeText(happDownloadLinkUrl);
                            toasty(msg("Download link copied to clipboard"), undefined, this);
                        }}>
                  </div>
              </h3>
              <a .href=${happDownloadLinkUrl} target="_blank" style="width:100%; word-wrap:break-word">${happDownloadLinkUrl}</a>
              <div id="happ-sha" style="width:100%; word-wrap:break-word"></div>
              <span class="flex flex-1"></span>
              <button id="cancel-btn"
                      class="moss-button"
                      @click=${() => this._showShareApp = false}>
                  <div class="row center-content">
                      <ui5-icon name="nav-back" style="margin-right:10px;"></ui5-icon>
                      <div>${msg('Back')}</div>
                  </div>
              </button>              
              </div>           
          </div>
      `;
    }

  /** */
  renderGroupInvite(): TemplateResult<1> {
      const [appInfo, customName] = this._showGroupInvite!;
      const cell: ProvisionedCell = appInfo.cell_info["rVines"]![0]!.value as ProvisionedCell;
      const dnaId = new DnaId(cell.cell_id[0]);
      const shareCode = encodeHappJoinInfo(globalThis.TAURI_HAPP_SHA256!, appInfo.installed_app_id, cell.dna_modifiers.network_seed, [], customName);
      const isDefault = this._defaultApp == shareCode;
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
          <div class="column center-content flex-1" style="gap:15px; height:100%;">
              <div class="dialog-title" style="display:flex; flex-direction:row; gap:5px; align-items:baseline; overflow: hidden;">
                  <span style="overflow-wrap: break-word; word-break: break-word; max-width: 100vw;">${customName != "" ?  customName : appInfo.installed_app_id}</span>
                  <div style="margin-left:5px; color: var(--vines-accent); font-size:18px;">${isDefault? `(${msg("default")})`: ""}</div>
              </div>
              <div>${msg("Peers online: ")} ${this._peers.get(dnaId) ?? 0}</div>
              <button @click=${(_e:any) => this.queryBootStrapServer(dnaId)}>Recheck</button>
              <span class="flex flex-1"></span>
              <h3 style="margin:0px; margin-bottom:10px;">
                  <div style="width: fit-content; margin:auto; margin-bottom:5px;">${msg('Invite code')}</div>
                  <div id="popover" style="cursor:pointer" @click=${async () => {
                      console.debug("writing to clipboard: " + shareCode);
                      await writeText(shareCode);
                      toasty(msg("Invite code copied to clipboard"), undefined, this);
                  }}></div>
              </h3>
              <!-- <ui5-textarea .value=${shareCode} style="height:80px; width: 90%;"></ui5-textarea> -->
              <span class="flex flex-1"></span>
              <button class="moss-button"
                      style="width:90%"
                      @click=${(_e:any) => this.onSelectApp(appInfo.installed_app_id)}>
                  ${msg("Launch")}
              </button>
              ${isDefault? html`
                        <button class="moss-button-secondary"
                                style="width:90%"
                                @click=${(_e:any) => {
                                      localStorage.setItem("vinesDefaultApp", "");
                                      this._defaultApp = "";
                                  }}>
                            ${msg("Unset default")}
                        </button>          
                    ` : html`
                        <button class="moss-button-secondary"
                                style="width:90%"
                                @click=${(_e:any) => {
                                      localStorage.setItem("vinesDefaultApp", shareCode);
                                      this._defaultApp = shareCode;
                                  }}>
                            ${msg("Set default")}
                        </button>
              `}

              <button
                      class="disable-btn"
                      style="width:90%"
                      @click=${() => {
                          this._showGroupInvite = undefined;
                          this.onToggleApp(appInfo, false).then(async () => await this.getApps())
                      }}>
                  ${msg("Deactivate")}
              </button>
              <button id="cancel-btn"
                      class="moss-button"
                      @click=${() => this._showGroupInvite = undefined}>
                  <div class="row center-content">
                      <ui5-icon name="nav-back" style="margin-right:10px;"></ui5-icon>
                      <div>${msg('Back')}</div>
                  </div>
              </button>              
              </div>           
          </div>
      `;
  }

  private _inviteError: string | undefined = undefined;

  /** */
  hasJoiningCode(inviteLink: string): boolean {
    if (!inviteLink || inviteLink.length == 0) {
      return false;
    }
    const happJoinInfo = decodeHappJoinInfo(inviteLink);
    if (!this._happList.get(happJoinInfo.happId)) {
      return false;
    }
    const name = happJoinInfo.customName ?? happJoinInfo.happId;
    this._inviteError = msg("Group already joined") + ": " + name;
    return true;
  }

  /** */
  renderAddGroup(greet: boolean): TemplateResult<1> {
      let inviteGroup: HappJoinInfo | undefined = undefined;
      this._inviteError = undefined;
      if (this._inviteLink) {
          this._inviteError = msg("Invalid invite code");
          try {
              const maybe = decodeQrCodeString(this._inviteLink);
              console.debug("maybe: " + JSON.stringify(maybe));
              if (isHappJoiningInfo(maybe)) {
                  if (!this.hasJoiningCode(this._inviteLink) && globalThis.TAURI_HAPP_SHA256 == maybe.happSha256) {
                    inviteGroup = maybe as HappJoinInfo;
                    this._inviteError = undefined;
                  }
              } else {
                  console.debug("maybe: NOPE");
              }
          } catch (e) {
              console.debug("INVALID INVITE CODE: " + JSON.stringify(e));
          }
      }

      console.debug("inviteGroup: " + JSON.stringify(inviteGroup));
      return html`
            <div class="column center-content flex-1 launch-bg" style="margin-left:5px; margin-right:5px;">
                <div class="column items-center" style="margin-bottom: 15px;">
                    <div style="margin-bottom:8px; margin-top:14px;"><img src=${ICON_B64} style="height: 64px"/></div>
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
                            ${msg('I have an invite code to join a group')}
                        </div>
                        <div class="column center-content hint" style="margin-bottom: 12px; max-width:100%;">
                            <div style="margin-bottom:3px;">${msg('An invite code looks like:')}</div>
                            <div style="background: var(--vines-surface-tint); padding:3px;text-overflow: ellipsis;overflow: clip;max-width: 100%;">
                                g69vcmlnaW5hbERuYUhhc2jEJ4QtJEUWYfwZRyGSlKexuB/xOV02DsJ+RON4IFANf+C7cdRx0a5/GaRu
                            </div>
                        </div>

                        <div class="row items-center justify-center" style="margin-bottom: 2px; margin-top:1px;">
                            ${inviteGroup? html`                           
                            <button
                                    id="invited-group-btn"
                                    class="group-button"
                                    @click=${() => this._inviteLink = ''}
                                    style="max-width:100px; text-overflow: ellipsis; overflow: clip;"
                            >
                            ${inviteGroup.customName ?? inviteGroup.happId}
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
                                    placeholder=${msg('paste invite code here')}
                                    label=${msg('invite code')}
                                    style="margin-right:1px; max-width: 180px;"
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
                        ${this._inviteError? html`<div class="error" style="margin-bottom:0px;">${this._inviteError}</div>` : html``}
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
    console.log("<vines-admin>.render()", this._happList);
    /** Check init has been done */
    if (this._initLoading || !!this._loading) {
      return html`
          <div class="centered">
              <ui5-busy-indicator delay="0" size="L" active
                                  style="color: var(--vines-warning)"
              ></ui5-busy-indicator>
              <div style="font-size: 18px; color: var(--vines-ink);">${this._loading}</div>
              ${HAPP_BUILD_MODE != HappBuildModeType.Retail? html`
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
    if (this._happList.size == 0) {
      return this.renderAddGroup(true);
    }
      if (this._showShareApp) {
          return this.renderShareApp();
      }
    if (this._showAddGroup) {
      return this.renderAddGroup(false);
    }
    if (this._showGroupInvite) {
      return this.renderGroupInvite();
    }

    // Sort by status then by alphabetic name
    const appInfos: [string, [AppInfo, string]][] = Array.from(this._happList).sort(([_k1, a], [_k2, b]) => {
          if (a[0].status.type != b[0].status.type) {
              return b[0].status.type.localeCompare(a[0].status.type);
          }
          const aName = a[1] != "" ? a[1] : a[0].installed_app_id;
          const bName = b[1] != "" ? b[1] : b[0].installed_app_id;
          return aName.localeCompare(bName);
    });
    let apps  = [html``];
    appInfos.forEach( ([code, [app, customName]]) => {
            const isDefault = this._defaultApp == code;
            const name = customName != "" ? customName : app.installed_app_id;
            const elem = app.status.type == "enabled"
            ? html`
                <div   .id=${`panel-${app.installed_app_id}`} class="app-panel"
                       @click=${(e:any) => {
                          e.preventDefault(); e.stopPropagation();
                           this._showGroupInvite = [app, customName]
                        }}>
                        <div class="app-name">${name}</div>
                        <div style="margin-left: 5px; color: var(--vines-accent)">${isDefault? `(${msg("default")})`: ""}</div>
                        <span class="flex flex-1"></span>
                        <div style="color: var(--vines-ink-muted); font-size:small">${dayTimestamp(app.installed_at)}</div>
                </div>
            ` : html`
                    <div class="app-panel" 
                         style="background: var(--vines-surface-2); color: var(--vines-ink-muted); cursor:default;">
                        <div class="app-name">${name}</div>
                        <span class="flex flex-1"></span>
                        <button
                                class="enable-btn"
                                style="width: 100px;"
                                @click=${(e:any) => {
                                    e.stopPropagation();
                                    this.onToggleApp(app, true).then(async () => await this.getApps())
                                }}
                        >
                            ${msg("Activate")}
                    </div>
                `;
            apps.push(elem);
        })

    /** Render all */
    return html`
        <div class="column center-content flex-1" style="max-height: 100%;">
            
            <div class="column items-center" style="margin-bottom: 12px;">
                <div style="margin-bottom:4px; margin-top:14px;"><img src=${ICON_B64} style="height: 64px"/></div>
                ${HAPP_BUILD_MODE != HappBuildModeType.Retail && TAURI_TARGET_ARC != undefined? html`<div class="dialog-title">${TAURI_TARGET_ARC == 1? "FULL ARC" : "ZERO ARC"}</div>` : html``}
                <!-- <div class="dialog-title">${msg('Select group')}</div> -->
            </div>

            <div class="column items-center" style="margin-bottom: 20px; gap:15px; width:90%; max-height:100%; overflow:scroll;">
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
                <button
                        class="moss-button-secondary"
                        style="width: 180px; margin-bottom: 28px;"
                        @click=${() => this._showShareApp = true}>
                    <div class="row center-content">
                        <ui5-icon name="share-2"></ui5-icon>
                        <div style="margin-left: 10px;">${msg('Share app')}</div>
                    </div>
                </button>
            </div>
            
        </div>
    `;

  }

    /** */
    onSelectApp(happId: string) {
        console.log("onSelectApp()");
        this._loading = msg("Launching...");
        try {
            invoke('select', { name: happId })
                .then((pair: any) => {
                    console.debug("Received HappConnectInfo: " + JSON.stringify(pair));
                    const happConnectInfo: HappConnectInfo = {
                        port: pair[0],
                        token: pair[1],
                        happId,
                        customName: undefined,
                    };
                    this.dispatchEvent(new CustomEvent<HappConnectInfo>('app-selected', {detail: happConnectInfo, bubbles: true, composed: true}));
                    this._loading = undefined;
                });
        } catch (error) {
            console.error('Error:', error);
        }
    }

    /** */
    async onJoinGroup() {
        console.log("JOINING group space: " + this._inviteLink);
        try {
            const decoded: HappJoinInfo = decodeHappJoinInfo(this._inviteLink);
            if (decoded.happSha256 != globalThis.TAURI_HAPP_SHA256) {
                console.error("HAPP VERSION MISMATCH.\n Expected: " + globalThis.TAURI_HAPP_SHA256 + "\n    got: " + decoded.happSha256);
                return;
            }
            console.log(`JOINING group space "${decoded.customName}" : installing ${decoded.happSha256}`);
            await this.createNewGroup(decoded.happId, decoded.networkSeed, decoded.customName);
        } catch(e) {
            console.error("failed to decode invite code", e);
            return;
        }
    }

      /** */
      async createNewGroup(happId: string, networkSeed?: string, customName?: string) {
          console.log("createNewGroup()", happId);
          try {
              /** Install happ */
              const result: any = await invoke('install', {name: happId, seed: networkSeed});
              console.debug("Received HappInfo: " + JSON.stringify(result));
              /** Remember this agent as the progenitor of this happ */
              localStorage.setItem("vinesMeProgenitor_" + happId, "true");
              /** Store customName in localStorage */
              if (customName) {
                localStorage.setItem("vinesCustomName_" + happId, customName);
              }
              /** Select it */
              const happConnectInfo: HappConnectInfo = {
                  port: result[0],
                  token: result[1],
                  happId,
                  customName
              };
              this.dispatchEvent(new CustomEvent<HappConnectInfo>('app-selected', {detail: happConnectInfo, bubbles: true, composed: true}));
          } catch (error) {
              console.error('Error when creating new group:', error);
          }
      }

    /** */
    async onToggleApp(target: AppInfo, enable: boolean) {
       console.log("onToggleApp()", target.installed_app_id, enable, !!this._adminWs);
       let installedApps = await this._adminWs!.listApps({});
       let maybeAppInfo = installedApps.find((app) => app.installed_app_id == target.installed_app_id);
       if (!maybeAppInfo) {
           console.warn("App not found: " + target.installed_app_id);
           return;
       }
       // Enable
       if (enable && maybeAppInfo.status.type != "enabled") {
          await this._adminWs!.enableApp({installed_app_id: target.installed_app_id})
          return;
       }
       // Disable
        if (!enable && maybeAppInfo.status.type == "enabled") {
          await this._adminWs!.disableApp({installed_app_id: target.installed_app_id})
          return;
        }
    }


  /** */
  static override get styles() {
    return [
      css`
          .default-font {
              font-family: var(--vines-font);
          }

          :host {
              background: var(--vines-page-bg);
              display: block;
              height: 100vh;
              width: 100%;
              padding: 20px;
              box-sizing: border-box;
              
              /* for cards */
              --sl-border-radius-medium: 6px;
              --sl-shadow-x-small: var(--vines-shadow-card);

              /* for buttons */
              --sl-input-border-radius-medium: 6px;

              --sl-input-height-large: 60px;

              /* Fonts */
              --sl-font-mono: var(--vines-font);

              /* Colors */

              /* shoelace dialog overlay background */
              --sl-overlay-background-color: color-mix(in srgb, var(--vines-ink-hint) 50%, transparent);

              /* tooltip border radius */
              --sl-tooltip-border-radius: 8px;
          }

          .app-panel {
              height: 40px;
              width: 85%;
              background: var(--vines-surface);
              border-radius: 20px;
              padding: 20px;
              display:flex; 
              flex-direction: row; 
              align-items:center
          }

          .app-panel:hover {
              cursor: pointer;
              background: var(--vines-surface-tint);
          }

          .error {
              background-color: color-mix(in srgb, var(--vines-negative) 12%, transparent);
              color: var(--vines-negative);
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
              background: var(--vines-ink);
              border-radius: 16px;
              padding: 16px 20px;
              font-size: 18px;
              font-weight: 500;
              line-height: 20px;
              color: var(--vines-surface);
              cursor: pointer;
              text-align: center;
              --sl-color-neutral-0: var(--vines-ink);
              --sl-color-primary-50: var(--vines-accent);
          }

          .moss-button:hover {
              background: var(--vines-accent);
          }

          .moss-button:disabled {
              opacity: 0.4;
              background: var(--vines-accent);
              cursor: default;
          }

          .moss-button:focus-visible {
              outline: 2px solid var(--vines-accent-alt);
          }

          /* enable-btn */

          .enable-btn {
              all: unset;
              display: inline-flex;
              justify-content: center;
              border-radius: 16px;
              padding: 7px 18px;
              font-size: 18px;
              font-weight: 500;
              line-height: 20px;
              color: var(--vines-positive);
              border: 2px solid var(--vines-accent-soft);
              cursor: pointer;
              background: var(--vines-surface);
          }

          .enable-btn:hover {
              background: color-mix(in srgb, var(--vines-accent-soft) 40%, transparent);
          }

          /* disable-btn */

          .disable-btn {
              all: unset;
              display: inline-flex;
              justify-content: center;
              border-radius: 16px;
              padding: 14px 18px;
              font-size: 18px;
              font-weight: 500;
              line-height: 20px;
              color: var(--vines-negative);
              border: 2px solid var(--vines-negative);
              cursor: pointer;
              background: var(--vines-surface);
          }

          .disable-btn:hover {
              background: color-mix(in srgb, var(--vines-negative) 50%, transparent);
              color: var(--vines-surface);
          }

          .disable-btn:disabled {
              opacity: 0.4;
              cursor: default;
              background: transparent;
          }

          .disable-btn:focus-visible {
              outline: 2px solid var(--vines-accent-alt);
          }

          /* moss-button-secondary */

          .moss-button-secondary {
              all: unset;
              display: inline-flex;
              border-radius: 16px;
              justify-content: center;
              padding: 14px 18px;
              font-size: 18px;
              font-weight: 500;
              line-height: 20px;
              color: var(--vines-ink);
              border: 2px solid var(--vines-ink);
              cursor: pointer;
              background: var(--vines-surface);
          }

          .moss-button-secondary:hover {
              background: var(--vines-surface-tint);
          }

          .moss-button-secondary:disabled {
              opacity: 0.4;
              cursor: default;
              background: transparent;
          }

          .moss-button-secondary:focus-visible {
              outline: 2px solid var(--vines-accent-alt);
          }

          .app-name {
              margin-left: 10px;
              font-size: 20px;
              text-overflow: ellipsis;
              overflow: clip;
              white-space: nowrap;
          }

          #cancel-btn {
              background: var(--vines-accent);
          }

          #cancel-btn:hover {
              background: var(--vines-ink);
          }

          .app-card {
              background: var(--vines-surface-2);
              border-radius: 20px;
              padding: 15px 20px 15px 15px;
              width: 90%;
              /*transition: width 0.2s ease-in-out;*/
          }

          .app-card:hover {
              cursor: pointer;
              background: var(--vines-surface);
              /*width: 95%;*/
          }

          .group-button {
              background: var(--vines-surface-tint);
              cursor: pointer;
              border-radius: 20px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: large;
              padding: 10px;
              padding-left: 20px;
              color: var(--vines-ink);
          }

          /* moss-card */

          .moss-card {
              background: var(--vines-surface);
              border-radius: 20px;
              padding: 15px;
          }

          /* moss-dialog */

          .moss-dialog {
              color: var(--vines-ink);
          }

          .moss-dialog::part(panel) {
              border-radius: 20px;
              background: var(--vines-surface);
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
              color: var(--vines-ink-muted);
          }

          .moss-input::part(base) {
              border-radius: 12px;
              border: 1px solid var(--vines-border);
              font-size: 16px;
          }

          .moss-input {
              --sl-input-focus-ring-color: var(--vines-surface-tint);
              --sl-input-border-color-hover: var(--vines-ink);
              --sl-input-border-color-focus: var(--vines-ink);
              --sl-input-placeholder-color: var(--vines-ink-muted);
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
              color: var(--vines-ink);
          }

          .moss-input::part(input):placeholder-shown {
              color: var(--vines-ink-muted);
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
              color: var(--vines-accent-alt);
              font-size: 12px;
          }

          /* moss-input-no-label */

          .moss-input-no-label {
              position: relative;
              /* For the label color to only show up on :focus-within the default color is transparent */
              /* color: transparent; */
              color: var(--vines-ink-muted);
          }

          .moss-input-no-label::part(base) {
              border-radius: 12px;
              border: 1px solid var(--vines-border);
              font-size: 16px;
          }

          .moss-input-no-label {
              --sl-input-focus-ring-color: var(--vines-surface-tint);
              --sl-input-border-color-hover: var(--vines-ink);
              --sl-input-border-color-focus: var(--vines-ink);
              --sl-input-placeholder-color: var(--vines-ink-muted);
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
              color: var(--vines-ink);
          }

          .moss-hover-icon-button-text {
              color: transparent;
          }

          .moss-hover-icon-button-icon {
              border-radius: 8px;
              height: 24px;
          }

          .moss-hover-icon-button:hover .moss-hover-icon-button-icon {
              background: var(--vines-surface-tint);
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
              background: var(--vines-surface-tint);
          }

          /* moss dialog page indicator dots */

          .dialog-dot {
              height: 8px;
              width: 8px;
              border-radius: 50%;
              background-color: var(--vines-border);
          }

          /* radio button styles */

          sl-radio {
              /* --sl-input-background-color: var(--vines-surface-tint); */
              --sl-color-neutral-0: var(--vines-ink);
              --sl-color-primary-600: var(--vines-surface-tint);
              --sl-input-background-color: var(--vines-surface-tint);
              --sl-color-primary-500: var(--vines-surface-tint);
              --sl-input-background-color-hover: var(--vines-surface-tint);
          }

          /* sidebar buttons */

          .moss-sidebar-button {
              all: unset;
              cursor: pointer;
              height: 48px;
              width: 48px;
              color: var(--vines-surface);
              border-radius: 12px;
          }

          .moss-sidebar-button:hover {
              background: var(--vines-ink);
          }

          .moss-sidebar-button:focus-visible {
              outline: 2px solid var(--vines-accent-alt);
              background: var(--vines-ink);
          }

          .install-button {
              display: flex;
              height: 32px;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              border: solid 2px;
              border-color: var(--vines-ink);
              color: var(--vines-ink);
              background-color: var(--vines-surface);
              font-style: normal;
              font-size: 14px;
              line-height: 16px;
              padding: 8px 10px;
          }

          .install-button:hover {
              color: var(--vines-surface);
              background-color: var(--vines-ink);
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
              border-color: var(--vines-ink);
              color: var(--vines-ink);
              background-color: var(--vines-surface);
          }

          .moss-mini-button-secondary:hover {
              color: var(--vines-surface);
              background-color: var(--vines-ink);
          }

          .moss-mini-button-primary:hover {
              color: var(--vines-ink);
              background-color: var(--vines-surface);
          }

          .moss-mini-button-primary {
              border-color: var(--vines-ink);
              color: var(--vines-surface);
              background-color: var(--vines-ink);
          }

          .moss-mini-button-disabled {
              opacity: 0.4;
              pointer-events: none;
          }

          .tab-bar {
              border-bottom: 2px solid var(--vines-border);
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
              background: color-mix(in srgb, var(--vines-accent-alt) 25%, var(--vines-ink));
          }

          .tab:hover {
              color: var(--vines-accent-alt);
              border-bottom: 2px solid var(--vines-accent-alt);
          }

          .tab-selected {
              border-bottom: 2px solid var(--vines-accent-alt);
              color: var(--vines-accent-alt);
          }

          /* Loading dots for buttons */
          /* https://codepen.io/nzbin/pen/GGrXbp */

          .dot-carousel {
              position: relative;
              left: -9999px;
              width: 10px;
              height: 10px;
              border-radius: 5px;
              background-color: var(--carousel-color, var(--vines-surface));
              color: var(--carousel-color, var(--vines-surface));
              box-shadow: 9984px 0 0 0 var(--carousel-color, var(--vines-surface)),
              9999px 0 0 0 var(--carousel-color, var(--vines-surface)),
              10014px 0 0 0 var(--carousel-color, var(--vines-surface));
              animation: dot-carousel 1.5s infinite linear;
          }

          @keyframes dot-carousel {
              0% {
                  box-shadow: 9984px 0 0 -1px var(--carousel-color, var(--vines-surface)),
                  9999px 0 0 1px var(--carousel-color, var(--vines-surface)),
                  10014px 0 0 -1px var(--carousel-color, var(--vines-surface));
              }
              50% {
                  box-shadow: 10014px 0 0 -1px var(--carousel-color, var(--vines-surface)),
                  9984px 0 0 -1px var(--carousel-color, var(--vines-surface)),
                  9999px 0 0 1px var(--carousel-color, var(--vines-surface));
              }
              100% {
                  box-shadow: 9999px 0 0 1px var(--carousel-color, var(--vines-surface)),
                  10014px 0 0 -1px var(--carousel-color, var(--vines-surface)),
                  9984px 0 0 -1px var(--carousel-color, var(--vines-surface));
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
              background-color: var(--vines-ink);
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
