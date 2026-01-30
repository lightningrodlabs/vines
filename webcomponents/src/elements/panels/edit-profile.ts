import {html, css, LitElement} from 'lit';
import {property, state, customElement} from 'lit/decorators.js';
import {localized, msg} from '@lit/localize';

import Input from "@ui5/webcomponents/dist/Input";
import ValueState from "@ui5/webcomponents-base/dist/types/ValueState.js";
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Button.js";

import "@shoelace-style/shoelace/dist/components/avatar/avatar.js"
import "@shoelace-style/shoelace/dist/components/color-picker/color-picker.js"
import "@shoelace-style/shoelace/dist/components/radio/radio.js";
import "@shoelace-style/shoelace/dist/components/radio-group/radio-group.js"

import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm";
import {getRandomHexColor} from "../../utils";


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


/**
 * @element edit-profile
 * @fires save-profile - Fired when the save profile button is clicked
 */
@localized()
@customElement("vines-edit-profile")
export class EditProfile extends LitElement {

  /** The profile to be edited. */
  @property({type: Object})
  profile: ProfileMat | undefined = undefined;

  /** Label for the save profile button. */
  @property({type: String, attribute: 'save-profile-label'})
  saveProfileLabel: string | undefined;

  @property()
  avatarMode: string = "optional";

  @property({type: Boolean})
  allowCancel = false;

  @state() private _avatar: string | undefined;


  // @query('#nickname-field')
  // private _nicknameField!: Input;
  //
  // @query('#avatar-file-picker')
  // private _avatarFilePicker!: HTMLInputElement;

  get nicknameField(): Input {
    return this.shadowRoot!.getElementById("nickname-field") as Input;
  }

  get avatarFilePicker(): HTMLInputElement {
    return this.shadowRoot!.getElementById("avatar-file-picker") as HTMLInputElement;
  }

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
  async onKeyUp(e: any) {
    console.log("<edit-profile>.onKeyUp()", e.keyCode);
    if (e.keyCode === 13 && this.shouldSaveButtonBeEnabled()) {
      e.stopPropagation();
      this.fireSaveProfile();
    }
    // Update button state
    if (this.nicknameField && this.nicknameField.value.length <= 2) { this.requestUpdate(); }
  }


  /** */
  override firstUpdated() {
    //console.log("<edit-profile>.firstUpdated()");
    this._avatar = this.profile?.fields["avatar"];
    this.requestUpdate(); // Needed since nickname field not ready on first update for checking if we can enable the save button.
  }


  /** */
  onAvatarUploaded() {
    if (this.avatarFilePicker.files && this.avatarFilePicker.files[0]) {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this._avatar = resizeAndExport(img);
          this.avatarFilePicker.value = '';
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(this.avatarFilePicker.files[0]);
    }
  }


  /** */
  renderAvatarPicker() {
    return html`
      <div style="height: 80px; justify-content: center;" class="row">
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
                    @click=${() => this.avatarFilePicker.click()}
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
    if (!this.nicknameField || !this.nicknameField.value) {
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
    console.log("<edit-profile>.fireSaveProfile()");
    if (!this.nicknameField.value) {
      this.nicknameField.valueState = ValueState.Error;
      return;
    }
    const nickname = this.nicknameField.value.trim();
    const regex = new RegExp(`^["a-zA-Z0-9-_ "]+$`);
    const isValid = regex.test(nickname);
    if (!isValid) {
      this.nicknameField.valueState = ValueState.Error;
      const errorMsg = this.shadowRoot!.getElementById("errorMsg") as HTMLElement;
      errorMsg.textContent = msg("Bad characters");
      return;
    }
    const fields: Record<string, string> = this.getAdditionalFieldsValues();

    console.log("<edit-profile>fireSaveProfile()", fields);

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


    /** Timezone */
    const timezonePicker = this.shadowRoot!.getElementById("timezonePicker") as any;
    console.log({timezonePicker});
    fields['timezone'] = timezonePicker.value? timezonePicker.value : 'UTC';


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
    this.dispatchEvent(new CustomEvent<string>('lang-selected', {detail: lang, bubbles: true, composed: true}));
  }


  /** */
  override render() {
    console.log("<vines-edit-profile>.render()", this.profile);

    return html`
      <input type="file"
               id="avatar-file-picker"
               style="display: none;"
               @change=${this.onAvatarUploaded} />

      <div class="column">
        <!-- Use row-reverse so input field is focused first -->  
        <div class="row" style="flex-direction: row-reverse;" >
          <ui5-input id="nickname-field" outlined required
                     .maxlength=${32}
                     .label=${msg('Nickname')}
                     .value=${this.profile?.nickname || ''}
                     style="margin-left: 8px;"
                     @input=${(_e: any) => {
                          if (this.nicknameField.value.length > 0) {
                            this.nicknameField.valueState = ValueState.None;
                          } else {
                            this.nicknameField.valueState = ValueState.Error;
                          }
                        }}>
                  <div id="errorMsg" slot="valueStateMessage">${msg("Minimum 1 character")}</div>                  
          </ui5-input>
          ${this.renderAvatarPicker()}
        </div>

        <div class="row" style="margin-bottom: 18px; align-items: center;">
              <span style="font-size:18px;padding-right:10px;padding-top:5px;">${msg('Color')}:</span>
              <sl-color-picker id="colorPicker" hoist slot="meta" size="small" noFormatToggle format="hex"
                               .value=${this.profile && this.profile.fields['color']? this.profile.fields['color'] : getRandomHexColor()}></sl-color-picker>
        </div>

        <div class="row">
            <span style="font-size:18px;padding-right:10px;">${msg('Language')}:</span>
            <sl-radio-group id="langRadioGroup" @click=${this.handleLangChange} .value=${this.profile && this.profile.fields['lang']? this.profile.fields['lang'] : "en"}>
              <sl-radio value="en">🇬🇧</sl-radio>
              <sl-radio value="fr-fr">🇫🇷</sl-radio>
            </sl-radio-group>
        </div>

          <timezone-picker id="timezonePicker"></timezone-picker>
      </div>
      
      <div slot="footer" style="display:flex; margin-top: 10px;">
        <ui5-button style="flex:1; margin-right:6px; margin-top:15px;"
                  design="Emphasized"
                  ?disabled=${!this.shouldSaveButtonBeEnabled()}
                  @click=${() => this.fireSaveProfile()}>
          ${msg("Save Profile")}
        </ui5-button>          
        ${this.allowCancel
              ? html`
                      <ui5-button
                        style="flex:1; margin-top:15px;"
                        @click=${() => this.fireCancel()}>
                          ${msg("Cancel")}
                      </ui5-button>
              ` : html``
            }
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
      justify-content: center; 
      margin-bottom: 8px; 
      align-self: start;
      gap: 5px;
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
