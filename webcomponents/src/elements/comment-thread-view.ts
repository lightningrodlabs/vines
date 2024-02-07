import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {parseMentions} from "../utils";

import {ActionHashB64} from "@holochain/client";

/** @ui5/webcomponents(-fiori) */
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Avatar.js"
import "@ui5/webcomponents-fiori/dist/Bar.js";
import List from "@ui5/webcomponents/dist/List"
import "@ui5/webcomponents/dist/List.js"


import "./input-bar";
import {renderAvatar} from "../render";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {WeServices} from "@lightningrodlabs/we-applet";
import {TextBead, ThreadsEntryType} from "../bindings/threads.types";


/**
 * @element
 */
@customElement("comment-thread-view")
export class CommentThreadView extends DnaElement<unknown, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    console.log("<comment-thread-view>.ctor()", this.threadHash)
  }


  /** -- Properties -- */

  /** Hash of Thread to display */
  @property() threadHash: ActionHashB64 = ''
  /** Enable Input bar */
  @property() showInput: boolean = false

  /** Subject info */
  @property() subjectName?: string;
  @property() subjectType?: string;

  // TODO
  // /** View beads in chronological order, otherwise use timeReference as end-time and display older beads only. */
  // @property()
  // startFromBeginning: boolean = false;
  // /** */
  // @property()
  // timeReferenceMs: number = Date.now();
  // /** Number of beads to retrieve per 'get' */
  // @property()
  // batchSize: number = 20


  @consume({ context: weClientContext, subscribe: true })
  weServices: WeServices;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  /** -- State variables -- */

  @state() private _loading = false;


  /** -- Getters -- */

  get listElem() : List {
    return this.shadowRoot.getElementById("textList") as List;
  }


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<comment-thread-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    newDvm.threadsZvm.probeAllBeads(this.threadHash);
  }



  /** FOR DEBUGGING */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    console.log("<comment-thread-view>.shouldUpdate()", changedProperties, this._dvm);
    if (changedProperties.has("_cell_via_context")) {
      this._cell = this._cell_via_context;
    }
    if (!this._dvm) {
      this.requestDvm();
    }
    return !!this._dvm;
  }


  /** */
  protected async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("<comment-thread-view>.loadMessages()", changedProperties, !!this._dvm, this.threadHash);
    if (this._dvm && (changedProperties.has("threadHash") || (false /* WARN might need to check probeAllBeads has been called */))) {
      console.log("<comment-thread-view>.willUpdate()", this.threadHash);
      this._dvm.threadsZvm.probeAllBeads(this.threadHash);
    }
  }


  /** */
  protected updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);
    try {
      const scrollContainer = this.listElem.shadowRoot.children[0].children[0];
      //console.log("<comment-thread-view>.updated() ", scrollContainer)
      console.log("<comment-thread-view>.updated() ", scrollContainer.scrollTop, scrollContainer.scrollHeight, scrollContainer.clientHeight)
      //this.listElem.scrollTo(0, this.listElem.scrollHeight);
      //this.listElem.scroll({top: this.listElem.scrollHeight / 2});
      //this.listElem.scrollIntoView({block: "end"});
      //this.listElem.scrollTop = this.listElem.scrollHeight / 2;
      //this.listElem.scrollTop = this.listElem.scrollHeight;
      //this.listElem.scrollIntoView(false);
    } catch(e) {
      // element not present
    }
  }


  /** */
  onLoadMore() {
    console.log("<comment-thread-view>.onLoadMore()");

    this.listElem.busy = true;
    // FIXME: Probe DHT
    this.listElem.busy = false;
  }


  /** */
  async onCreateComment(inputText: string) {
    const thread = this._dvm.threadsZvm.getThread(this.threadHash);
    if (!thread) {
      console.error("Missing Comment thread");
      return;
    }

    let mentionedAgents = undefined;

    const mentions = parseMentions(inputText);
    mentionedAgents = this._dvm.profilesZvm.findProfiles(mentions);

    const ah = await this._dvm.publishTextMessage(inputText, this.threadHash, mentionedAgents);
    console.log("onCreateComment() ah:", ah);
  }


  /** */
  render() {
    console.log("<comment-thread-view>.render()", this.threadHash, this.showInput, this.subjectName);
    if (this.threadHash == "") {
      return html `<div style="color:#c10a0a; margin:auto; width:50%; height:50%;">No comment thread selected</div>`;
    }
    const thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);
    if (!thread) {
      return html `<div style="color:#c10a0a; margin:auto; width:50%; height:50%;">Thread not found</div>`;
    }

    const bg_color = this._loading? "#ededf0" : ""

    const pp = this._dvm.threadsZvm.getParticipationProtocol(this.threadHash);
    if (!pp) {
      //return html `<div>Loading thread...</div>`;
      return html `
        <ui5-busy-indicator size="Medium" active
                            style="margin:auto; width:50%; height:50%;"
        ></ui5-busy-indicator>
      `;
    }
    // if (pp.subjectType == SEMANTIC_TOPIC_TYPE_NAME) {
    //   const topic = this._dvm.threadsZvm.getSemanticTopic(pp.subjectHash);
    //   if (!topic) {
    //     return html`
    //         <div>Loading thread topic...</div>`;
    //   }
    // } else {
    //
    // }


    const infoPairs = this._dvm.threadsZvm.getAllBeadsOnThread(this.threadHash);

    console.log("<comment-thread-view>.render() len =", infoPairs.length);

    console.log("Has thread some unreads?", thread.hasUnreads());


    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let textLi = Object.values(infoPairs).map(
      ([beadInfo, typedBead]) => {
        console.log("<comment-thread-view> beadInfo", beadInfo);
        if (beadInfo == undefined) {
          return html``;
        }
        const date = new Date(beadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        const date_str = date.toLocaleString('en-US', {hour12: false});

        const isNew = thread.latestProbeLogTime < beadInfo.creationTime;
        console.log("Is msg new?", isNew, thread.latestProbeLogTime, beadInfo.creationTime);


        let content = "<unknown>";
        switch(beadInfo.beadType) {
          case ThreadsEntryType.TextBead:
            content = (typedBead as TextBead).value;
            break;
          case ThreadsEntryType.AnyBead:
            content = "<HRL>"; // FIXME
            break;
          case ThreadsEntryType.EntryBead:
            content = "<File>"; // FIXME
            break;
          default:
            break;
        }

        return html`
            <ui5-li additional-text="${date_str}" style="background: ${isNew? bg_color: '#e6e6e6'};" type="Inactive">
                ${content}
                <div slot="imageContent">                
                  ${renderAvatar(this._dvm.profilesZvm, beadInfo.author, "S")}
                </div>                    
            </ui5-li>`
      }
    );

    /** Different UI if no message found for thread */
    if (infoPairs.length == 0) {
      textLi = [html`
            <ui5-li style="background: ${bg_color};">
                ${this.showInput? "Add first message:" : "No messages found"}                       
            </ui5-li>`]
    }


    //<!--style="height: 400px" growing="Scroll" -->
    //<!-- @load-more=${this.onLoadMore}-->

    const subjectType = this.subjectType? this.subjectType : pp.subject.typeName;
    const subjectName = this.subjectName? this.subjectName : pp.subject.hash;
    const title = `Thread about`;

    let maybeInput = html``;
    if (this.showInput) {
      maybeInput = html`
          <threads-input-bar .topic=${subjectName} .profilesZvm=${this._dvm.profilesZvm}
                              style="border:none;width:100%;"
                              @input=${(e) => {e.preventDefault(); this.onCreateComment(e.detail)}}></threads-input-bar>`
    }

    // <h4 style="margin-left: 5px;"><abbr title="Thread: ${this.threadHash}">${title}</abbr></h4>
    /** render all */
    return html`
        <h4 style="margin-left: 5px;">
          ${title} <span style="font-style: italic; background: #fbfbfb9c; padding:4px;">${subjectName}</span>
          <ui5-button icon="information" design="Transparent" tooltip=${subjectType} @click=${(e) => {
            if (this.weServices) {
              // TODO: Grab HrlWithContext somehow
              //this.weServices.openHrl();
              return;
            }
          }}></ui5-button>
        </h4>
        <ui5-list id="textList" style="background: ${bg_color};height: fit-content">
            ${textLi}
        </ui5-list>
        ${maybeInput}
    `;
  }

}
