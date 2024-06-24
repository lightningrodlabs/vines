import {delay, Dictionary, DnaViewModel} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "./threads.zvm";
import {
  ActionHashB64,
  AgentPubKeyB64,
  AppSignal,
  AppSignalCb,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHashB64, Timestamp
} from "@holochain/client";
import {
  ParticipationProtocol,
  Subject,
  ThreadsEntryType,
  ThreadsProperties,
  VINES_DEFAULT_ROLE_NAME,
  ThreadsSignal,
  ThreadsSignalProtocol,
  ThreadsSignalProtocolType,
  TipProtocol,
 TipProtocolVariantNotification,
} from "../bindings/threads.types";
import {
  BaseBeadType, bead2base,
  BeadType, EncryptedBeadContent, ThreadsNotification, ThreadsNotificationTip,
  TypedContent,
} from "./threads.perspective";
import {AppletId} from "@lightningrodlabs/we-applet";
import {ProfilesAltZvm, ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {decode} from "@msgpack/msgpack";
import {AuthorshipZvm} from "./authorship.zvm";
import {getEventType} from "../utils";


/** */
export interface ThreadsDnaPerspective {
  agentPresences: Record<AgentPubKeyB64, number>,
  /** ppAh -> string */
  threadInputs: Dictionary<String>,
  /** ppAh -> Timestamp */
  initialThreadProbeLogTss: Dictionary<Timestamp>,
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

  get perspective(): ThreadsDnaPerspective {
    return {
      agentPresences: this._agentPresences,
      threadInputs: this._threadInputs,
      initialThreadProbeLogTss: this._initialThreadProbeLogTss,
      initialGlobalProbeLogTs: this._initialGlobalProbeLogTs,
      signaledNotifications: this._signaledNotifications,
    }
  }

  /** agentPubKey -> timestamp */
  private _agentPresences: Record<string, number> = {};
  private _threadInputs = {};
  private _initialThreadProbeLogTss = {};
  private _initialGlobalProbeLogTs: Timestamp = 0;
  private _signaledNotifications: ThreadsNotification[] = [];


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
    this._initialGlobalProbeLogTs = this.threadsZvm.perspective.globalProbeLogTs;
    for (const [ppAh, thread] of this.threadsZvm.perspective.threads) {
        this._initialThreadProbeLogTss[ppAh] = thread.latestProbeLogTime;
    }
    this._livePeers = this.profilesZvm.getAgents(); // TODO: implement real presence logic
    console.log("ThreadsDvm.initializePerspectiveOffline() override persp =", this.perspective)
  }


  /** */
  private storePresence(from: AgentPubKeyB64) {
    const currentTimeInSeconds: number = Math.floor(Date.now() / 1000);
    //console.log("Updating presence of", from, currentTimeInSeconds);
    this._agentPresences[from] = currentTimeInSeconds;
    this._livePeers = this.profilesZvm.getAgents(); // TODO: implement real presence logic
    this.notifySubscribers();
  }


  /** -- Signaling -- */

  /** */
  handleSignal(appSignal: AppSignal) {
    console.log("ThreadsDvm.handleSignal()", appSignal);
    if (!("pulses" in (appSignal.payload as Object))) {
      return;
    }
    const signal = appSignal.payload as ThreadsSignal;
    for (const pulse of signal.pulses) {
      /*await*/ this.handleThreadsSignal(pulse, encodeHashToBase64(signal.from));
    }
    this.notifySubscribers();
  }

  /** */
  async handleThreadsSignal(threadsSignal: ThreadsSignalProtocol, from: AgentPubKeyB64): Promise<void> {
    /* Update agent's known presence */
    this.storePresence(from);
    /** */
    if (ThreadsSignalProtocolType.Tip in threadsSignal) {
      return this.handleTip(threadsSignal.Tip as TipProtocol, from);
    }
  }


  /** */
  private async handleTip(tip: TipProtocol, from: AgentPubKeyB64) {
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
      case "Notification": {
        const serNotifTip = (tip as TipProtocolVariantNotification).Notification;
        const notifTip = decode(serNotifTip) as ThreadsNotificationTip;
        const notif: ThreadsNotification = {
          //eventIndex: notifTip.event_index,
          event: notifTip.event,
          createLinkAh: encodeHashToBase64(notifTip.link_ah),
          author: encodeHashToBase64(notifTip.author),
          timestamp: notifTip.timestamp,
          content: encodeHashToBase64(notifTip.content),
        }
        this._signaledNotifications.push(notif);
      }
      break;
      default:
        break;
    }
  }


  /** */
  async pingPeers(maybePpHash: ActionHashB64 | null, peers: Array<AgentPubKeyB64>) {
    // const ping: SignalPayload = {
    //   maybePpHash: maybePpHash ? maybePpHash : undefined,
    //   from: this._cellProxy.cell.agentPubKey,
    //   dm: {type: DirectMessageType.Ping, content: this._cellProxy.cell.agentPubKey}
    // };
    // // console.log({signal})
    // this.notifyPeers(ping, peers);
  }


  /** */
  allCurrentOthers(startingAgents: AgentPubKeyB64[] ): AgentPubKeyB64[] {
    const agents = startingAgents;
    console.log("allCurrentOthers", agents)
    console.log("allCurrentOthers", this._agentPresences)
    const currentTime: number = Math.floor(Date.now() / 1000);
    const keysB64 = agents
      .filter((key) => key != this.cell.agentPubKey)
      .filter((key) => {
        const lastPingTime = this._agentPresences[key];
        if (!lastPingTime) return false;
        return (currentTime - lastPingTime) < 5 * 60; // 5 minutes
      });
    console.log({keysB64});
    return keysB64;
  }


  /** -- (un)Publish / Edit -- */

  /** */
  async publishMessage(beadType: BaseBeadType, content: TypedContent, ppAh: ActionHashB64, author?: AgentPubKeyB64, prevBead?: ActionHashB64): Promise<ActionHashB64> {
    const isDmThread = this.threadsZvm.isThreadDm(ppAh);
    if (isDmThread) {
      return this.publishDm(isDmThread, beadType, content, prevBead);
    }
    return this.publishTypedBead(beadType, content, ppAh, author, prevBead);
  }


  /** */
  async publishDm(otherAgent: AgentPubKeyB64, beadType: BaseBeadType, content: TypedContent, prevBead?: ActionHashB64): Promise<ActionHashB64> {
    const dmAh = this.threadsZvm.perspective.dmAgents[otherAgent];
    /** Create or grab DmThread */
    let ppAh: ActionHashB64;
    if (!dmAh) {
      ppAh = await this.threadsZvm.createDmThread(otherAgent);
    } else {
      ppAh = dmAh;
    }
    /** Create Bead */
    const bead = await this.threadsZvm.createNextBead(ppAh, prevBead);
    const typed = await this.threadsZvm.content2Typed(bead, content, beadType);
    const base = bead2base(typed, beadType);
    const encBead = await this.threadsZvm.zomeProxy.encryptBead({base, otherAgent: decodeHashFromBase64(otherAgent)});
    let beadAh = await this.publishTypedBead(ThreadsEntryType.EncryptedBead, {encBead, otherAgent: decodeHashFromBase64(otherAgent)}, ppAh);
    return beadAh;
  }


  /** */
  async publishTypedBead(beadType: BeadType, content: TypedContent | EncryptedBeadContent, ppAh: ActionHashB64, author?: AgentPubKeyB64, prevBead?: ActionHashB64): Promise<ActionHashB64> {
    /** */
    let [ah, _time_anchor, _creation_ts, _typed] = await this.threadsZvm.publishTypedBead(beadType, content, ppAh, author, prevBead);
    /** Erase saved input */
    delete this._threadInputs[ppAh];
    /** */
    return ah;
  }


  /** */
  async editSemanticTopic(old_eh: EntryHashB64, title: string): Promise<EntryHashB64> {
    let eh = await this.threadsZvm.editSemanticTopic(old_eh, title);
    //const tip: TipProtocol = {type: "UpdateSemanticTopic", old_topic_eh: old_eh, new_topic_eh: eh, title};
    //await this.broadcastTip(tip);
    return eh;
  }


  /** */
  async publishCommentThread(subject: Subject, subject_name: string): Promise<ActionHashB64> {
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
  async publishEmoji(beadAh: ActionHashB64, emoji: string) {
    const has = this.threadsZvm.hasEmojiReaction(beadAh, this.cell.agentPubKey, emoji);
    if (has) {
      return;
    }
    await this.threadsZvm.zomeProxy.publishReaction({bead_ah: decodeHashFromBase64(beadAh), emoji});
  }


  /** */
  async unpublishEmoji(beadAh: ActionHashB64, emoji: string) {
    const has = this.threadsZvm.hasEmojiReaction(beadAh, this.cell.agentPubKey, emoji);
    if (!has) {
      return;
    }
    await this.threadsZvm.zomeProxy.unpublishReaction(decodeHashFromBase64(beadAh));
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
    //console.log("Dvm.exportPerspective()", name)
    const dvmExport = {};
    //for (const [name, zvm] of Object.entries(this._zomeViewModels)) {
    const tJson = this.threadsZvm.exportPerspective(this.authorshipZvm);
    dvmExport[ThreadsZvm.DEFAULT_ZOME_NAME] = JSON.parse(tJson);

    const pJson = this.profilesZvm.exportPerspective(/*this.originalsZvm*/);
    dvmExport[ProfilesZvm.DEFAULT_ZOME_NAME] = JSON.parse(pJson);
    //}

    const oJson = this.authorshipZvm.exportPerspective();
    dvmExport[AuthorshipZvm.DEFAULT_ZOME_NAME] = JSON.parse(oJson);

    //const dvmJson = this.exportDvmPerspective();
    //dvmExport[ThreadsDvm.DEFAULT_BASE_ROLE_NAME] = dvmJson;

    return JSON.stringify(dvmExport, null, 2);
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
    await this.profilesZvm.importPerspective(JSON.stringify(profiles), canPublish);
    await this.threadsZvm.importPerspective(JSON.stringify(threadsPersp), canPublish, this.authorshipZvm);

    console.log("import perspective", this.authorshipZvm.perspective);

    this.notifySubscribers();
  }
}
