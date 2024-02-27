import {css, html} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionHashB64} from "@holochain/client";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "../viewModels/threads.zvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {Dictionary} from "@ddd-qc/cell-proxy";
import {CommentRequest} from "../utils";
import {msg} from "@lit/localize";
import {toasty} from "../toast";
import {threadJumpEvent} from "../jump";

import Tree from "@ui5/webcomponents/dist/Tree";

/**
 *
 */
@customElement("semantic-topics-view")
export class SemanticTopicsView extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
  }

  @property() showArchivedTopics?: string;

  @state() private _isHovered: Dictionary<boolean> = {};


  // @state() private _itemLinks: ItemLink[];
  //
  //
  //
  // /** */
  // async scanRoot() {
  //   console.log("<semantic-topics-view>.scanRoot()");
  //   this._itemLinks = await this._zvm.zomeProxy.getLeafAnchors(ROOT_ANCHOR_SEMANTIC_TOPICS);
  // }


  /** */
  async toggleTreeItem(event:any) {
    // const busyIndicator = this.shadowRoot.getElementById("busy") as any; // Tree
    // let rootItem = event.detail.item /* as TreeItem */; // get the node that is toggled
    // console.log("toggleRootTreeItem()", rootItem.id, rootItem.getAttribute("anchor"))
    //
    // /* Handle AnchorBranch */
    // if (rootItem.id.length > 8 && rootItem.id.substring(0, 8) === "anchor__") {
    //   if (rootItem.expanded) {
    //     return;
    //   }
    //   event.preventDefault(); // do not let the toggle button switch yet
    //
    //   let itemTexts = [];
    //   for (const item of rootItem.items) {
    //     itemTexts.push(item.text);
    //   }
    //   busyIndicator.active = true; // block the tree from the user
    //
    //   const tas = await this._zvm.getAllSubAnchors(rootItem.getAttribute("anchor"));
    //   console.log({tas})
    //
    //   /** Handle LeafAnchor */
    //   if (tas.length == 0) {
    //     const linkKeys = Object.keys(ThreadsLinkTypeType);
    //     let itemHashs = [];
    //     for (const item of rootItem.items) {
    //       itemHashs.push(item.id);
    //     }
    //
    //     const leafLinks = await this._zvm.zomeProxy.getAllLeafLinksFromAnchor(rootItem.getAttribute("anchor"));
    //
    //     console.log({leafLinks})
    //     for (const leafLink of leafLinks) {
    //       const tag = new TextDecoder().decode(new Uint8Array(leafLink.tag));
    //       const hash = encodeHashToBase64(new Uint8Array(leafLink.target));
    //
    //       if (itemHashs.includes(hash)) {
    //         continue;
    //       }
    //       var newItem = document.createElement("ui5-tree-item") as any; // TreeItem
    //       newItem.text = hash;
    //       newItem.additionalText = tag? linkKeys[leafLink.index] + " | " + tag : linkKeys[leafLink.index];
    //       newItem.setAttribute("anchor", rootItem.anchor);
    //       newItem.id = hash;
    //       newItem.level = rootItem.level + 1;
    //       rootItem.appendChild(newItem); // add the newly fetched node to the tree
    //     }
    //   }
    //
    //   /** Handle BranchAnchor */
    //   for (const ta of tas) {
    //     const leafComponent = anchorLeaf(ta.anchor);
    //     /* Skip if item already exists */
    //     if (itemTexts.includes(leafComponent)) {
    //       continue;
    //     }
    //     let newItem = document.createElement("ui5-tree-item") as any; // TreeItem
    //     newItem.text = leafComponent;
    //     newItem.additionalText = ta.anchor;
    //     newItem.setAttribute("anchor", ta.anchor);
    //     newItem.id = "anchor__" + ta.anchor;
    //     newItem.hasChildren = true;
    //     newItem.level = rootItem.level + 1;
    //     rootItem.appendChild(newItem); // add the newly fetched node to the tree
    //   }
    //
    //   rootItem.toggle(); // now manually switch the toggle button
    //   busyIndicator.active = false; // unblock the tree
    //
    // }
  }



  /** */
  async clickTree(event) {
    //console.log("<semantic-topics-view> click event:", event.detail.item)

    // clear selection?
    const tree = this.shadowRoot.getElementById("semTree") as Tree;
    const items = tree.getItems();
    for (const item of items) {
      item.selected = false;
    }

    if (event.detail.item.level == 2) {
      await this.updateComplete;
      this.dispatchEvent(threadJumpEvent(event.detail.item.id));
    }

  }


  /** */
  onClickCommentPp(maybeCommentThread: ActionHashB64 | null, ppAh: ActionHashB64, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash: ppAh, subjectType: "ParticipationProtocol", subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }

  /** */
  onClickCommentTopic(maybeCommentThread: ActionHashB64 | null, ah: ActionHashB64, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', { detail: {maybeCommentThread, subjectHash: ah, subjectType: "SemanticTopic", subjectName, viewType: "side"}, bubbles: true, composed: true }));
  }



  /** */
  render() {
    console.log("<semantic-topics-view>.render()");

    // if (!this._leafLinks) {
    //   return html`Loading...`;
    // }

    let treeItems = Object.entries(this.perspective.allSemanticTopics).map(([topicHash, [title, isHidden]]) => {
      /** Skip if hidden */
      if (isHidden && !this.showArchivedTopics) {
        return;
      }
      /** Render threads for Topic */
      let topicThreads = this.perspective.threadsPerSubject[topicHash];
      if (!topicThreads) {
        topicThreads = [];
      }
      topicThreads = topicThreads.sort((a, b) => {
        const nameA = this.perspective.threads.get(a).name;
        const nameB = this.perspective.threads.get(b).name;
        return nameA.localeCompare(nameB);
      });
      //console.log("<semantic-topics-view>.render() topic:", title, topicThreads);

      let threads = [html``];
      threads = Object.values(topicThreads).map((ppAh)=> {
        const thread = this.perspective.threads.get(ppAh);
        if (!thread) {
          return html``;
        }
        //const hasNewBeads = thread && thread.hasUnreads();
        const maybeUnreadThread = this.perspective.unreadThreads[ppAh];
        const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
        //console.log("hasUnreads() thread", ppAh, thread.latestSearchLogTime);
        const threadIsNew = Object.keys(this.perspective.newThreads).includes(ppAh);
        console.log("<semantic-topics-view>.render() thread:", thread.pp.purpose, maybeUnreadThread);
        if (!thread.pp || (thread.isHidden && !this.showArchivedTopics) || thread.pp.purpose == "comment") {
          return html``;
        }

        /** Determine badge & buttons */
        const maybeCommentThread: ActionHashB64 | null = this._zvm.getCommentThreadForSubject(ppAh);
        let hasUnreadComments = false;
        if (maybeCommentThread != null) {
          hasUnreadComments = Object.keys(this._zvm.perspective.unreadThreads).includes(maybeCommentThread);
        }
        //console.log("<semantic-topics-view> maybeCommentThread", maybeCommentThread, hasUnreadComments);

        let commentButton = html``;
        if (hasUnreadComments) {
          commentButton = html`<ui5-button icon="comment" tooltip="View Thread" 
                                           design="Negative" class=${this._isHovered[ppAh]? "" : "transBtn"}
                                           @click="${(e) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`;
        } else {
          if (this._isHovered[ppAh]) {
            commentButton = maybeCommentThread != null
              ? html`
                        <ui5-button icon="comment" tooltip="View Thread" design="Transparent"
                                    style="border:none;"
                                    @click="${(e) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`
              : html`
                        <ui5-button icon="sys-add" tooltip="Create new Thread" design="Transparent"
                                    style="border:none;"
                                    @click="${(e) => this.onClickCommentPp(maybeCommentThread, ppAh, thread.pp.purpose)}"></ui5-button>`;
          }
        }

        /** 'new', 'notif' or 'unread' badge to display */
        let badge = html``;
        if (threadIsNew) {
          badge = html`<ui5-badge class="notifBadge">New</ui5-badge>`;
        } else {
          let notifCount = this._zvm.getPpNotifs(ppAh).length;
          if (notifCount > 0) {
            badge = html`<ui5-badge class="notifBadge">${notifCount}</ui5-badge>`;
          } else {
            if (hasNewBeads) {
              badge = html`<ui5-badge class="unreadBadge">${maybeUnreadThread[1].length}</ui5-badge>`;
            }
          }
        }

        let hideShowBtn = html``;
        if (this._isHovered[ppAh]) {
        hideShowBtn = this.showArchivedTopics && thread.isHidden?
            html`
            <ui5-button icon="show" tooltip="Show" design="Transparent"
                        style="border:none; padding:0px" 
                        @click=${async (e) => {
                          await this._zvm.unhideSubject(ppAh);
                          toasty(`Unarchived Subject "${thread.pp.purpose}"`);
            }}></ui5-button>
                  ` : html`
            <ui5-button icon="hide" tooltip="Hide" design="Transparent"
                        style="border:none; padding:0px" 
                        @click=${async (e) => {
                          await this._zvm.hideSubject(ppAh);
                          toasty(`Archived Subject "${thread.pp.purpose}`);
          }}></ui5-button>`;
        }

        // @item-mouseover=${(e) => this._isHovered[ppHash] = true} @item-mouseout=${(e) => this._isHovered[ppHash] = false}
        return html`<ui5-tree-item-custom id=${ppAh} level="2" icon="number-sign" style="overflow:hidden;">
            <div slot="content" style="display:flex; overflow: hidden; align-items:center; font-weight:${hasNewBeads && !threadIsNew? "bold" : "normal"};">
                <span style="height:18px;margin-right:10px; overflow:hidden; text-overflow:ellipsis;font-weight: ${hasNewBeads? "bold": ""}">${thread.pp.purpose}</span>
                ${badge}
                ${commentButton}                
                ${hideShowBtn}
            </div>               
        </ui5-tree-item-custom>`
      })

      /* */
      const newSubjects = this._zvm.getNewSubjects();
      const unreadSubjects = this._zvm.getUnreadSubjects();

      /** Render Topic */
      const maybeCommentThread: ActionHashB64 | null = this._zvm.getCommentThreadForSubject(topicHash);
      const topicIsNew = newSubjects[topicHash] != undefined;
      let topicHasUnreadComments = false;
      if (maybeCommentThread != null) {
        topicHasUnreadComments = unreadSubjects.includes(topicHash);
      }

      let commentButton = html``;
      if (topicHasUnreadComments) {
        commentButton = html`<ui5-button icon="comment" tooltip="View Thread" 
                                             design="Negative" class=${this._isHovered[topicHash]? "" : "transBtn"}
                                             @click="${(e) => this.onClickCommentTopic(maybeCommentThread, topicHash, title)}"></ui5-button>`;
      } else {
        if (this._isHovered[topicHash]) {
          commentButton = maybeCommentThread != null
            ? html`
                <ui5-button icon="comment" tooltip="View Thread" design="Transparent" 
                            style="border:none;"
                            @click="${(e) => this.onClickCommentTopic(maybeCommentThread, topicHash, title)}"></ui5-button>`
            : html`
                <ui5-button icon="sys-add" tooltip="Create new Thread" design="Transparent"
                            style="border:none; padding:0px;" 
                            @click="${(e) => this.onClickCommentTopic(maybeCommentThread, topicHash, title)}"></ui5-button>`;
        }
      }


      /** 'new', 'notif' and 'unread' badge to display */
      let badge = html``;
      if (topicIsNew) {
        badge = html`<ui5-badge class="notifBadge subjectBadge">New</ui5-badge>`;
      } else {
        let notifCount = 0; // FIXME
        if (notifCount > 0) {
          badge = html`<ui5-badge class="notifBadge subjectBadge">${notifCount}</ui5-badge>`;
        } else {
          /** Agregate count of unread beads on all topic's threads */
          let count = 0;
          for (const topicPpAh of topicThreads) {
            if (this.perspective.unreadThreads[topicPpAh]) {
              count += this.perspective.unreadThreads[topicPpAh][1].length;
            }
          }
          if (count > 0) {
            badge = html`<ui5-badge class="unreadBadge subjectBadge">${count}</ui5-badge>`;
          }
        }
      }

      let hideShowBtn =html``;
      if (this._isHovered[topicHash]) {
        hideShowBtn = this.showArchivedTopics && isHidden? html`
          <ui5-button icon="show" tooltip="Show" design="Transparent"
                      style="border:none; padding:0px"
                      @click="${async (e) => {
                        await this._zvm.unhideSubject(topicHash);
                        toasty(`Unarchived Topic "${title}"`)
        }}"></ui5-button>
        `: html`
          <ui5-button icon="hide" tooltip="Hide" design="Transparent"
                      style="border:none; padding:0px"
                      @click="${async (e) => {
                        await this._zvm.hideSubject(topicHash);
                        toasty(`Archived Topic "${title}"`)
        }}"></ui5-button>          
        `
      }

      const topicHasUnreads = unreadSubjects.includes(topicHash);
      return html`
          <ui5-tree-item-custom id="${topicHash}" ?has-children="${!!topicThreads}"
                                expanded="${!!topicThreads}" show-toggle-button level="1" style="background: ${topicIsNew? "#DBE3EF" : ""};overflow: hidden;">
          <span slot="content" style="display:flex;overflow: hidden;">
              <span style="/*width:110px;*/height:18px;margin-top:8px; margin-right:10px; font-weight:${topicHasUnreads? "bold" : ""}; text-overflow:ellipsis;overflow:hidden;">${title}</span>
              <ui5-button icon="add" tooltip="Create a new channel for this Topic" design="Transparent" @click=${async (e) => {
                  e.stopPropagation(); //console.log("topic clicked:", title);
                  await this.updateComplete;
                  this.dispatchEvent(new CustomEvent('createThreadClicked', {
                      detail: topicHash,
                      bubbles: true,
                      composed: true
                  }));
              }}></ui5-button>
              ${badge}
              ${commentButton}
              ${hideShowBtn}              
          </span>
              ${threads}
          </ui5-tree-item-custom>`
    });
    //console.log({treeItems})

    /** render all */
    return html`
      <ui5-busy-indicator id="busy" style="width: 100%">
        <ui5-tree id="semTree" mode="SingleSelect" no-data-text=${msg("No topics found")}
                  @item-toggle=${this.toggleTreeItem}
                  @item-click="${this.clickTree}"
                  @item-mouseover=${(e) => {this._isHovered[e.detail.item.id] = true; this.requestUpdate();}}
                  @item-mouseout=${(e) => {this._isHovered[e.detail.item.id] = false;}}
        >
          ${treeItems}
        </ui5-tree>
      </ui5-busy-indicator>
    `
  }


  /** */
  static get styles() {
    return [
      css`
        :host {
          background: #FBFCFD;
          display: block;
          overflow-y: auto;
          height: 100%;
        }

        #semTree {
          display: flex;
          flex-direction: column;
          /*width: 100%;*/
        }

        .transBtn {
          border:none;
          background:none;
        }

        .subjectBadge {
          margin-top: 10px;
        }
        
        .unreadBadge {
          background: aliceblue;
          color: gray;
          border-color: aliceblue;
        }

        .notifBadge {
          color: brown;
        }
      `,

    ];
  }
}
