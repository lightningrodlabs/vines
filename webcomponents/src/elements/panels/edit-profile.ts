import { html, css, LitElement } from 'lit';
import { property, query, state, customElement } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import Input from "@ui5/webcomponents/dist/Input";
import ValueState from "@ui5/webcomponents-base/dist/types/ValueState.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Button.js";

import "@shoelace-style/shoelace/dist/components/avatar/avatar.js"
import "@shoelace-style/shoelace/dist/components/color-picker/color-picker.js"
import "@shoelace-style/shoelace/dist/components/radio/radio.js";
import "@shoelace-style/shoelace/dist/components/radio-group/radio-group.js"

import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm";


/** Crop the image and return a base64 bytes string of its content */
export function resizeAndExport(img: HTMLImageElement) {
  const MAX_WIDTH = 300;
  const MAX_HEIGHT = 300;

  let width = img.width;
  let height = img.height;

  /* Change the resizing logic */
  if (width > height) {
    if (width > MAX_WIDTH) {
      height = height * (MAX_WIDTH / width);
      width = MAX_WIDTH;
    }
  } else {
    if (height > MAX_HEIGHT) {
      width = width * (MAX_HEIGHT / height);
      height = MAX_HEIGHT;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.drawImage(img, 0, 0, width, height);

  /* return the .toDataURL of the temp canvas */
  return canvas.toDataURL();
}


function getRandomHexColor(): string {
  // Generate a random integer between 0 and 255 for each color component (R, G, B)
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  // Convert each component to a two-digit hexadecimal string
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  // Combine the hexadecimal components into one string with a '#' prefix
  return `#${rHex}${gHex}${bHex}`;
}


/**
 * @element edit-profile
 * @fires save-profile - Fired when the save profile button is clicked
 */
@localized()
@customElement("vines-edit-profile")
export class EditProfile extends LitElement {

  /** The profile to be edited. */
  @property({ type: Object })
  profile: ProfileMat | undefined = undefined;

  /** Label for the save profile button. */
  @property({ type: String, attribute: 'save-profile-label' })
  saveProfileLabel: string | undefined;

  @property()
  avatarMode: string = "";

  @property({ type: Boolean })
  allowCancel = false;

  @state() private _avatar: string | undefined;


  @query('#nickname-field')
  private _nicknameField!: Input;

  @query('#avatar-file-picker')
  private _avatarFilePicker!: HTMLInputElement;


  /** -- Methods -- */

  /** Handle global events */
  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keyup', this.onKeyUp);
  }
  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keyup', this.onKeyUp);
  }


  /** */
  async onKeyUp(e:any) {
    //console.log("<edit-profile>.onKeyUp()", e.keyCode);
    if (e.keyCode === 13 && this.shouldSaveButtonBeEnabled()) {
      e.stopPropagation();
      this.fireSaveProfile();
    }
  }


  /** */
  override firstUpdated() {
    //console.log("<edit-profile>.firstUpdated()");
    this._avatar = this.profile?.fields["avatar"];
  }


  /** */
  onAvatarUploaded() {
    if (this._avatarFilePicker.files && this._avatarFilePicker.files[0]) {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this._avatar = resizeAndExport(img);
          this._avatarFilePicker.value = '';
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(this._avatarFilePicker.files[0]);
    }
  }


  /** */
  renderAvatar() {
    return html`
      <div
        style="width: 80px; height: 80px; justify-content: center;"
        class="row"
      >
        ${this._avatar
          ? html`
              <div class="column" style="align-items: center; ">
                <sl-avatar
                  image=${this._avatar}
                  alt="Avatar"
                  style="margin-bottom: 4px; --size: 3.5rem;"
                  initials=""
                ></sl-avatar>
                <span
                  class="placeholder label"
                  style="cursor:pointer; text-decoration:underline;"
                  @click=${() => (this._avatar = undefined)}
                  >${msg('Clear')}</span
                >
              </div>
            ` : html`
                  <div class="column" style="align-items: center;">
                  <ui5-button
                    icon="add"
                    @click=${() => this._avatarFilePicker.click()}
                    style="margin-bottom: 4px;"
                  ></ui5-button>
                  <span class="placeholder label">${msg('Avatar')}</span>
              </div>
            `}
      </div>
    `;
  }


  /** */
  shouldSaveButtonBeEnabled() {
    if (!this._nicknameField || !this._nicknameField.value) {
      return false;
    }
    if (this.avatarMode === 'avatar-required' && !this._avatar) {
      return false;
    }
    return true;
  }


  /** */
  textfieldToFieldId(field: Input): string {
    return field.id.split('-')[2]!;
  }


  /** */
  getAdditionalFieldsValues(): Record<string, string> {
    const textfields = this.getAdditionalTextFields();
    const values: Record<string, string> = {};
    for (const [id, textfield] of Object.entries(textfields)) {
      values[id] = textfield.value;
    }
    return values;
  }


  /** */
  getAdditionalTextFields(): Record<string, Input> {
    const textfields = Array.from(this.shadowRoot!.querySelectorAll('mwc-textfield'))
      .filter(f => f.id !== 'nickname-field') as Input[];
    const fields: Record<string, Input> = {};
    for (const field of textfields) {
      const id = this.textfieldToFieldId(field);
      fields[id] = field;
    }
    return fields;
  }


  /** */
  fireSaveProfile() {
    if (!this._nicknameField.value) {
      this._nicknameField.valueState = ValueState.Error;
      return;
    }
    const nickname = this._nicknameField.value.trim();
    const regex = new RegExp(`^["a-zA-Z0-9-_"]+$`);
    const isValid = regex.test(nickname);
    if (!isValid) {
      this._nicknameField.valueState = ValueState.Error;
      const errorMsg = this.shadowRoot!.getElementById("errorMsg") as HTMLElement;
      errorMsg.textContent = msg("Bad characters");
      return;
    }
    const fields: Record<string, string> = this.getAdditionalFieldsValues();

    console.log("fireSaveProfile()", fields);

    /** avatar */
    fields['avatar'] = this._avatar? this._avatar : "";

    /** lang */
    const langRadioGroup = this.shadowRoot!.getElementById("langRadioGroup") as any;
    console.log({langRadioGroup});
    fields['lang'] = langRadioGroup.value? langRadioGroup.value : "";

    /** Color */
    const colorPicker = this.shadowRoot!.getElementById("colorPicker") as any;
    console.log({colorPicker});
    fields['color'] = colorPicker.value? colorPicker.value : "";

    const profile: ProfileMat = {
      fields,
      nickname,
    };

    this.dispatchEvent(
      new CustomEvent<ProfileMat>('save-profile', {
        detail: profile,
        bubbles: true,
        composed: true,
      })
    );
  }


  /** */
  fireCancel() {
    this.dispatchEvent(
      new CustomEvent('cancel-edit-profile', {
        bubbles: true,
        composed: true,
      })
    );
  }


  /** */
  async handleLangChange(_e: any) {
    const langRadioGroup = this.shadowRoot!.getElementById("langRadioGroup") as any;
    console.log({langRadioGroup});
    const lang = langRadioGroup.value;
    console.log("handleLangChange: lang =", lang);
    this.dispatchEvent(new CustomEvent<string>('lang-selected', { detail: lang, bubbles: true, composed: true }));
  }


  /** */
  override render() {
    console.log("<edit-profile>.render()", this.profile);

    return html`
      <section>
        <input type="file"
               id="avatar-file-picker"
               style="display: none;"
               @change=${this.onAvatarUploaded}
        />

        <div class="column">

          <!-- Use row-reverse so input field is focused first -->  
          <div class="row" style="justify-content: center; margin-bottom: 12px; align-self: start;flex-direction: row-reverse;" >
              <ui5-input
                      id="nickname-field"
                      outlined required
                      .maxlength=${32}
                      .label=${msg('Nickname')}
                      .value=${this.profile?.nickname || ''}
                      style="margin-left: 8px;"
                      @input=${(_e:any) => {
                        if (this._nicknameField.value.length > 0) {
                            this._nicknameField.valueState = ValueState.None;
                        } else {
                            this._nicknameField.valueState = ValueState.Error;
                        }
                      }}>
                  <div id="errorMsg" slot="valueStateMessage">${msg("Minimum 1 character")}</div>                  
              </ui5-input>
            ${this.renderAvatar()}
          </div>

          <div class="row" style="justify-content: center; margin-bottom: 18px; align-self: start;" >
              <span style="font-size:18px;padding-right:10px;padding-top:5px;">${msg('Color')}:</span>
              <sl-color-picker id="colorPicker" hoist slot="meta" size="small" noFormatToggle format="hex"
                               .value=${this.profile && this.profile.fields['color']? this.profile.fields['color'] : getRandomHexColor() }></sl-color-picker>
          </div>

            <div class="row" style="justify-content: center; margin-bottom: 8px; align-self: start;" >
                <span style="font-size:18px;padding-right:10px;">${msg('Language')}:</span>
                <sl-radio-group id="langRadioGroup" @click=${this.handleLangChange} .value=${this.profile && this.profile.fields['lang']? this.profile.fields['lang'] : "en"}>
                    <sl-radio value="en">🇬🇧</sl-radio>
                    <sl-radio value="fr-fr">🇫🇷</sl-radio>
                </sl-radio-group>
            </div>
      </section>
      
      <div slot="footer" style="display:flex;">
          <ui5-button
                  style="flex:1; margin-right:6px; margin-top:15px;"
                  design="Emphasized"
                  .disabled=${!this.shouldSaveButtonBeEnabled()}
                  @click=${() => this.fireSaveProfile()}
          >${msg("Save Profile")}</ui5-button>          
            ${this.allowCancel
              ? html`
              <ui5-button
                style="flex:1; margin-top:15px;"
                @click=${() => this.fireCancel()}
              >${msg("Cancel")}</ui5-button>
              ` : html``
            }
          </div>
      
        </div>
    `;
  }


  /** */
  static override styles = [css`

    sl-radio {
      font-size: larger;
    }

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
      color: rgba(0, 0, 0, 0.7);
    }

    .label {
      color: var(--mdc-text-field-label-ink-color, rgba(0, 0, 0, 0.6));
      font-family: var(
              --mdc-typography-caption-font-family,
              var(--mdc-typography-font-family, Roboto, sans-serif)
      );
      font-size: var(--mdc-typography-caption-font-size, 0.79rem);
      font-weight: var(--mdc-typography-caption-font-weight, 400);
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
    }`];
}
