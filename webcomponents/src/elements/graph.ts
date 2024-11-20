import { html, css } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import { localized } from '@lit/localize';
import cytoscape, {ElementDefinition} from 'cytoscape';
import {ActionId, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {BeadMat} from "../viewModels/threads.materialize";
import {Timestamp} from "@holochain/client";


/**
 *
 */
@localized()
@customElement("vines-graph")
export class GraphViewer extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  @property() threadHash!: ActionId;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  /** In dvmUpdated() this._dvm is not already set */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.debug("<chat-thread-view>.dvmUpdated()");
    /** Subscribe to ThreadsZvm */
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
  }


  /** */
  toCytoscape(startTs?: Timestamp): ElementDefinition[] {
    const thread = this.threadsPerspective.threads.get(this.threadHash);
    if (!thread) {
      return [];
    }
    let elements: ElementDefinition[] = [];
    const rootNode = {data: { id: this.threadHash.b64, ts: thread.creationTime, label: thread.title, author: thread.author.b64, type: 'Thread'}};
    elements.push(rootNode);

    thread.beadLinksTree.forEach(
      (_k, blm) => {
        const typedBead = this.threadsPerspective.getBead(blm.beadAh);
        if (typedBead) {
          const value = (typedBead as any).value? (typedBead as any).value as string : "<entry>";
          const str = value.substring(0, 32) + (value.length > 32 ? '...' : '');
          const bead = (typedBead as any).bead as BeadMat;
          const node = {data: {id: blm.beadAh.b64, ts: blm.beadType, type: blm.beadType, label: str}};
          elements.push(node);
          const edge = {data: {source: bead.prevBeadAh.b64, target: blm.beadAh.b64}};
          elements.push(edge);
        }
      },
      startTs? startTs : 0);
    /** */
    return elements;
  }


  /** */
  //override firstUpdated() {
  override updated() {
    const container = this.shadowRoot!.getElementById('cy');
    console.log("<vines-graph>.updated()", !!container);
    /** default tree */
    let elements: ElementDefinition[] = [
      { // node a
        data: { id: 'a', name: 'bob'}
      },
      { // node b
        data: { id: 'b', name: 'michel' }
      },
      { // edge ab
        data: { /*id: 'ab',*/ source: 'a', target: 'b' }
      }
    ];

    /** Thread tree */
    if (this.threadHash) {
        elements = this.toCytoscape();
      console.log("<vines-graph>.updated() elements", elements.length);
    }

    /** */
    const cy = cytoscape({
      elements,
      container,
      autoungrabify: true,
      style: [ // the stylesheet for the graph
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(label)'
          }
        },

        {
          selector: 'edge',
          style: {
            'width': 3,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        }
      ],

      layout: {
        name: 'breadthfirst',
        fit: true,
        directed: true,
        //padding: 200,
        circle: false,
        grid: false,
        spacingFactor: 1.2,
        avoidOverlap: true,
        //roots: ["a"],
      }
    });
    //this._cy.center()
    //this._cy.fit()
    cy.pan({x: 300, y: 20})
  }



  /** */
  override render() {
    console.log("<vines-graph>.render()", this.threadHash);
    return html`<div id="cy"></div>`;
  }


  /** */
  static override styles = [css`
    :host {
      /*min-height: 300px;*/
      min-width: 300px;
      width: 100%;
      /*height: 100%;*/
      display: block;
    }
    #cy {
      /*padding: 20px;*/
      width: 100%;
      height: 100%;
      display: block;
    }
  `]
}
