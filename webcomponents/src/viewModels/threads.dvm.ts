import {
  ActionId,
  ActionIdMap,
  AgentId,
  AgentIdMap,
  DnaViewModel, TipProtocol, TipProtocolVariantApp,
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
  BeadType, EncryptedBeadContent, ThreadsAppTip, ThreadsNotification, ThreadsNotificationTip,
  TypedContent,
} from "./threads.materialize";
import {ProfilesAltZvm, ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {Decoder, Encoder} from "@msgpack/msgpack";
import {AuthorshipZvm} from "./authorship.zvm";
import {HOLOCHAIN_ID_EXT_CODEC} from "@ddd-qc/cell-proxy";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {PathExplorerZvm} from "@ddd-qc/path-explorer";


/** */
export type ThreadsDnaPerspective = {
  /* agentId -> (Timestamp, threadAh) */
  agentPresences: AgentIdMap<[number, ActionId | null]>,
  /** ppAh -> string */
  threadInputs: ActionIdMap<String>,
  /** ppAh -> Timestamp */
  initialThreadProbeLogTss: ActionIdMap<Timestamp>,
  /** */
  initialGlobalProbeLogTs: Timestamp;
  /** */
  signaledNotifications: ThreadsNotification[],

  importing: boolean,
}

export type ThreadsDnaPerspectiveComparable = {
  importing: boolean,
  signaledNotifications: number,
  initialThreadProbeLogTss: number,
  agentPresences: string,

}


/**
 * ViewModel fo the Threads DNA
 * Holds two zomes:
 *  - Threads
 *  - Profiles
 */
export class ThreadsDvm extends DnaViewModel {

  static override readonly DEFAULT_BASE_ROLE_NAME = VINES_DEFAULT_ROLE_NAME;
  static override readonly ZVM_DEFS = [ThreadsZvm, ProfilesAltZvm, AuthorshipZvm, PathExplorerZvm ]

  readonly signalHandler?: AppSignalCb = this.handleSignal;

  private _encoder= new Encoder(HOLOCHAIN_ID_EXT_CODEC);
  private _decoder = new Decoder(HOLOCHAIN_ID_EXT_CODEC);

  private _currentLocation: ActionId | null = null;


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


  /** -- Setters -- */

  async setLocation(loc: ActionId | null) {
    this._currentLocation = loc;
    await this.broadcastLocation(this.profilesZvm.perspective.agents);
  };


  /** -- Perspective -- */


  private _perspective: ThreadsDnaPerspective = {
    agentPresences: new AgentIdMap(),
    threadInputs: new ActionIdMap(),
    initialThreadProbeLogTss: new ActionIdMap(),
    initialGlobalProbeLogTs:  0,
    signaledNotifications: [],
    importing: false,
  }


  get perspective(): ThreadsDnaPerspective {
    return this._perspective;
  }

  override comparable(): Object {
    const res: ThreadsDnaPerspectiveComparable = {
      importing: this.perspective.importing,
      signaledNotifications: this.perspective.signaledNotifications.length,
      initialThreadProbeLogTss: this.perspective.initialThreadProbeLogTss.size,
      agentPresences: JSON.stringify(Array.from(this.perspective.agentPresences.entries())),
    }
    return res;
  }


  /** */
  get dnaProperties(): ThreadsProperties {
    //console.log('dnaProperties() dnaModifiers', this.cell.dnaModifiers);
    const properties = this._decoder.decode(this.cell.dnaModifiers.properties as Uint8Array) as ThreadsProperties;
    //console.log('dnaProperties() properties', properties);
    return properties;
  }


  /** -- Methods -- */

  /** Store probeLog timestamp upon first load of app */
  override async initializePerspectiveOnline(): Promise<void> {
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
  private storePresence(from: AgentId, thread?: ActionId | null) {
    if (this.cell.address.agentId.equals(from)) {
      return;
    }
    const currentTimeInSeconds: number = Math.floor(Date.now() / 1000);
    let latest: [number, ActionId | null] = [currentTimeInSeconds, thread !== undefined? thread : null];
    let current = this._perspective.agentPresences.get(from);
    console.debug("storePresence()", from.short, currentTimeInSeconds, latest, current, thread);
    if (!current) {
      /** First time presence */
      current = latest;
      /** Ask or share location */
      if (thread === undefined) {
        const locTip: ThreadsAppTip = {type: thread === undefined? "where" : "location", data: this._currentLocation};
        const serTip = this._encoder.encode(locTip);
        /*await*/ this.threadsZvm.broadcastTip({App: serTip}, [from]);
      }
    } else {
      /** Update only if newer */
      if (latest[0] < current[0]) {
        return;
      }
      if (thread === undefined) {
        current[0] = currentTimeInSeconds;
      } else {
        current = latest;
      }
    }
    this._perspective.agentPresences.set(from, current);
    //this._livePeers = this.profilesZvm.perspective.agents; // TODO: implement real presence logic
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


  private async broadcastLocation(to?: AgentId[]) {
    const locTip: ThreadsAppTip = {type: "location", data: this._currentLocation};
    const serTip = this._encoder.encode(locTip);
    //const agents = from? [from] : this.allCurrentOthers();
    const agents = to? to : this.allCurrentOthers();
    console.log("broadcastLocation() storePresence to", agents);
    await this.threadsZvm.broadcastTip({App: serTip}, agents);
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
        const serAppTip = (tip as TipProtocolVariantApp).App;
        const appTip = this._decoder.decode(serAppTip) as ThreadsAppTip;
        console.log("handleTip() appTip", appTip);
        switch (appTip.type) {
          case "subject":
            console.warn("latestThreadName Received subject", appTip.data?.address);
            this.threadsZvm.storeSubject(appTip.data!);
          break;
          case "where":
            const locTip: ThreadsAppTip = {type: "location", data: this._currentLocation};
            if (locTip.data) this.storePresence(from, locTip.data);
            const serTip = this._encoder.encode(locTip);
            await this.threadsZvm.broadcastTip({App: serTip}, [from]);
          break;
          case "location":
            this.storePresence(from, appTip.data);
          break;
          case "notification":
            const notifTip: ThreadsNotificationTip = appTip.data;
            const notif: ThreadsNotification = {
              //eventIndex: notifTip.event_index,
              event: notifTip.event,
              createLinkAh: notifTip.link_ah,
              author: notifTip.author,
              timestamp: notifTip.timestamp,
              content: new ActionId(notifTip.content.b64),
            }
            this._perspective.signaledNotifications.push(notif);
          break;
        }
      }
      break;
      default:
        break;
    }
  }


  /** */
  async pingPeers(_maybePpHash: ActionId | null, _peers: Array<AgentId>) {
    // const ping: SignalPayload = {
    //   maybePpHash: maybePpHash ? maybePpHash : undefined,
    //   from: this._cellProxy.cell.agentPubKey,
    //   dm: {type: DirectMessageType.Ping, content: this._cellProxy.cell.agentPubKey}
    // };
    // // console.log({signal})
    // this.notifyPeers(ping, peers);
  }


  /** */
  allCurrentOthers(startingAgents?: AgentId[], thread?: ActionId): AgentId[] {
    const agents = startingAgents? startingAgents : Array.from(this._perspective.agentPresences.keys());
    console.log("allCurrentOthers() ", agents.length, Array.from(this._perspective.agentPresences.keys()), thread);
    const currentTime: number = Math.floor(Date.now() / 1000);
    const filtered = agents
      .filter((key) => !key.equals(this.cell.address.agentId))
      .filter((key) => {
        const pair = this._perspective.agentPresences.get(key);
        if (!pair) return false;
        if (thread) {
          if (pair[1] == null || !pair[1]?.equals(thread)) return false;
        }
        return (currentTime - pair[0]) < 5 * 60; // 5 minutes
      });
    console.log("allCurrentOthers() filtered = ", filtered.length);
    return filtered;
  }


  /** -- (un)Publish / Edit -- */

  /** */
  async publishMessage(beadType: BaseBeadType, content: TypedContent, ppAh: ActionId, author?: AgentId, prevBead?: ActionId, weServices?: WeServicesEx): Promise<ActionId> {
    const isDmThread = this.threadsZvm.isThreadDm(ppAh);
    if (isDmThread) {
      return this.publishDm(isDmThread, beadType, content, prevBead, weServices);
    }
    return this.publishTypedBead(beadType, content, ppAh, author, prevBead);
  }


  /** */
  async publishDm(otherAgent: AgentId, beadType: BaseBeadType, content: TypedContent, prevBead?: ActionId, weServices?: WeServicesEx): Promise<ActionId> {
    const dmAh = this.threadsZvm.perspective.dmAgents.get(otherAgent);
    /** Create or grab DmThread */
    let ppAh: ActionId;
    if (!dmAh) {
      ppAh = await this.threadsZvm.createDmThread(otherAgent, weServices);
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
  async editSemanticTopic(old_hash: ActionId, title: string): Promise<ActionId> {
    let ah = await this.threadsZvm.editSemanticTopic(old_hash, title);
    //const tip: TipProtocol = {type: "UpdateSemanticTopic", old_topic_eh: old_eh, new_topic_eh: eh, title};
    //await this.broadcastTip(tip);
    return ah;
  }


  /** */
  async publishCommentThread(subject: Subject/*, subject_name: string*/): Promise<ActionId> {
    const pp: ParticipationProtocol = {
      purpose: "comment",
      rules: "N/A",
      subject,
      //subject_name,
    };
    const [_creation_ts, ppAh] = await this.threadsZvm.publishParticipationProtocol(pp);
    return ppAh;
  }


  /** */
  async publishEmoji(beadAh: ActionId, emoji: string) {
    const has = this.threadsZvm.perspective.hasEmojiReaction(beadAh, this.cell.address.agentId, emoji);
    if (has) {
      return;
    }
    await this.threadsZvm.zomeProxy.publishReaction({bead_ah: beadAh.hash, emoji});
  }


  /** */
  async unpublishEmoji(beadAh: ActionId, emoji: string) {
    const has = this.threadsZvm.perspective.hasEmojiReaction(beadAh, this.cell.address.agentId, emoji);
    if (!has) {
      return;
    }
    await this.threadsZvm.zomeProxy.unpublishReaction({bead_ah: beadAh.hash, emoji});
  }


  /** -- Import & Export -- */

  /** Probe all threads before exporting */
  async exportAllPerspective(): Promise<string> {
    await this.threadsZvm.probeAllInnerAsync();
    /* Probe all threads */
    let probes = []
    for (const [ppAh, _thread] of this.threadsZvm.perspective.threads) {
      probes.push(this.threadsZvm.pullAllBeads(ppAh));
    }
    await Promise.all(probes);
    /* Done */
    return this.exportPerspective();
  }


  /** Dump perspective as JSON */
  exportPerspective(): string {
    console.debug("Dvm.exportPerspective()", name)
    const dvmExport: any = {};

    const tJson = this.threadsZvm.export(this.authorshipZvm);
    dvmExport[ThreadsZvm.DEFAULT_ZOME_NAME] = JSON.parse(tJson);

    const pJson = this.profilesZvm.export(/*this.authorshipZvm*/);
    dvmExport[ProfilesZvm.DEFAULT_ZOME_NAME] = JSON.parse(pJson);

    console.log("Dvm.exportPerspective()", this.authorshipZvm.perspective);
    const oJson = this.authorshipZvm.export();

    dvmExport[AuthorshipZvm.DEFAULT_ZOME_NAME] = JSON.parse(oJson);

    return JSON.stringify(dvmExport, null, 2);
  }


  /** */
  async importPerspective(json: string, canPublish: boolean) {
    //console.debug("Dvm.importPerspective()", json);
    this._perspective.importing = true;
    this.notifySubscribers();

    const external = JSON.parse(json) as any;

    const originals = external[AuthorshipZvm.DEFAULT_ZOME_NAME];
    this.authorshipZvm.import(JSON.stringify(originals), canPublish);
    //console.debug("import perspective", this.authorshipZvm.perspective);

    const profiles = external[ProfilesZvm.DEFAULT_ZOME_NAME];
    this.profilesZvm.import(JSON.stringify(profiles), canPublish);

    const threadsPersp = external[ThreadsZvm.DEFAULT_ZOME_NAME];
    this.threadsZvm.import(JSON.stringify(threadsPersp), canPublish, this.authorshipZvm);

    /** */
    this.notifySubscribers();
  }

  importDone() {
    this._perspective.importing = false;
    this.notifySubscribers();
  }
}
