import {css, html} from "lit";
import {property, customElement} from "lit/decorators.js";
import {ActionId, AgentId, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";

/**
 * @element
 */
@customElement("emoji-bar")
export class EmojiBar extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Properties -- */

  /** Hash of bead to display */
  @property() hash!: ActionId;


  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;



  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    if (oldDvm) {
      //console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    //console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
  }



  /** */
  override render() {
    //console.log("<emoji-bar>.override render()", this.hash, this.threadsPerspective.emojiReactions);
    if (!this.hash) {
      return html`
          <div>No item found</div>`;
    }

    const reactions = this.threadsPerspective.emojiReactions.get(this.hash);
    if (!reactions) {
      return html``;
    }
    /** Pair vec into map */
    let emojiMap: Dictionary<AgentId[]> = {}
    for (const [agent, emojis] of reactions) {
      for (const emoji of emojis) {
        if (!emojiMap[emoji]) {
          emojiMap[emoji] = [];
        }
        emojiMap[emoji]!.push(agent);
      }
    }


    /** */
    let emojiButtons = Object.entries(emojiMap).map(([emoji, agents]) => {
      let iReacted = false;
      let tooltip = "" + emoji + " reacted by "
      for (const key of agents) {
        iReacted ||= key.equals(this.cell.address.agentId);
        let profile = {nickname: "unknown", fields: {}} as ProfileMat;
        const maybeAgent = this._dvm.profilesZvm.perspective.getProfile(key);
        if (maybeAgent) {
          profile = maybeAgent;
        }
        tooltip += "" + profile.nickname + ", "
      }
      tooltip = tooltip.substring(0, tooltip.length - 2);
      return html`
        <sl-tooltip content=${tooltip} placement="top">
          <button class=${iReacted? "reacted" : ""} tooltip=${tooltip} @click=${(_e:any) => this.onClickEmoji(emoji, iReacted)}>
            ${emoji} ${agents.length > 1? agents.length : ""}
          </button>
        </sl-tooltip>
      `;
    });
    //<div class="chatItem" @mouseenter=${(e:any) => this._isHovered = true} @mouseleave=${(e:any) => this._isHovered = false}>


    /** render all */
    return html`
        <div style="display:flex; flex-direction:row; gap:5px;">
            ${emojiButtons}
        </div>
    `;

  }


  /** */
  async onClickEmoji(emoji: string, iReacted: boolean) {
    console.log("onClickEmoji()", emoji, iReacted);
    if (iReacted) {
      await this._dvm.unpublishEmoji(this.hash, emoji);
    } else {
      await this._dvm.publishEmoji(this.hash, emoji);
    }
  }


  /** */
  static override get styles() {
    return [
      css`
        sl-tooltip {
          --show-delay: 500;
        }
        .reacted {
          border: 1px solid #525253;
          border-radius: 5px;
        }
      `,];
  }
}
