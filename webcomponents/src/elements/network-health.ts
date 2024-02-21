import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";

import '@weblogin/trendchart-elements';

/**
 * @element
 */
@customElement("network-health")
export class NetworkHealth extends LitElement {



  /** */
  render() {
    console.log("<network-health>.render()");

    return html`
        <div id="pies">
          <div class="item">
            <div class="chart">
                <tc-pie id="peer-pie" tooltip="Peers" values="[4]" shape-size="6" max="10" static=""></tc-pie>
                <ui5-icon class="pie-icon" name="person-placeholder"></ui5-icon>
            </div>
            <div>
              <span>4 / 8</span>
              <br/>
              <span>Peers</span>
            </div>
          </div>
          <div class="item">
              <div class="chart">
                  <tc-pie id="arc-pie" tooltip="Peers" values="[4]" shape-size="6" max="10" static=""></tc-pie>
                  <ui5-icon class="pie-icon" name="cloud"></ui5-icon>
              </div>
              <div>
                <span>220%</span>
                <br/>
                <span>Arc</span>
              </div>
          </div>
        </div>
        <div id="fetch">
          <div class="title">
              <div id="fetch-title">
                <div>415 KB</div>
                <div>Expected data</div>
              </div>
              <ui5-icon name="product" style="height: 1.5rem; width: 1.5rem;"></ui5-icon>
          </div>
          <tc-line values="[26,22,20,24,30,34,18,29,33,41,38,53,32,25,19,28,20,18,19,18,34,12]" min="0">
          </tc-line>
        </div>
    `;

  }


   /** */
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 220px;
        }

        .title {
          display: flex;
          flex-direction: row;
          padding: 8px;
        }
        
        #fetch-title {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        #pies {
          display: flex;
          flex-direction: row;
          gap: 15px;
        }

        .chart {
          width: 3rem;
          height: 3rem;
          box-sizing: border-box;
        }

        .item {
          display: flex;
          flex-direction: row;
          gap: 6px;
        }

        #peer-pie {
          --shape-color: #51A7E1;
          --area-color: #000000;
          --area-opacity: 0.1;
          width: 100%;
          height: 100%;
        }

        #arc-pie {
          --shape-color: #c52f2f;
          --area-color: #000000;
          --area-opacity: 0.1;
          width: 100%;
          height: 100%;
        }

        .pie-icon {
          width: 100%;
          margin-top: -35px;
          margin-bottom: 50px;
        }

        #fetch {
          background: rgb(242, 242, 242);
          border-radius: 15px;
        }
        
        tc-line {
          width: 100%;
        }
      `,

    ];
  }

}
