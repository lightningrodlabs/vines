import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../viewModels/threads.zvm";


/**
 * @element
 */
export class ThreadBeads extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    console.log("<thread-beads>.ctor()")
  }


  @property()
  thread: string = ''


  /** */
  render() {
    console.log("<thread-beads> render():", this.thread);

    let beadsLi = [html`<span>None</span>`];
    // if (this.thread != "") {
    //   beadsLi = this.perspective.threadsByTopic[this.thread].map(
    //     (ah) => {
    //       const pp = this._zvm.getParticipationProtocol(ah);
    //       return html`
    //           <li>${pp.purpose}</li>`
    //     }
    //   );
    // }

    /** render all */
    return html`
        <h3>Thread: ${this.thread}</h3>
        <ul>${beadsLi}</ul>
    `;

  }

}
