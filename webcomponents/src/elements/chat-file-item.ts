import {css, html} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {delay, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ActionHashB64, encodeHashToBase64} from "@holochain/client";
import {consume} from "@lit/context";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {getInitials, Profile as ProfileMat} from "@ddd-qc/profiles-dvm";
import {globaFilesContext} from "../contexts";
import {FileHashB64, FilesDvm, FileType, kind2Type, prettyFileSize} from "@ddd-qc/files";
import {type2ui5Icon} from "../utils";

/**
 * @element
 */
@customElement("chat-file-item")
export class ChatFileItem extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** -- Properties -- */

  /** Hash of File bead to display */
  @property() hash: ActionHashB64 = '' // BeadAh
  @state() private _dataHash?: FileHashB64;

  @consume({ context: globaFilesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @state() private _isHovered = false;


  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    //console.log("<chat-message-item>.dvmUpdated()");
    if (oldDvm) {
      //console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    //console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
  }


  /** */
  onClickComment(maybeCommentThread: ActionHashB64 | null, subjectName?: string) {
    this.dispatchEvent(new CustomEvent('commenting-clicked', {
      detail: {maybeCommentThread, subjectHash: this.hash, subjectType: "TextMessage", subjectName},
      bubbles: true,
      composed: true,
    }));
  }


  /** */
  render() {
    console.log("<chat-file-item>.render()", this.hash, this._dataHash);
    if (this.hash == "") {
      return html`
          <div>No message found</div>`;
    }

    const entryBeadInfo = this.threadsPerspective.entryBeads[this.hash];
    if (!entryBeadInfo) {
      // FIXME Spinner
      return html `<div>Loading ...</div>`;
    }
    const manifestEh = encodeHashToBase64(entryBeadInfo.entryBead.eh);
    const fileTuple = this._filesDvm.deliveryZvm.perspective.publicParcels[manifestEh];
    if (!fileTuple) {
      /** auto refresh since we can't observe filesDvm */
      delay(100).then(() => {this.requestUpdate()});
      return html `<ui5-busy-indicator size="Large" active style="margin:auto; width:50%; height:50%;"></ui5-busy-indicator>`;
    }
    const fileDesc = fileTuple[0];
    const fileAuthor = fileTuple[2];

    /** Make sure it's an image file from Files */
    // FIXME

    /** Determine the comment button to display depending on current comments for this message */
    const maybeCommentThread = this._dvm.threadsZvm.getCommentThreadForSubject(this.hash);
    const isUnread = maybeCommentThread? this.threadsPerspective.unreadThreads.includes(maybeCommentThread) : false;

    let commentButton = html``;
    if (isUnread) {
      commentButton = html`<ui5-button icon="comment" tooltip="View Comment Thread" design="Negative" style="border:none;" @click="${(e) => this.onClickComment(maybeCommentThread, fileDesc.name)}"></ui5-button>`;
    } else {
      if (this._isHovered) {
        console.log("threadButton", fileDesc.name);
        if (!maybeCommentThread) {
          commentButton = html`
              <ui5-button icon="sys-add" tooltip="Create Comment Thread" design="Transparent" style="border:none;"
                          @click="${(e) => this.onClickComment(maybeCommentThread, fileDesc.name)}"></ui5-button>`;
        } else {
          commentButton = html`
              <ui5-button icon="comment" tooltip="View Comment Thread" design="Transparent" style="border:none;"
                          @click="${(e) => this.onClickComment(maybeCommentThread, fileDesc.name)}"></ui5-button>`;
        }
      }
    }

    // /** Determine the unread badge to display depending on current comments for this message */
    // let unreadBadge = html``;
    // if (isUnread) {
    //   unreadBadge = html`
    //           <ui5-badge color-scheme="3" style="margin-left:5px; margin-top:2px;">
    //               <ui5-icon name="email" slot="icon" style="color:brown;"></ui5-icon>
    //           </ui5-badge>`;
    // }

    const date = new Date(entryBeadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
    const date_str = date.toLocaleString('en-US', {hour12: false});

    let agent = {nickname: "unknown", fields: {}} as ProfileMat;

      const maybeAgent = this._dvm.profilesZvm.perspective.profiles[fileAuthor];
      if (maybeAgent) {
        agent = maybeAgent;
      } else {
        console.log("Profile not found for agent", fileAuthor, this._dvm.profilesZvm.perspective.profiles)
        this._dvm.profilesZvm.probeProfile(fileAuthor)
        //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
      }

    const initials = getInitials(agent.nickname);
    const avatarUrl = agent.fields['avatar'];

    const id = "chat-item__" + this.hash;

    const txt = `${fileDesc.name} (${prettyFileSize(fileDesc.size)})`
    const fileType = kind2Type(fileDesc.kind_info);

    //let item =html`<ui5-busy-indicator size="Medium" active style="margin:10px; /*width:50%; height:50%;*/"></ui5-busy-indicator>`;
    let item = html`
        <ui5-list id="fileList">
          <ui5-li id="fileLi" icon=${type2ui5Icon(fileType)} description=${prettyFileSize(fileDesc.size)}
                  @click=${(e) => this._filesDvm.downloadFile(encodeHashToBase64(entryBeadInfo.entryBead.eh))}>
            ${fileDesc.name}
          </ui5-li>
        </ui5-list>`;
    let maybeCachedData = undefined;
    if (fileType == FileType.Image) {
      maybeCachedData = null;
      if (!this._dataHash) {
        console.log("File is image, dataHash not known");
        this._filesDvm.getFile(manifestEh).then(([manifest, data]) => {
          console.log("File is image, manifest", manifest.description.name, manifest.data_hash);
          const file = this._filesDvm.data2File(manifest, data);
          this._filesDvm.cacheFile(file);
          this._dataHash = manifest.data_hash;
          //this.requestUpdate();
        });
      } else {
        maybeCachedData = this._filesDvm.getFileFromCache(this._dataHash);
        if (!maybeCachedData) {
          console.warn("File cache not found", this._dataHash);
        }
      }
      if (maybeCachedData) {
        item = html`<img class="thumb" src=${"data:image/png;base64," + maybeCachedData}
                         @click=${(e) => this._filesDvm.downloadFile(encodeHashToBase64(entryBeadInfo.entryBead.eh))}
        >`;
      }
    }

    /** render all */
    return html`
        <div id=${id} class="chatItem" @mouseenter=${(e) => this._isHovered = true} @mouseleave=${(e) => this._isHovered = false}>
            ${avatarUrl? html`
                      <ui5-avatar class="chatAvatar" style="box-shadow: 1px 1px 1px 1px rgba(130, 122, 122, 0.88)">
                          <img src=${avatarUrl}>
                      </ui5-avatar>                   
                          ` : html`
                        <ui5-avatar class="chatAvatar" shape="Circle" initials=${initials} color-scheme="Accent2"></ui5-avatar>
                  `}
            <div style="display: flex; flex-direction: column">
                <div>
                    <abbr title=${fileAuthor}><span><b>${agent.nickname}</b></span></abbr>
                    <span class="chatDate"> ${date_str}</span>
                </div>
              ${item}
            </div>
            ${commentButton}
        </div>
    `;

  }

  /** */
  static get styles() {
    return [
      css`
        #fileList {
          min-width: 350px;
          border: 1px solid #282727;
          border-radius: 3px;
          margin: 10px 5px 10px 5px;
        }

        #fileLi {
          background: rgb(230, 237, 249);
        }        
        
        .chatItem {
          display: flex;
          flex-direction: row;
          min-height: 55px;
          margin: 5px 5px 10px 5px;
        }

        .chatAvatar {
          margin-right: 5px;
          min-width: 48px;
        }

        .chatDate {
          margin: 0px 0px 0px 5px;
          font-size: smaller;
          color: gray;
        }

        .chatMsg {
          margin: 5px 5px 5px 5px;
        }
        
        .thumb {
          max-width: 50%;
          cursor: pointer;
          margin: 10px; 
        }
      `,];
  }
}
