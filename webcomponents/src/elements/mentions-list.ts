import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

import {ThreadsZvm} from "../viewModels/threads.zvm";



/**
 * @element
 */
@customElement("mentions-list")
export class MentionsList extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }


  /** -- Methods -- */

  /** */
  render() {
    console.log("<mentions-list>.render()");
    if (this.perspective.mentions.length == 0) {
      return html `<div style="color:#c10a0a">No mentions found</div>`;
    }

    let textLi = Object.values(this.perspective.mentions).map(
      ([linkAh, _author, beadAh]) => {
        return html`<chat-message-item hash="${beadAh}"></chat-message-item>`;
      }
    );



    const title = `Mentions`;
    /** render all */
    return html`
        <h4 style="margin-left: 5px;">${title}</h4>
        ${textLi}
    `;
  }

}
