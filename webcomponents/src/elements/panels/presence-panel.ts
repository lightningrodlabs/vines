import {html, css, TemplateResult} from 'lit';
import { property, customElement } from 'lit/decorators.js';
import {localized, msg} from '@lit/localize';

import {ActionId, AgentId, DnaElement} from "@ddd-qc/lit-happ";
import {loadProfile, renderAvatar, renderProfileAvatar,} from "../../render";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {ThreadsDnaPerspective, ThreadsDvm} from "../../viewModels/threads.dvm";
import {ShowProfileEvent} from "../../events";


/**
 *
 */
@localized()
@customElement("presence-panel")
export class PresenceePanel extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  @property() hash!: ActionId; // thread's ah

  @property({type: Boolean}) opened: boolean = false;

  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  /** */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
  }


  /** -- Methods -- */

  /** */
  override render() {
    console.log("<presence-panel>.render()", this.hash);

    if (!this.hash) {
      return html``;
    }

    const agents: AgentId[] = [];
    console.log("<presence-panel>.render() agents", agents.length);

    if (agents.length == 0) {
      return html``;
    }

    let all: TemplateResult<1>;
    if (!this.opened) {
      let avatars = agents.map((agent) => renderAvatar(this._dvm.profilesZvm, agent, "XS"))
      let more: TemplateResult<1> = html``;
      if (agents.length > 4) {
        avatars = avatars.slice(0, 4);
        more = html`<span style="font-size: small; color:grey">+${agents.length - 4} ${msg("more")}</span>`;
      }
      /** */
      all = html`
        <div id="small-group" @click=${(_e:any) => this.opened = true}>
            ${avatars}
            <ui5-icon name="group" style="margin-left:3px;"></ui5-icon>
            ${more}
        </div>
      `;
    } else {
      const profiles = agents.map((agent) => {
        const profile = loadProfile(this._dvm.profilesZvm, agent);
        const avatar = renderProfileAvatar(profile, "XS");
        return html`
          <div style="display:flex; flex-direction:row; align-items: center; gap:8px;">
            <div class="avatar"  style="cursor: pointer" @click=${(e:any) => {
                e.stopPropagation(); e.preventDefault();
                this.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {detail: {agentId: agent, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));}}>
                ${avatar}
            </div>
            <div>${profile.nickname}</div>
          </div>
        `;
      });
      /** */
      all = html`
        <div id="big-group">
            <div style="display: flex; flex-direction: row; align-items: center; margin-bottom: 6px;">
                <div>${msg("Who's here")}</div>
                <div style="flex-grow:1"></div>
                <div id="close" @click=${(_e:any) => this.opened = false}>${msg("Close")}</div>
            </div>
            ${profiles}
        </div>
      `;
    }


    /** */
    return html`${all}`;
  }


  /** */
  static override styles = [
    css`
      :host {
        background: white;
        display: flex;
        flex-direction: column;
        border-radius: 10px;
        box-shadow: 0px 15px 25px rgba(0, 0, 0, 0.15);
        max-width: 300px;
      }

      #small-group {
        display: flex;
        flex-direction: row;
        padding: 3px 8px;
        gap: 3px;
        align-items: center;
        cursor: pointer;
      }

      #close:hover {
        cursor: pointer;
        /*text-decoration: underline;*/
        color: rgba(34, 34, 245, 0.98);
      }

      #big-group {
        padding: 3px 8px;        
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin: 10px;
        min-width: 200px;
        min-height: 100px;
      }
      
    `]
}
