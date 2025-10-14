import {LitElement, html, css} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {sharedStyles} from "../../styles";
import {allTimezones, formatTimezone} from "./utils";

/**
 *
 * @fires timezone-changed - Fires when a timezone is selected with the selected timezone as detail
 */
@customElement('timezone-picker')
export class TimezonePicker extends LitElement {


  @property({type: String})
  label = 'Timezone';

  @property({type: String})
  value = '';

  @property({type: Boolean})
  required = false;

  @property({type: Array})
  popularTimezones = [
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
    'Pacific/Auckland'
  ];

  @state() private _timezones: string[] = [];

  constructor() {
    super();
    this._timezones = this._getTimezones();
  }


  /**
   *
   */
  override connectedCallback() {
    super.connectedCallback();
    // If no value is set, default to the local timezone
    if (!this.value) {
      try {
        this.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (e) {
        // Fallback if browser doesn't support this
        this.value = 'UTC';
      }
    }
  }


  /**
   * Get the list of all available timezones
   */
  private _getTimezones(): string[] {
    return allTimezones;
  }


  /**
   * Handle timezone selection change
   */
  private _handleChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.value = select.value;

    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('timezone-changed', {
      detail: this.value,
      bubbles: true,
      composed: true
    }));
  }


  /**
   *
   */
  override render() {
    return html`
      <div class="container">
        <label for="timezone-select">${this.label}:</label>
        <select 
          id="timezone-select"
          @change=${this._handleChange}
          ?required=${this.required}
        >
          <optgroup label="Popular Timezones">
            ${this.popularTimezones.map(tz => html`
              <option .value=${tz} ?selected=${tz === this.value}>
                ${formatTimezone(tz, true)}
              </option>
            `)}
          </optgroup>
          <optgroup label="All Timezones">
            ${this._timezones.map(tz => html`
              <option 
                .value=${tz} 
                ?selected=${tz === this.value && !this.popularTimezones.includes(tz)}
              >
                ${formatTimezone(tz, true)}
              </option>
            `)}
          </optgroup>
        </select>
      </div>
    `;
  }


  /**
   *
   */
  static override get styles() {
    return [
      sharedStyles, css`
    :host {
      display: block;
    }
    
    .container {
      max-width: 400px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 18px;
      /*font-weight: bold;*/
    }
    
    select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: white;
      font-size: 16px;
      height: 40px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;

    }
    
    select:focus {
      outline: none;
      border-color: #0077cc;
      box-shadow: 0 0 0 2px rgba(0, 119, 204, 0.2);
    }
    
    .group-header {
      font-weight: bold;
      color: #555;
    }
  `]
  }

}
