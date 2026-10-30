import {css, html, nothing, render, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import "@ui5/webcomponents/dist/Icon.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-right.js";
import "@ui5/webcomponents-icons/dist/slim-arrow-down.js";
import {ActionId, ActionIdMap, AgentId, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {msg} from "@lit/localize";
import {CommentRequest, EditTopicRequest, HideEvent, SpecialSubjectType, threadJumpEvent} from "../../events";
import {sharedStyles} from "../../styles";
import {latestThreadName, tooltipOnlyWhenClipped, reorderAnimated} from "../../utils";
import {toasty} from "../../toast";
import {renderAvatar, renderAvatarGroup} from "../../render";
import {ThreadsDnaPerspective, ThreadsDvm} from "../../viewModels/threads.dvm";
import Menu from "@ui5/webcomponents/dist/Menu";
import Button from "@ui5/webcomponents/dist/Button";


/** Target of the shared "more" popup menu */
interface MenuTarget {
  kind: "Topic" | "Channel";
  address: ActionId;
  title: string;
  hidden: boolean;
  isAuthor?: boolean;
  commentThread?: ActionId | null;
  /** Channel only: the category it is listed under */
  topic?: ActionId;
}


/** */
export interface ICollapsable {
  collapseAll(canCollapse: boolean): void;
}


/**
 *
 */
@customElement("topics-lister")
export class TopicsLister extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> implements ICollapsable {

  @property({type: Boolean}) history?: boolean = false;

  @property() order: string = "custom";

  @property() showArchivedTopics?: string;

  @property() selectedThreadHash?: ActionId;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  // @consume({context: onlineLoadedContext, subscribe: true})
  // onlineLoaded!: boolean;

  private _dragged: any;
  /** A cross-category drop, run once dragend has repainted the list */
  private _pendingMove?: [ActionId, ActionId];

  @state() private _menuTarget?: MenuTarget;


  /** -- Methods -- */

  /** In dvmUpdated() this._dvm is not set yet */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.debug("<topics-lister>.dvmUpdated()");
    /** Subscribe to ThreadsZvm */
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
  }


  @state() collapsed: ActionIdMap<boolean> = new ActionIdMap<boolean>();

  /** */
  collapseAll(canCollapse: boolean): void {
    //console.log("<topics-lister> collapseAll", canCollapse);
    this.collapsed.forEach((_v, k, map) => {map.set(k, canCollapse)});
    this.requestUpdate();
  }


  /** */
  onClickCommentTopic(maybeCommentThread: ActionId | null, topicAh: ActionId, subjectName: string) {
    this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', {
      detail: {
        maybeCommentThread,
        subjectHashB64: topicAh.b64,
        subjectType: SpecialSubjectType.SemanticTopic,
        subjectName,
        viewType: "side"
      }, bubbles: true, composed: true
    }));
  }

  /** */
  onClickEditTopic(topicHash: ActionId, subjectName: string) {
    this.dispatchEvent(new CustomEvent<EditTopicRequest>('edit-topic-clicked', {
      detail: {topicHash, subjectName},
      bubbles: true,
      composed: true
    }));
  }

  /** Open the shared popup menu for the clicked Topic or Channel */
  async openMenu(e: Event, target: MenuTarget) {
    e.stopPropagation();
    e.preventDefault();
    const button = e.currentTarget as Button;
    const menu = this.shadowRoot!.getElementById("moreMenu") as Menu;
    /** A click on the opener does not close a UI5 popover: a second click on the same
     *  button closes the menu here. A click on another row's button already closed it. */
    if (menu.open && menu.opener === button) {
      menu.open = false;
      return;
    }
    this._menuTarget = target;
    await this.updateComplete;
    menu.opener = button; menu.open = true;
  }


  /** */
  onMenuItemClick(e: any) {
    const target = this._menuTarget;
    if (!target) {
      return;
    }
    const itemId: string = e.detail.item.id;
    if (itemId.startsWith("move-")) {
      /*await*/ this.moveChannel(target.address, new ActionId(itemId.slice("move-".length)));
      return;
    }
    switch (itemId) {
      case "hide":
      case "show":
        this.dispatchEvent(new CustomEvent<HideEvent>('archive', {
          detail: {hide: e.detail.item.id == "hide", address: target.address, type: target.kind},
          bubbles: true, composed: true
        }));
        break;
      case "editTitle":
        this.onClickEditTopic(target.address, target.title);
        break;
      case "comments":
        this.onClickCommentTopic(target.commentThread!, target.address, target.title);
        break;
    }
  }


  /** Items of the shared popup menu, depending on its current target */
  renderMenuItems() {
    const target = this._menuTarget;
    if (!target) {
      return html``;
    }
    const hideItem = target.hidden
      ? html`<ui5-menu-item id="show" icon="show" text=${msg("Show")}></ui5-menu-item>`
      : html`<ui5-menu-item id="hide" icon="hide" text=${msg("Hide")}></ui5-menu-item>`;
    if (target.kind == "Channel") {
      /** Every other visible category is a destination */
      const destinations = Array.from(this.threadsPerspective.semanticTopics.entries())
        .filter(([topicAh, _]) => !target.topic || !topicAh.equals(target.topic))
        .filter(([topicAh, _]) => this.showArchivedTopics || !this.threadsPerspective.hiddens[topicAh.b64]);
      const moveItems = destinations.map(([topicAh, [title, _author]]) =>
        html`<ui5-menu-item id=${"move-" + topicAh.b64} text=${title}></ui5-menu-item>`);
      return html`
        ${moveItems.length? html`<ui5-menu-item icon="move" text=${msg("Move to category")}>${moveItems}</ui5-menu-item>` : html``}
        ${hideItem}`;
    }
    return html`
      ${target.isAuthor? html`<ui5-menu-item id="editTitle" icon="edit" text=${msg("Edit Title")}></ui5-menu-item>` : html``}
      <ui5-menu-item id="comments" icon="discussion" text=${msg("Category discussion")}></ui5-menu-item>
      ${hideItem}`;
  }


  /** Run the move a cross-category drop recorded. Called after dragend has repainted the
   *  list: changing the perspective while a row still sits where the drag left it would
   *  fight that repaint. */
  flushPendingMove() {
    const move = this._pendingMove;
    this._pendingMove = undefined;
    if (move) {
      /*await*/ this.moveChannel(move[0], move[1]);
    }
  }


  /** File a channel under another category; the ZVM shows it there at once and puts it back
   *  if the zome refuses */
  async moveChannel(ppAh: ActionId, toTopicAh: ActionId) {
    try {
      await this._dvm.threadsZvm.moveThread(ppAh, toTopicAh);
    } catch (e: any) {
      console.warn("<topics-lister>.moveChannel() failed", e);
      toasty(msg("Could not move channel") + ": " + (e?.message ?? e));
    }
  }


    /** */
    onClickMerge(topicHash: ActionId, subjectName: string) {
        this.dispatchEvent(new CustomEvent<EditTopicRequest>('merge-topic-clicked', {
            detail: {topicHash, subjectName},
            bubbles: true,
            composed: true
        }));
    }


  //private dragSrcIndex: number | null = null;

  /** */
  override render() {
    console.log("<topics-lister>.render() start", this.collapsed, this.threadsPerspective.semanticTopics.size, this.threadsPerspective.semanticTopics);

    let pairs = Array.from(this.threadsPerspective.semanticTopics.entries());
    switch (this.order) {
      case "alpha":
        pairs = pairs.sort((a, b) => {
          return a[1][0].localeCompare(b[1][0]);
        });
      break;
      case "chrono":
        // TODO: The perspective doesn't hold timestamp data for topics so for now we assume its in the order from which we get the data.
        //pairs = pairs.reverse();
        // pairs = pairs.sort((a, b) => {
        //   const nameA = this._dvm.profilesZvm.perspective.getProfileTs(a[0])!;
        //   const nameB = this._dvm.profilesZvm.perspective.getProfileTs(b[0])!;
        //   return nameB - nameA;
        // });
      break;
      case "custom":
      default:
        //console.debug("<topics-lister> custom", pairs.length);
        pairs = this.getTopicOrderFromLocalStorage(this.threadsPerspective.semanticTopics);
      break;
    }
    let treeItems = pairs.map(([topicAh, [title, author]]) => {
      const isSubjectHidden = this.threadsPerspective.hiddens[topicAh.b64]? this.threadsPerspective.hiddens[topicAh.b64] : false;
      /** Skip if hidden */
      if (isSubjectHidden && !this.showArchivedTopics) {
        return;
      }
      /** Our own collapsed state (the panel is fixed): a closed category still lists the
       *  open channel and the channels with unread, notified or new messages */
      if (this.collapsed.get(topicAh) === undefined) {
        this.collapsed.set(topicAh, false);
      }
      const collapsed = !!this.collapsed.get(topicAh);
      const unreadPps = new Set<string>();
      /** Render threads for Topic */
      let threadElems: TemplateResult<1>[] = [];
      let topicThreads = this.threadsPerspective.getSubjectThreads(topicAh);
      if (!topicThreads) {
        topicThreads = [];
      } else {
        switch (this.order) {
          case "alpha":
            topicThreads = topicThreads.sort((a, b) => {
              const threadA = this.threadsPerspective.threads.get(a)!;
              const nameA = latestThreadName(threadA.title, threadA.pp, this._dvm.threadsZvm);
              const threadB = this.threadsPerspective.threads.get(b)!;
              const nameB = latestThreadName(threadB.title, threadB.pp, this._dvm.threadsZvm);
              return nameA.localeCompare(nameB);
            });
          break;
          case "chrono":
            topicThreads = topicThreads.sort((a, b) => {
              const nameA = this.threadsPerspective.threads.get(a)!.creationTime
              const nameB = this.threadsPerspective.threads.get(b)!.creationTime;
              return nameA - nameB;
            });
          break;
          case "custom":
            topicThreads = this.getThreadOrderFromLocalStorage(topicAh, topicThreads);
          break;
        }
        threadElems = topicThreads.map((ppAh) => {
            const thread = this.threadsPerspective.threads.get(ppAh);
            if (!thread) {
              return html`<ui5-busy-indicator delay="0" size="M" active style="width:100%; height:100%;"></ui5-busy-indicator>`;
            }
            // console.log("ORDER", thread.pp.purpose);
            const isPersistent = this._dvm.threadsZvm.perspective.isPersistent(ppAh.b64);
            const isSelected = this.selectedThreadHash && this.selectedThreadHash.equals(ppAh);
            const isThreadHidden = this.threadsPerspective.hiddens[ppAh.b64]? this.threadsPerspective.hiddens[ppAh.b64] : false;
            const maybeUnreadThread = this.threadsPerspective.unreads.get(ppAh);
            const hasNewBeads = maybeUnreadThread && maybeUnreadThread[1].length > 0;
            const threadIsNew = this.threadsPerspective.newThreads.has(ppAh);
            if (!thread.pp || (isThreadHidden && !this.showArchivedTopics) || thread.pp.purpose == "comment") {
              return html``;
            }

            /** 'new', 'notif' or 'unread' badge to display */
            //let badge = html`<ui5-tag hide-state-icon>0</ui5-tag>`;
            let badge = html`<div style="min-width: 26px"></div>`;
            let notifCount = this.threadsPerspective.getAllNotificationsForPp(ppAh).length;
            if (isSelected || threadIsNew || notifCount > 0 || hasNewBeads) {
              unreadPps.add(ppAh.b64);
            }
            if (threadIsNew) {
              if (isPersistent) {
                badge = html`<ui5-tag hide-state-icon class="notifBadge" title="new channel!">${notifCount}</ui5-tag>`;
              } else {
                badge = html`<ui5-tag hide-state-icon class="tempBadge">${msg("temp")}</ui5-tag>`;
              }
            } else {
              if (notifCount > 0) {
                badge = html`
                    <ui5-tag hide-state-icon class="notifBadge">${notifCount}</ui5-tag>`;
              } else {
                if (hasNewBeads) {
                  badge = html`
                      <ui5-tag hide-state-icon class="unreadBadge">${maybeUnreadThread[1].length}</ui5-tag>`;
                }
              }
            }

            const menuBtn = html`
                <ui5-button icon="overflow" tooltip=${msg("More")} design="Transparent"
                            class="menuBtn" style="${isSelected? "color: var(--vines-ink);" : ""}"
                            @click=${(e: any) => this.openMenu(e, {kind: "Channel", address: ppAh, title: thread.title, hidden: !!isThreadHidden, topic: topicAh})}></ui5-button>`;

            /** Create an avatar group */
            const agents: AgentId[] = this._dvm.allCurrentOthers(undefined, ppAh);
            const avatarGrp = Object.values(agents).length > 0
              ? Object.values(agents).length > 1
                ? renderAvatarGroup(this._dvm.profilesZvm, agents)
                : renderAvatar(this, this._dvm.profilesZvm, agents[0]!, "XS")
              : html``;

            /** render topic thread */
            return html`
                <sl-tooltip content=${thread.title} style="--show-delay:1000" disabled @mouseover=${tooltipOnlyWhenClipped}>
                  <div id=${ppAh.b64} .topic=${topicAh.b64} 
                       class="threadItem" 
                       style="
                         font-weight:${hasNewBeads && !threadIsNew? "bold" : "normal"}; 
                         ${threadIsNew || notifCount? "color: var(--vines-accent-soft);" : ""}
                         ${isSelected? "background: var(--vines-sidebar-row-selected); box-shadow: var(--vines-shadow-row); color: var(--vines-ink);" : ""}
                       "
                       .draggable=${this.order == "custom" && !collapsed? "true" : ""}
                       @dragstart=${(e: any) => {
                          e.stopPropagation();
                          this._dragged = e.target.closest('sl-tooltip');
                          console.log("order dragstart", this._dragged);
                          setTimeout(() =>  this._dragged?.classList.add('dragging'), 0)
                          e.dataTransfer!.effectAllowed = 'move';
                          e.dataTransfer!.setData('thread', ppAh.b64);
                       }}
                       @dragend=${(e: DragEvent) => {
                           e.stopPropagation();
                           (e.currentTarget as HTMLElement).classList.remove('dragging');
                           this._dragged = null;
                           // Clean up any leftover drag-over highlights
                           this.shadowRoot?.querySelectorAll('.drag-over')
                                   .forEach(el => el.classList.remove('drag-over'));
                           /** Force clear and repaint */
                           render(nothing, this.shadowRoot!);
                           this.requestUpdate();
                           /** This handler stops propagation, so the container's dragend
                            *  never sees a row drag: flush the move here */
                           this.flushPendingMove();
                       }}
                       @dragleave=${(e: DragEvent) => {
                           (e.currentTarget as HTMLElement).classList.remove('drag-over');
                       }}
                       @click=${() => this.dispatchEvent(threadJumpEvent(ppAh))}>
                      ${badge}
                      <span class="rowTitle" style="flex-grow:1; margin-left:10px; margin-right:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:${hasNewBeads || isSelected? "bold" : ""}; color: var(--vines-ink);"
                      >${thread.title}</span>
                      ${avatarGrp}
                      ${menuBtn}
                  </div>
                </sl-tooltip>`
          })
          if (collapsed) {
            threadElems = threadElems.filter((_, i) => unreadPps.has(topicThreads[i]!.b64));
          }
        }
        /* */
        const newSubjects = this.threadsPerspective.getNewSubjects();
        const unreadSubjects = this.threadsPerspective.getUnreadSubjects();

        /** Render Topic */
        const maybeCommentThread: ActionId | null = this.threadsPerspective.getCommentThreadForSubject(topicAh);
        const topicIsNew = newSubjects.get(topicAh.b64) != undefined;
        let topicHasUnreadComments = false;
        if (maybeCommentThread != null) {
          topicHasUnreadComments = unreadSubjects.map((id) => id.b64).includes(topicAh.b64);
        }

        const topicCommentButton = topicHasUnreadComments
          ? html`<ui5-button icon="discussion" tooltip=${msg("New in category discussion")}
                             design="Negative" style="border:none;background: transparent"
                             @click=${(_e: any) => this.onClickCommentTopic(maybeCommentThread, topicAh, title)}></ui5-button>`
          : html``;


        /** 'new', 'notif' and 'unread' badge to display */
        let topicBadge = html``;
        if (topicIsNew) {
          topicBadge = html`<ui5-tag hide-state-icon class="notifBadge subjectBadge">${msg('new')}</ui5-tag>`;
        } else {
          let notifCount = 0; // FIXME: Get real notif count
          if (notifCount > 0) {
            topicBadge = html`<ui5-tag hide-state-icon class="notifBadge subjectBadge">${notifCount}</ui5-tag>`;
          } else {
            /** Aggregate count of unread beads on all topic's threads */
            let count = 0;
            for (const topicPpAh of topicThreads) {
              if (this.threadsPerspective.unreads.get(topicPpAh)) {
                count += this.threadsPerspective.unreads.get(topicPpAh)![1].length;
              }
            }
            if (count > 0) {
              topicBadge = html`<ui5-tag hide-state-icon class="unreadBadge subjectBadge">${count}</ui5-tag>`;
            }
          }
      }

      const topicMenuBtn = html`
          <ui5-button icon="overflow" tooltip=${msg("More")} design="Transparent" class="menuBtn"
                      @click=${(e: any) => this.openMenu(e, {
                        kind: "Topic", address: topicAh, title, hidden: !!isSubjectHidden,
                        isAuthor: this.cell.address.agentId.equals(author),
                        commentThread: maybeCommentThread,
                      })}></ui5-button>`;

      // const delButton = html`<ui5-button icon="delete" tooltip=${msg("Delete topic")}
      //                                        design="Negative" style="border:none;background: transparent"
      //                                        @click=${(e:any) => this._zvm.zomeProxy.deleteSemanticTopic(decodeHashFromBase64(topicHash))}></ui5-button>`;

      const topicHasUnreads = unreadSubjects.map((id) => id.b64).includes(topicAh.b64);

      //console.log("<topics-lister>.render() threads", threads);
      if (!collapsed && threadElems.length == 0) {
        const tBgColor = "transparent";
        threadElems = [html`<div class="threadItem" style="cursor: default; display: flex; flex-direction: column; background: ${tBgColor}">
                   <span style="color: var(--vines-ink-muted);">${msg('No channels found')}</span>
                    <span class="linky" style="text-decoration: underline; font-size: small"
                          @click=${async (e: any) => {
                            e.stopPropagation();
                            e.preventDefault();
                            await this.updateComplete;
                            this.dispatchEvent(new CustomEvent<ActionId>('createThreadClicked', {
                              detail: topicAh,
                              bubbles: true,
                              composed: true
                            }));
                          }}>
                        ${msg('Create channel')}</span>
              </div>`];
      }

      /** render topic item */
      const bgColor = this._dvm.perspective.myNewestTopic && topicAh.equals(this._dvm.perspective.myNewestTopic)? "background: var(--vines-surface-tint)" : "";
      return html`
          <ui5-panel id=${topicAh.b64} fixed class="lister-panel ${collapsed? "collapsed" : ""}"
                     style="${bgColor}"
                     .draggable=${this.order == "custom" && !collapsed? "true" : ""}>
            <!-- header: a click toggles the section; its buttons are left alone -->
            <div slot="header" class="topicHeader" style="display:flex; flex-direction:row; align-items:center; overflow:hidden; width:100%; cursor:pointer;"
                 @click=${(e: any) => {
                    if (e.target.closest && e.target.closest('ui5-button')) return;
                    this.collapsed.set(topicAh, !collapsed);
                    this.requestUpdate();
                 }}>
                <ui5-icon class="lister-chevron" name=${collapsed? "slim-arrow-right" : "slim-arrow-down"}></ui5-icon>
                <div style="flex-grow:1; height:18px; margin-right:10px; font-weight:${topicHasUnreads? "bold" : ""}; text-overflow:ellipsis; overflow:hidden;">${title}</div>
                <!-- ${topicBadge} -->
                ${topicCommentButton}
                ${topicMenuBtn}
                <ui5-button icon="add" tooltip=${msg("New Channel")}
                            design="Transparent" 
                            style="color: var(--vines-ink-muted)"
                            @click=${async (e: any) => {
                                e.stopPropagation();
                                e.preventDefault();
                                await this.updateComplete;
                                this.dispatchEvent(new CustomEvent<ActionId>('createThreadClicked', {
                                  detail: topicAh,
                                  bubbles: true,
                                  composed: true
                                }));
                              }}>
                </ui5-button>
            </div>
            <!-- threads -->              
           ${threadElems}
          </ui5-panel>`
    });

    treeItems = treeItems.filter((value) => value !== undefined);
    console.log("<topics-lister>.render() treeItems", treeItems);

    /** Handle empty tree case */
    if (treeItems.length == 0) {
      treeItems.push(html`<div style="color: var(--vines-ink-muted); margin: 10px auto 20px auto;">${msg('No categories found')}</div>`);
      //if (this._dvm.profilesZvm.perspective.agents.length <= 1) {
      treeItems.push(html`<div style="color: var(--vines-ink-muted); margin: 10px auto 20px auto;">${msg('(Might not be connected to peers yet)')}</div>`);
      //}
    }

    /** render all */
    return html`
        <ui5-menu id="moreMenu" @item-click=${this.onMenuItemClick}>
            ${this.renderMenuItems()}
        </ui5-menu>
    <div id="container"
         @dragstart=${(e: any) => {
           this._dragged = e.target.closest('ui5-panel');
           setTimeout(() =>  this._dragged?.classList.add('dragging'), 0);
           e.dataTransfer!.setData('topic', '42');
         }}
         @dragend=${(_e: any) => {
             this._dragged?.classList.remove('dragging');
             this._dragged = null;
             /** Force clear and repaint */
             render(nothing, this.shadowRoot!);
             this.requestUpdate();
             this.flushPendingMove();
         }}
         @dragover=${(e: any) => {
            e.preventDefault();
            //console.log("dragover", e.dataTransfer!.types)
            if (e.dataTransfer!.types.includes('topic')) {
              const target = e.target.closest('ui5-panel');
              if (!target || target === this._dragged) return;
              //console.log("topic dragover target", target);
              const {top, height} = target.getBoundingClientRect();
              const isAfterTarget = e.clientY > top + height / 2;
              const container = this.shadowRoot!.getElementById('container')! as HTMLElement;
              reorderAnimated(this.shadowRoot!, 'ui5-panel, sl-tooltip > .threadItem', () =>
                container.insertBefore(this._dragged, isAfterTarget ? target.nextSibling : target));
              return;
            }
             if (e.dataTransfer!.types.includes('thread')) {
               e.dataTransfer!.dropEffect = 'move';
               (e.currentTarget as HTMLElement).classList.add('drag-over');
               /** Any category panel takes the row. A row under the pointer sets the position;
                *  the header or empty space means first when above the first row, else last. */
               const panel = e.target.closest('ui5-panel') as HTMLElement | null;
               if (!panel || panel.classList.contains('collapsed')) return;
               const target = e.target.closest('sl-tooltip');
               if (target === this._dragged) return;
               if (!target) {
                 /** Above the middle of the first other row (the header, say) means first.
                  *  Measured against the first row that is not the dragged one, so a row
                  *  already at the top stays there instead of bouncing to the bottom. */
                 const rows = Array.from(panel.querySelectorAll<HTMLElement>(':scope > sl-tooltip'));
                 const firstOther = rows.find((r) => r !== this._dragged);
                 if (firstOther) {
                   const dim = firstOther.children[0]!.getBoundingClientRect();
                   if (e.clientY < dim.top + dim.height / 2) {
                     if (this._dragged.nextElementSibling !== firstOther) {
                       reorderAnimated(this.shadowRoot!, 'ui5-panel, sl-tooltip > .threadItem', () => panel.insertBefore(this._dragged, firstOther));
                     }
                     return;
                   }
                 }
                 if (panel.lastElementChild !== this._dragged) {
                   reorderAnimated(this.shadowRoot!, 'ui5-panel, sl-tooltip > .threadItem', () => panel.appendChild(this._dragged));
                 }
                 return;
               }
               const {top, height} = target.children[0]!.getBoundingClientRect();
               const isAfterTarget = e.clientY > top + height / 2;
               reorderAnimated(this.shadowRoot!, 'ui5-panel, sl-tooltip > .threadItem', () =>
                 panel.insertBefore(this._dragged, isAfterTarget ? target.nextSibling : target));
             }
         }}
         @drop=${(e: any) => {
            e.preventDefault();
            const isTopic = e.dataTransfer!.getData('topic');
            if (isTopic) {
              const container = this.shadowRoot!.getElementById('container')! as HTMLElement;
              const order = Array.from(container.children).map(el => el.id);
              const deduped = [...new Set(order)];
              localStorage.setItem("vinesTopicOrder", JSON.stringify(deduped));
              return;
            }
            const thread = e.dataTransfer!.getData('thread');
            if (thread && this._dragged) {
              /** The row sits where it was dropped: that panel's order is saved as shown, and
               *  when it is another category, the source order loses the row and the channel
               *  is moved. */
              const panel = this._dragged.parentElement as HTMLElement;
              const fromTopic: string = this._dragged.children[0]!.topic;
              const toTopic = panel.id;
              const orderOf = (p: HTMLElement) => [...new Set(
                Array.from(p.children).map((el) => el.children[0]?.id ?? '').filter((id) => id !== ''))];
              localStorage.setItem("vinesThreadOrder-" + toTopic, JSON.stringify(orderOf(panel)));
              if (toTopic != fromTopic) {
                const source = this.shadowRoot!.getElementById(fromTopic) as HTMLElement | null;
                if (source) {
                  localStorage.setItem("vinesThreadOrder-" + fromTopic, JSON.stringify(orderOf(source)));
                }
                this._pendingMove = [new ActionId(thread), new ActionId(toTopic)];
              }
            }
         }}>
        ${treeItems}
    </div>`
  }


  /** Grab the order for local storage. Set order and append any unknown remaining elements */
  getTopicOrderFromLocalStorage(map: ActionIdMap<[string, AgentId]>): [ActionId, [string, AgentId]][] {
    const json = localStorage.getItem("vinesTopicOrder");
    let allPairs = Array.from(map.entries());
    if (!json) return allPairs;
    let ids: string[];
    try {
      ids = JSON.parse(json) as string[];
    } catch {
      return allPairs;
    }
    let pairs: [ActionId, [string, AgentId]][] = [];
    for (const idb64 of ids) {
      const id = new ActionId(idb64);
      pairs.push([id, map.get(id)!]);
      allPairs = allPairs.filter((key) => !key[0].equals(id));
    }
    console.debug("TOPIC ORDER FROM LOCAL STORAGE", pairs);
    return pairs.concat(allPairs);
  }

  /** Grab the order for local storage. Set order and append any unknown remaining elements */
  getThreadOrderFromLocalStorage(topicAh: ActionId, threads: ActionId[]): ActionId[] {
    //console.log("getThreadOrderFromLocalStorage()", topicAh.b64);
    const json = localStorage.getItem("vinesThreadOrder-" + topicAh.b64);
    if (!json) {
      return threads;
    }
    let ids: string[];
    try {
      ids = JSON.parse(json) as string[];
    } catch {
      return threads;
    }
    /** Convert to ActionId and concat new/unsorted threads. A saved id that is no longer in
     *  this category (moved away, deleted) is skipped, not shown as a ghost. */
    let ordered: ActionId[] = [];
    for (const idb64 of ids) {
      const id = new ActionId(idb64);
      if (!threads.some((key) => key.equals(id))) {
        continue;
      }
      ordered.push(id);
      threads = threads.filter((key) => !key.equals(id));
    }
    const res = ordered.concat(threads);
    console.log("THREAD ORDER FROM LOCAL STORAGE", /*topicAh.b64,*/ res);
    return res;
  }

  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
          #container {
              /*display: block;*/
              display: flex;
              flex-direction: column;
              /*overflow-y: auto;*/
              /*height: 100%;*/
          }

          .subjectBadge {
              margin-top: 10px !important;
          }

          /** Panel box, header insets and chevron come from .lister-panel in sharedStyles,
           *  shared with the Direct Messages section */
          ui5-panel::part(header):hover {
              /*font-weight: bold;*/
              color: var(--vines-accent) !important;
          }

          /** The "⋮" menu only shows while its row or category header is hovered.
           *  visibility (not display) so the "+" column does not shift. */
          .menuBtn {
              border: none;
              padding: 0px;
              color: var(--vines-ink-muted);
              visibility: hidden;
          }
          .menuBtn::part(icon) {
              transform: rotate(90deg);
          }
          .threadItem:hover > .menuBtn,
          .topicHeader:hover .menuBtn {
              visibility: visible;
          }

          .threadItem:hover > ui5-avatar-group {
              display: block !important;
          }

          ui5-panel[draggable="true"] {
              cursor: grab;
          }
          ui5-panel.dragging {
              opacity: 0.4;
          }

          .threadItem[draggable="true"]:active {
              cursor: grabbing;
          }

          .threadItem[draggable="true"] {
              cursor: grab;
              user-select: none;
          }
          .threadItem.dragging {
              opacity: 0.4;
          }

          .threadItem.drag-over {
              border-color: var(--vines-accent);
              background: var(--vines-surface-tint);
          }
          
          /*
          @media (max-width: 500px) {
              ui5-button {
                  display: block !important;
              }
              copy-wal-button {
                  display: block !important;
              }
          }
          */
      `,
    ];
  }
}
