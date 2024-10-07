import {css, html} from "lit";
import {state, customElement} from "lit/decorators.js";
import {sharedStyles} from "../../styles";

import Input from "@ui5/webcomponents/dist/Input";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {filesContext, weClientContext} from "../../contexts";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {WAL, weaveUrlFromWal} from "@theweave/api";
import {DnaElement, EntryId} from "@ddd-qc/lit-happ";
import {ThreadsDnaPerspective, ThreadsDvm} from "../../viewModels/threads.dvm";
import {determineSubjectName, weaveUrlToWal, hrl2Id} from "../../utils";
import {ParticipationProtocol, Subject} from "../../bindings/threads.types";
import {FilesDvm} from "@ddd-qc/files";
import {SpecialSubjectType} from "../../events";


/**
 * @element
 */
@customElement("create-thread-panel")
export class CreateThreadPanel extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  /** -- Properties -- */

  @consume({ context: filesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  @consume({ context: weClientContext, subscribe: true })
  weServices?: WeServicesEx;

  @state() private _creating = false;


  /** -- Methods -- */

  /** */
  async onCreate() {
    this._creating = true;
    try {
      const purpose = (this.shadowRoot!.getElementById("purposeInput") as Input).value;
      const wurl = (this.shadowRoot!.getElementById("wurlInput") as Input).value;
      const wal0 = weaveUrlToWal(wurl);
      const [dnaId, dhtId] = hrl2Id(wal0.hrl);
      const attLocInfo = await this.weServices!.assetInfo(wal0);
      const subject: Subject = {
        address: dhtId.b64,
        name: "",
        typeName: SpecialSubjectType.Asset,
        dnaHashB64: dnaId.b64,
        appletId: new EntryId(attLocInfo!.appletHash).b64,
      }
      subject.name = determineSubjectName(subject, this._dvm.threadsZvm, this._filesDvm, this.weServices!);
      console.log("@create event subject name", subject.name);
      const pp: ParticipationProtocol = {
        purpose,
        rules: "N/A",
        subject,
      };
      const [_ts, ppAh] = await this._dvm.threadsZvm.publishParticipationProtocol(pp);
      const wal: WAL = {
        hrl: intoHrl(this._dvm.cell.address.dnaId, ppAh),
        context: pp.subject.address,
      };
      this.dispatchEvent(new CustomEvent<WAL>('create', {detail: wal, bubbles: true, composed: true}))
    } catch(e:any) {
      this.dispatchEvent(new CustomEvent<any>('reject', {detail: e, bubbles: true, composed: true}))
    }
    this._creating = false;
  }


  /** */
  override render() {
    if (this._creating) {
      return html`<ui5-busy-indicator delay="50" size="Large" active style="width:100%; height:100%; color:olive"></ui5-busy-indicator>`;
    }
    /** Render all */
    return html`
      <section>
          <div>
            <ui5-label for="purposeInput" required>${msg("Purpose")}:</ui5-label>
            <ui5-input id="purposeInput" value=${msg('comment')}></ui5-input>
          </div>
          <div>
              <ui5-label for="wurlInput" required>Subject weaveURL:</ui5-label>
              <ui5-input id="wurlInput"></ui5-input>
              <ui5-button icon="add" @click=${async (_e:any) => {
                  const maybeWal = await this.weServices?.userSelectWal();
                  if (!maybeWal) {
                      return;
                  }
                  const input = this.shadowRoot!.getElementById("wurlInput") as Input;
                  input.value = weaveUrlFromWal(maybeWal);
              }}></ui5-button>              
          </div>          
      </section>
      <div slot="footer" class="footer">
        <ui5-button style="margin-top:5px" design="Emphasized" @click=${(_e:any) => this.onCreate()}>
            ${msg("Create")}
        </ui5-button>
        <ui5-button style="margin-top:5px" @click=${(_e:any) => this.dispatchEvent(new CustomEvent('cancel', {detail: null, bubbles: true, composed: true}))}>
            ${msg("Cancel")}
        </ui5-button>
      </div>
    `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          /*background: darkgray;*/
        }
        
        section {
          padding-left: 10px;
          padding-top: 5px;
        }
        
        .footer {
          display: flex;
          gap: 5px;
          margin-left: 10px;
          margin-top: 10px;
        }
      `
    ];
  }
}
