import {
  ActionId,
  ActionIdMap,
  AgentId,
  AgentIdMap,
  DnaViewModel, EntryId, TipProtocol, TipProtocolVariantApp,
  ZomeSignal,
  ZomeSignalProtocol, ZomeSignalProtocolType
} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "./threads.zvm";
import {
  AppSignal,
  AppSignalCb,
  Timestamp
} from "@holochain/client";
import {
  ParticipationProtocol,
  Subject,
  ThreadsEntryType,
  ThreadsProperties,
  VINES_DEFAULT_ROLE_NAME,
} from "../bindings/threads.types";
import {
  BaseBeadType, bead2base,
  BeadType, EncryptedBeadContent, ThreadsNotification, ThreadsNotificationTip,
  TypedContent,
} from "./threads.perspective";
import {ProfilesAltZvm, ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {decode} from "@msgpack/msgpack";
import {AuthorshipZvm} from "./authorship.zvm";


/** */
export interface ThreadsDnaPerspective {
  /* agent -> Timestamp */
  agentPresences: AgentIdMap<number>,
  /** ppAh -> string */
  threadInputs: ActionIdMap<String>,
  /** ppAh -> Timestamp */
  initialThreadProbeLogTss: ActionIdMap<Timestamp>,
  /** */
  initialGlobalProbeLogTs: Timestamp;
  /** */
  signaledNotifications: ThreadsNotification[],
}


/**
 * ViewModel fo the Threads DNA
 * Holds two zomes:
 *  - Threads
 *  - Profiles
 */
export class ThreadsDvm extends DnaViewModel {

  static readonly DEFAULT_BASE_ROLE_NAME = VINES_DEFAULT_ROLE_NAME;
  static readonly ZVM_DEFS = [ThreadsZvm, ProfilesAltZvm, AuthorshipZvm/*, PathExplorerZvm*/ ]

  readonly signalHandler?: AppSignalCb = this.handleSignal;


  /** QoL Helpers */
  get profilesZvm(): ProfilesAltZvm {
    return this.getZomeViewModel(ProfilesZvm.DEFAULT_ZOME_NAME) as ProfilesAltZvm;
  }

  get threadsZvm(): ThreadsZvm {
    return this.getZomeViewModel(ThreadsZvm.DEFAULT_ZOME_NAME) as ThreadsZvm;
  }

  get authorshipZvm(): AuthorshipZvm {
    return this.getZomeViewModel(AuthorshipZvm.DEFAULT_ZOME_NAME) as AuthorshipZvm;
  }

  /** -- Perspective -- */

  protected hasChanged(): boolean {
    // TODO
    return true
  }

  private _perspective: ThreadsDnaPerspective = {
    agentPresences: new AgentIdMap(),
    threadInputs: new ActionIdMap(),
    initialThreadProbeLogTss: new ActionIdMap(),
    initialGlobalProbeLogTs:  0,
    signaledNotifications: [],
  }


  get perspective(): ThreadsDnaPerspective {
    return this._perspective;
  }


  /** */
  get dnaProperties(): ThreadsProperties {
    //console.log('dnaProperties() dnaModifiers', this.cell.dnaModifiers);
    const properties = decode(this.cell.dnaModifiers.properties as Uint8Array) as ThreadsProperties;
    //console.log('dnaProperties() properties', properties);
    return properties;
  }


  /** -- Methods -- */

  /** Store probeLog timestamp upon first load of app */
  async initializePerspectiveOnline(): Promise<void> {
    console.log("ThreadsDvm.initializePerspectiveOffline() override")
    await super.initializePerspectiveOnline();
    this._perspective.initialGlobalProbeLogTs = this.threadsZvm.perspective.globalProbeLogTs;
    for (const [ppAh, thread] of this.threadsZvm.perspective.threads) {
        this._perspective.initialThreadProbeLogTss.set(ppAh, thread.latestProbeLogTime);
    }
    this._livePeers = this.profilesZvm.perspective.agents; // TODO: implement real presence logic
    console.log("ThreadsDvm.initializePerspectiveOffline() override persp =", this.perspective)
  }


  /** */
  private storePresence(from: AgentId) {
    const currentTimeInSeconds: number = Math.floor(Date.now() / 1000);
    //console.log("Updating presence of", from, currentTimeInSeconds);
    this._perspective.agentPresences.set(from, currentTimeInSeconds);
    this._livePeers = this.profilesZvm.perspective.agents; // TODO: implement real presence logic
    this.notifySubscribers();
  }


  /** -- Signaling -- */

  /** */
  handleSignal(appSignal: AppSignal) {
    console.log("ThreadsDvm.handleSignal()", appSignal);
    if (!("pulses" in (appSignal.payload as Object))) {
      return;
    }
    const signal = appSignal.payload as ZomeSignal;
    for (const pulse of signal.pulses) {
      /*await*/ this.handleThreadsSignal(pulse, new AgentId(signal.from));
    }
    this.notifySubscribers();
  }

  /** */
  async handleThreadsSignal(threadsSignal: ZomeSignalProtocol, from: AgentId): Promise<void> {
    /* Update agent's known presence */
    this.storePresence(from);
    /** */
    if (ZomeSignalProtocolType.Tip in threadsSignal) {
      return this.handleTip(threadsSignal.Tip as TipProtocol, from);
    }
  }


  /** */
  private async handleTip(tip: TipProtocol, from: AgentId) {
    // /* Send pong response */
    // if (tip.type != "Pong") {
    //   console.log("PONGING ", from)
    //   const pong: TipProtocol = {type: "Pong", from: this.cell.agentPubKey};
    //   this.broadcastTip(pong, [from])
    // }
    /* Handle signal */
    const type = Object.keys(tip)[0];
    console.log("handleTip()", type, from);
    switch (type) {
      case "Ping":
      case "Pong":
        break;
      case "App": {
        const serNotifTip = (tip as TipProtocolVariantApp).App;
        const notifTip = decode(serNotifTip) as ThreadsNotificationTip;
        const notif: ThreadsNotification = {
          //eventIndex: notifTip.event_index,
          event: notifTip.event,
          createLinkAh: notifTip.link_ah,
          author: notifTip.author,
          timestamp: notifTip.timestamp,
          content: new ActionId(notifTip.content.b64),
        }
        this._perspective.signaledNotifications.push(notif);
      }
      break;
      default:
        break;
    }
  }


  /** */
  async pingPeers(maybePpHash: ActionId | null, peers: Array<AgentId>) {
    // const ping: SignalPayload = {
    //   maybePpHash: maybePpHash ? maybePpHash : undefined,
    //   from: this._cellProxy.cell.agentPubKey,
    //   dm: {type: DirectMessageType.Ping, content: this._cellProxy.cell.agentPubKey}
    // };
    // // console.log({signal})
    // this.notifyPeers(ping, peers);
  }


  /** */
  allCurrentOthers(startingAgents: AgentId[] ): AgentId[] {
    const agents = startingAgents;
    console.log("allCurrentOthers", agents)
    console.log("allCurrentOthers", this._perspective.agentPresences)
    const currentTime: number = Math.floor(Date.now() / 1000);
    const keysB64 = agents
      .filter((key) => key.b64 != this.cell.agentId.b64)
      .filter((key) => {
        const lastPingTime = this._perspective.agentPresences.get(key);
        if (!lastPingTime) return false;
        return (currentTime - lastPingTime) < 5 * 60; // 5 minutes
      });
    console.log({keysB64});
    return keysB64;
  }


  /** -- (un)Publish / Edit -- */

  /** */
  async publishMessage(beadType: BaseBeadType, content: TypedContent, ppAh: ActionId, author?: AgentId, prevBead?: ActionId): Promise<ActionId> {
    const isDmThread = this.threadsZvm.isThreadDm(ppAh);
    if (isDmThread) {
      return this.publishDm(isDmThread, beadType, content, prevBead);
    }
    return this.publishTypedBead(beadType, content, ppAh, author, prevBead);
  }


  /** */
  async publishDm(otherAgent: AgentId, beadType: BaseBeadType, content: TypedContent, prevBead?: ActionId): Promise<ActionId> {
    const dmAh = this.threadsZvm.perspective.dmAgents.get(otherAgent);
    /** Create or grab DmThread */
    let ppAh: ActionId;
    if (!dmAh) {
      ppAh = await this.threadsZvm.createDmThread(otherAgent);
    } else {
      ppAh = dmAh;
    }
    /** Create Bead */
    const bead = await this.threadsZvm.createNextBead(ppAh, prevBead);
    const typed = await this.threadsZvm.content2Typed(bead, content, beadType);
    const base = bead2base(typed, beadType);
    const encBead = await this.threadsZvm.zomeProxy.encryptBead({base, otherAgent: otherAgent.hash});
    let beadAh = await this.publishTypedBead(ThreadsEntryType.EncryptedBead, {encBead, otherAgent}, ppAh);
    return beadAh;
  }


  /** */
  async publishTypedBead(beadType: BeadType, content: TypedContent | EncryptedBeadContent, ppAh: ActionId, author?: AgentId, prevBead?: ActionId): Promise<ActionId> {
    /** */
    let [ah, _time_anchor, _creation_ts, _typed] = await this.threadsZvm.publishTypedBead(beadType, content, ppAh, author, prevBead);
    /** Erase saved input */
    this._perspective.threadInputs.delete(ppAh);
    /** */
    return ah;
  }


  /** */
  async editSemanticTopic(old_eh: EntryId, title: string): Promise<EntryId> {
    let eh = await this.threadsZvm.editSemanticTopic(old_eh, title);
    //const tip: TipProtocol = {type: "UpdateSemanticTopic", old_topic_eh: old_eh, new_topic_eh: eh, title};
    //await this.broadcastTip(tip);
    return eh;
  }


  /** */
  async publishCommentThread(subject: Subject, subject_name: string): Promise<ActionId> {
    const pp: ParticipationProtocol = {
      purpose: "comment",
      rules: "N/A",
      subject,
      subject_name,
    };
    const [_creation_ts, ppAh] = await this.threadsZvm.publishParticipationProtocol(pp);
    return ppAh;
  }


  /** */
  async publishEmoji(beadAh: ActionId, emoji: string) {
    const has = this.threadsZvm.hasEmojiReaction(beadAh, this.cell.agentId, emoji);
    if (has) {
      return;
    }
    await this.threadsZvm.zomeProxy.publishReaction({bead_ah: beadAh.hash, emoji});
  }


  /** */
  async unpublishEmoji(beadAh: ActionId, emoji: string) {
    const has = this.threadsZvm.hasEmojiReaction(beadAh, this.cell.agentId, emoji);
    if (!has) {
      return;
    }
    await this.threadsZvm.zomeProxy.unpublishReaction(beadAh.hash);
  }


  /** -- Import & Export -- */

  /** Probe all threads before exporting */
  async exportAllPerspective(): Promise<string> {
    await this.threadsZvm.probeAllInnerAsync();
    /* Probe all threads */
    let probes = []
    for (const [ppAh, thread] of this.threadsZvm.perspective.threads) {
      probes.push(this.threadsZvm.pullAllBeads(ppAh));
    }
    await Promise.all(probes);
    /* Done */
    return this.exportPerspective();
  }


  /** Dump perspective as JSON */
  exportPerspective(): string {
    // //console.log("Dvm.exportPerspective()", name)
    // const dvmExport = {};
    // //for (const [name, zvm] of Object.entries(this._zomeViewModels)) {
    // const tJson = this.threadsZvm.exportPerspective(this.authorshipZvm);
    // dvmExport[ThreadsZvm.DEFAULT_ZOME_NAME] = JSON.parse(tJson);
    //
    // const pJson = this.profilesZvm.exportPerspective(/*this.originalsZvm*/);
    // dvmExport[ProfilesZvm.DEFAULT_ZOME_NAME] = JSON.parse(pJson);
    // //}
    //
    // const oJson = this.authorshipZvm.exportPerspective();
    // dvmExport[AuthorshipZvm.DEFAULT_ZOME_NAME] = JSON.parse(oJson);
    //
    // //const dvmJson = this.exportDvmPerspective();
    // //dvmExport[ThreadsDvm.DEFAULT_BASE_ROLE_NAME] = dvmJson;
    //
    // return JSON.stringify(dvmExport, null, 2);
    return "FIXME"
  }


  /** */
  async importPerspective(json: string, canPublish: boolean) {
    //console.log("Dvm.importPerspective()", json)

    // for (const [_name, zvm] of Object.entries(this._zomeViewModels)) {
    //   zvm.importPerspective();
    // }

    const external = JSON.parse(json) as any;
    const profiles = external[ProfilesZvm.DEFAULT_ZOME_NAME];
    const threadsPersp = external[ThreadsZvm.DEFAULT_ZOME_NAME];
    const originals = external[AuthorshipZvm.DEFAULT_ZOME_NAME];
    //const dvmPersp = external[ThreadsDvm.DEFAULT_BASE_ROLE_NAME];


    this.authorshipZvm.importPerspective(JSON.stringify(originals));
    await this.profilesZvm.import(JSON.stringify(profiles), canPublish);
    await this.threadsZvm.importPerspective(JSON.stringify(threadsPersp), canPublish, this.authorshipZvm);

    console.log("import perspective", this.authorshipZvm.perspective);

    this.notifySubscribers();
  }
}
