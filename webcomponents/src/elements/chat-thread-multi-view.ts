import {css, html, PropertyValues} from "lit";
import {consume} from "@lit/context";
import {property, state, customElement} from "lit/decorators.js";
import {ActionId, ActionIdMap, AgentId, DnaId, DnaMultiElement, intoLinkableId} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
//import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {BeadLink} from "../bindings/threads.types";
import {msg} from "@lit/localize";
import {ts2day} from "../render";
import {onlineLoadedContext} from "../contexts";
import {Thread} from "../viewModels/thread";
import {sharedStyles} from "../styles";


/**
 * @element
 */
@customElement("chat-thread-multi-view")
export class ChatThreadMultiView extends DnaMultiElement<ThreadsDvm> {
  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    this.addEventListener('scroll', this.onWheel);
  }


  /** -- Properties -- */

  /** Hash of agent to display */
  @property() agent!: AgentId;
  /** Hash of bead to focus */
  @property() beadAh?: ActionId;


  /** -- */

  get threads(): [DnaId, ActionId][] {
    const threads: [DnaId, ActionId][] = [];
    for (const dvm of this._dvms.values()) {
      //console.log("<chat-thread-multi-view> dvm", dvm.cell.address.dnaId);
      const ppAh = dvm.threadsZvm.perspective.dmAgents.get(this.agent);
      if (ppAh) {
        threads.push([dvm.cell.address.dnaId, ppAh]);
      }
    }
    return threads;
  }


  // /** Observed perspective from zvm */
  // @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  // threadsPerspective!: ThreadsPerspective;


  @consume({ context: onlineLoadedContext, subscribe: true })
  onlineLoaded!: boolean;


  /** -- State variables -- */

  @state() _loading = true;


  /** -- Methods -- */

  /** In dvmUpdated() this._dvm is not already set */
  protected override async dvmUpdated(_cellAddress: DnaId, newDvm: ThreadsDvm, _oldDvm?: ThreadsDvm): Promise<void> {
    //console.debug("<chat-thread-multi-view>.dvmUpdated()", cellAddress.b64, newDvm.threadsZvm.cell.address.dnaId.b64);
    /** Subscribe to ThreadsZvm */
    // if (oldDvm) {
    //   oldDvm.threadsZvm.unsubscribe(this);
    // }
    // newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    /** */
    await this.loadlatestMessages(newDvm);
  }


  /** Don't update during loading of beads */
  override shouldUpdate(changedProperties: PropertyValues<this>) {
    console.log("<chat-thread-multi-view>.shouldUpdate()", changedProperties, this._loading);
    const shouldnt = !super.shouldUpdate(changedProperties);
    if (shouldnt) {
      return false;
    }
    if (changedProperties.has("_loading")) {
      return true;
    }
    return !this._loading;
  }


  /** */
  protected override async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    /** Fetch notifSetting for current thread */
    if (changedProperties.has("agent")) {
      for (const dvm of this._dvms.values()) {
        const ppAh = dvm.threadsZvm.perspective.dmAgents.get(this.agent);
        if (!ppAh) {
          continue;
        }
        this.loadlatestMessages(dvm);
        if (!dvm.threadsZvm.perspective.notifSettings.get(ppAh)) {
          await dvm.threadsZvm.pullNotifSettings(ppAh);
        }
      }
    }
  }


  /** */
  protected override async updated(_changedProperties: PropertyValues) {
    /** Scroll the list container to the requested bead */
    if (this.beadAh) {
      console.log("<chat-threaded-view>.updated()", this.beadAh)
      const beadItem = this.shadowRoot!.getElementById(`${this.beadAh.b64}`);
      if (beadItem) {
        const scrollY = beadItem.offsetTop - this.offsetTop;
        this.scrollTo({ top: scrollY, behavior: 'smooth' });
      }
    }
    /** Set background according to load state */
    if (this._loading)  {
      this.style.background = "#ececec";
    } else {
      this.style.background = "#FBFCFD";
    }
  }


  /** Check if beads have comments */
  protected async loadBeadComments(bls: BeadLink[], dvm: ThreadsDvm): Promise<void> {
    for (const bl of bls) {
      const pps = await dvm.threadsZvm.pullSubjectThreads(intoLinkableId(bl.beadAh));
      for (const [ppAh, [pp, _ts, _author]] of pps.entries()) {
        if (pp.purpose == "comment") {
          await dvm.threadsZvm.perspective.getAllBeadsOnThread(ppAh);
          break;
        }
      }
    }
  }


  /** */
  protected loadlatestMessages(dvm: ThreadsDvm) {
    console.log("<chat-thread-multi-view>.loadlatestMessages() probe", this.agent, !!dvm);
    if (!this.agent) {
      this._loading = false;
      return;
    }
    const ppAh = dvm.threadsZvm.perspective.dmAgents.get(this.agent);
    if (ppAh) {
      dvm.threadsZvm.pullLatestBeads(ppAh, undefined, undefined, 20)
        .then(async (beadLinks) => {
          this._loading = false;
          await this.loadBeadComments(beadLinks, dvm);
          await dvm.threadsZvm.commitThreadProbeLog(ppAh);
        });
      this._loading = true;
    }
  }


  /** */
  async loadPreviousMessages(dvm: ThreadsDvm): Promise<void> {
    const ppAh = dvm.threadsZvm.perspective.dmAgents.get(this.agent);
    if (!ppAh) {
      return;
    }
    const beginningReached = dvm.threadsZvm.perspective.hasReachedBeginning(ppAh);
    console.log("loadPreviousMessages() beginningReached = ", beginningReached);
    if (beginningReached) {
      return;
    }
    this._loading = true;
    const bls = await dvm.threadsZvm.probePreviousBeads(ppAh, 10);
    this._loading = false;
    await this.loadBeadComments(bls, dvm);
  }


  /** */
  override render() {
    console.log("<chat-thread-multi-view>.render()", this._loading, this.agent, this.beadAh, this._dvms);
    /** */
    if (this.agent === undefined) {
      return html`<div style="margin:auto; color:red;font-weight: bold;font-size: 3rem">${msg("No peer selected")}</div>`;
    }
    if (!this.threads.length) {
      return html`<ui5-busy-indicator delay="50" size="Large" active style="width:100%; height:100%; color:olive"></ui5-busy-indicator>`;
    }

    const [firstDnaId, firstPpAh] = this.threads[0]!;




    /** Merge trees */
    const groupNames: string[] = [];
    const firstDvm: ThreadsDvm = this._dvms.get(firstDnaId)!;
    //const firstThread = firstDvm.threadsZvm.perspective.getParticipationProtocol(firstPpAh)!;
    const firstThread = firstDvm.threadsZvm.perspective.threads.get(firstPpAh)!;
    const mergedThread = new Thread(firstThread.pp, firstDvm.cell.dnaModifiers.origin_time, firstThread.creationTime, firstThread.author);
    console.log("<chat-thread-multi-view> mergedThread start", mergedThread);
    const dnaIdMap: ActionIdMap<DnaId> = new ActionIdMap();
    for (const [dnaId, ppAh] of this.threads) {
      const dvm = this._dvms.get(dnaId)!;
      if (dvm.dnaProperties.groupName) { groupNames.push(dvm.dnaProperties.groupName? dvm.dnaProperties.groupName : "unnamed") }
      const thread = dvm.threadsZvm.perspective.threads.get(ppAh)!;
      console.log("<chat-thread-multi-view> adding ${dnaId}", thread.getAll().length, mergedThread.getAll().length);
      thread.getAll().forEach((blm) => {
        dnaIdMap.set(blm.beadAh, dnaId);
        mergedThread.addItem(blm);
      });
    }
    console.log("<chat-thread-multi-view> mergedThread:");
    mergedThread.print();

    const all = mergedThread.getAll();

    /** Render chat-header */
    let maybeHeader = html``;
    let hasReachedBeginning = true;
    for (const dvm of this._dvms.values()) {
      const ppAh = dvm.threadsZvm.perspective.dmAgents.get(this.agent);
      if (ppAh) {
        hasReachedBeginning &&= dvm.threadsZvm.perspective.hasReachedBeginning(ppAh);
      }
    }
    if (hasReachedBeginning) {

      maybeHeader = html`<chat-header .threadHash=${firstPpAh} .groupNames=${groupNames}></chat-header>`;
    }


    /** render each bead */
    //let passedLog = false;
    let currentDay = "";
    let prevBeadAh: ActionId | undefined = undefined;
    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let chatItems = Object.values(all).map(
      (blm) => {
        let hr = html``;
        // /** 'new' <hr> if bead is older than initial latest ProbeLogTime */
        // const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss.get(this.threadHash);
        // console.log("<chat-thread-view> thread.latestProbeLogTime", initialProbeLogTs, thread.latestProbeLogTime, blm.creationTime, blm.beadAh);
        // if (!passedLog && initialProbeLogTs && blm.creationTime > initialProbeLogTs) {
        //   const beadDateStr = "New" // prettyTimestamp(initialProbeLogTs);
        //   passedLog = true;
        //   hr = html`
        //       <div style="display: flex; flex-direction: row">
        //           <div style="border-top: 2px solid red; flex-grow: 1; height: 0px"></div>
        //           <div style="width: fit-content;background: red;color:white;font-size:small;padding:2px; font-weight:bold;">${beadDateStr}</div>
        //       </div>
        //   `;
        // }

        let timeHr = html``;
        const day = ts2day(blm.creationTime);
        if (day != currentDay) {
          currentDay = day;
          timeHr = html`
            <div style="display: flex; flex-direction: row">
                <hr class="timeHr"/>
                <div style="font-size:small; color: #3e3d3dcc;padding-left: 3px; padding-right:3px;">
                    ${day}
                </div>
                <hr class="timeHr" />
            </div>
        `;
        }

        let chatItem = html`
            <cell-context .cell=${this._dvms.get(dnaIdMap.get(blm.beadAh)!)!.cell}>
              <chat-item id=${blm.beadAh.b64} .hash=${blm.beadAh} .prevBeadAh=${prevBeadAh}
                         style="${this.beadAh && blm.beadAh.equals(this.beadAh) ? "background:#c4f2b07a" : ""}">
              </chat-item>
            </cell-context>
        `;

        prevBeadAh = blm.beadAh;
        /** Render chatItem */
        return html`${chatItem}${hr}${timeHr}`;
      }
    );


    /** render all (in reverse) */
    return html`
      ${chatItems.reverse()}
      ${this._loading? html`<ui5-busy-indicator delay="50" size="Medium" active style="width:100%; height:100%;margin-bottom:20px;margin-top:20px"></ui5-busy-indicator>` : html``}
      ${maybeHeader}
    `;
  }


  /** */
  async onWheel(_event: any) {
    if (this.clientHeight - this.scrollHeight == this.scrollTop) {
      for (const dvm of this._dvms.values()) {
        await this.loadPreviousMessages(dvm);
      }
    }
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          flex:1;
          overflow-y: scroll;
          display: flex;
          flex-direction: column-reverse;
          /*gap:15px;*/
          height: inherit;
          background: #FBFCFD;
          font-family: '72-Light';
        }
      `,
    ];
  }
}
