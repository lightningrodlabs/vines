import { html, css, LitElement } from 'lit';
import { property, state, customElement } from 'lit/decorators.js';
import { localized } from '@lit/localize';
import cytoscape, {ElementDefinition} from 'cytoscape';
import {ActionId} from "@ddd-qc/lit-happ";


/**
 *
 */
@localized()
@customElement("vines-graph")
export class GraphViewer extends LitElement {

  //@property() threadHash!: ActionId;

  @property()
  tree: ElementDefinition[] = [
    { // node a
      data: { id: 'a', name: 'bob'}
    },
    { // node b
      data: { id: 'b', name: 'michel' }
    },
    { // edge ab
      data: { id: 'ab', source: 'a', target: 'b' }
    }
  ];

  // @ts-ignore
  @state() private _cy?: cytoscape.Core;

  /** */
  override firstUpdated() {
    const container = this.shadowRoot!.getElementById('cy');
    console.log("<vines-graph>.firstUpdated()", container);
    this._cy = cytoscape({
      elements: this.tree,
      container,
      autoungrabify: true,
      style: [ // the stylesheet for the graph
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(name)'
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
        spacingFactor: 2.5,
        avoidOverlap: true,
        //roots: ["a"],



      }
    });
    //this._cy.center()
    //this._cy.fit()
    this._cy.pan({x: 300, y: 20})
  }



  /** */
  override render() {
    console.log("<vines-graph>.render()", this.tree);

    return html`<div id="cy"></div>`;
  }

  /** */
  static override styles = [css`
    :host {
      /*min-height: 300px;*/
      /*min-width: 300px;*/
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
