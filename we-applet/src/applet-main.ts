import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

// import "@holochain-open-dev/elements/dist/elements/display-error.js";
// import "@holochain-open-dev/profiles/dist/elements/agent-avatar.js";
// import "@holochain-open-dev/profiles/dist/elements/profile-prompt.js";
// import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
// import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";
// import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
// import "@shoelace-style/shoelace/dist/components/button/button.js";
// import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";


import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";


import {
  notifyError,
  onSubmit,
  sharedStyles,
} from "@holochain-open-dev/elements";


@localized()
@customElement("applet-main")
export class AppletMain extends LitElement {
  @consume({ context: synContext })
  @property()
  _synStore!: SynStore;


  /** */
  render() {
    return html`
      <div class="column" style="flex: 1; margin: 16px">
        <span class="title">${msg("All Notes")}</span>
        <all-notes style="flex: 1;"></all-notes>
        ${this.renderNewNoteButton()}
      </div>
    `;
  }

  get _newNoteDialog(): SlDialog {
    return this.shadowRoot?.getElementById("new-note-dialog") as SlDialog;
  }


  /** */
  async createNote(title: string) {
    if (this.creatingNote) return;

    this.creatingNote = true;

    try {
      const note = await createNote(this._synStore, title);

      this.dispatchEvent(
        new CustomEvent("note-created", {
          bubbles: true,
          composed: true,
          detail: {
            noteHash: note.entryHash,
          },
        })
      );

      this._newNoteDialog.hide();
      (this.shadowRoot?.getElementById("note-form") as HTMLFormElement).reset();
    } catch (e) {
      console.error(e);
      notifyError(msg("Error creating the note"));
    }
    this.creatingNote = false;
  }


  /** */
  renderNewNoteButton() {
    return html`<sl-button
        variant="primary"
        style="
      margin: 16px;
      position: absolute;
      right: 0;
      bottom: 0;
    "
        @click=${() => this._newNoteDialog.show()}
      >
        ${msg("Create Note")}
      </sl-button>
      <sl-dialog .label=${msg("Create Note")} id="new-note-dialog">
        <form ${onSubmit((f) => this.createNote(f.title))} id="note-form">
          <sl-input name="title" .label=${msg("Title")} required></sl-input>
        </form>

        <sl-button slot="footer" @click=${() => this._newNoteDialog.hide()}>
          ${msg("Cancel")}
        </sl-button>

        <sl-button
          slot="footer"
          variant="primary"
          type="submit"
          form="note-form"
          .loading=${this.creatingNote}
        >
          ${msg("Create")}
        </sl-button>
      </sl-dialog> `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    sharedStyles,
  ];
}
