import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../viewModels/threads.zvm";


/**
 * @element
 */
export class ThreadList extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    console.log("<semantic-topic-list>.ctor()")
  }


  @property()
  currentTopicAh: string = ''


  /** */
  render() {
    console.log("<thread-list> render():", this.currentTopicAh);

    //console.log("label-list:", this.perspective.names)

    let threadsLi = [html`<span>None</span>`];
    if (this.currentTopicAh != "") {
      threadsLi = this.perspective.threadsByTopic[this.currentTopicAh].map(
        (ah) => {
          const pp = this._zvm.getParticipationProtocol(ah);
          return html`
              <li>${pp.purpose}</li>`
        }
      );
    }

    /** render all */
    return html`
        <h3>Topic threads: ${this.currentTopicAh}</h3>
        <ul>${threadsLi}</ul>
    `;

  }

}
