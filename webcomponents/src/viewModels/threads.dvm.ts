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
  NotifiableEvent,
  NotifySetting,
  ParticipationProtocol,
  Subject,
  ThreadsEntryType,
  ThreadsProperties,
  VINES_DEFAULT_ROLE_NAME,
  WeaveNotification,
  ThreadsSignal,
  ThreadsSignalProtocol,
  ThreadsNotification,
  DirectGossipProtocol,
  DirectGossipProtocolVariantUpdateSemanticTopic,
  DirectGossipProtocolVariantNewSemanticTopic,
  DirectGossipProtocolVariantNewPp,
  DirectGossipProtocolVariantNewBead,
  DirectGossipProtocolVariantEmojiReactionChange, ThreadsSignalProtocolType,
} from "../bindings/threads.types";
import {
  AnyLinkableHashB64, BaseBeadType, bead2base,
  BeadType, dematerializeParticipationProtocol, EncryptedBeadContent,
  materializeTypedBead,
  TypedBead, TypedContent,
} from "./threads.perspective";
import {AppletId} from "@lightningrodlabs/we-applet";
import {ProfilesAltZvm, ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {decode, encode} from "@msgpack/msgpack";
import {AuthorshipZvm} from "./authorship.zvm";


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
  signaledNotifications: WeaveNotification[],
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

  get originalsZvm(): AuthorshipZvm {
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

  private _signaledNotifications: WeaveNotification[] = [];


  /** */
  get dnaProperties(): ThreadsProperties {
    //console.log('dnaProperties() dnaModifiers', this.cell.dnaModifiers);
    const properties = decode(this.cell.dnaModifiers.properties as Uint8Array) as ThreadsProperties;
    //console.log('dnaProperties() properties', properties);
    return properties;
  }


  /** -- Methods -- */

  /** Store probeLog timestamp upon first load of app */
  async initializePerspectiveOffline(): Promise<void> {
    console.log("ThreadsDvm.initializePerspectiveOffline() override")
    await super.initializePerspectiveOffline();
    this._initialGlobalProbeLogTs = this.threadsZvm.perspective.globalProbeLog.ts;
    for (const [ppAh, thread] of this.threadsZvm.perspective.threads) {
        this._initialThreadProbeLogTss[ppAh] = thread.latestProbeLogTime;
    }
    console.log("ThreadsDvm.initializePerspectiveOffline() override persp =", this.perspective)
  }


  /** */
  private updatePresence(from: AgentPubKeyB64) {
    const currentTimeInSeconds: number = Math.floor(Date.now() / 1000);
    console.log("Updating presence of", from, currentTimeInSeconds);
    this._agentPresences[from] = currentTimeInSeconds;
    this.notifySubscribers();
  }


  /** -- Signaling -- */

  /** */
  private async handleNotificationSignal(notifSignal: ThreadsNotification, from: AgentPubKeyB64) {
    const notif = notifSignal.notification as WeaveNotification;
    const extra: Uint8Array = notifSignal.data;

    let ppAh: ActionHashB64;
    /** Store received Entry */
    if (NotifiableEvent.Mention == notif.event || NotifiableEvent.Reply == notif.event || NotifiableEvent.NewBead == notif.event) {
      const {typed, beadType} = decode(extra) as {typed: TypedBead, beadType: BeadType};
      const typedMat = materializeTypedBead(typed, beadType);
      const beadAh = encodeHashToBase64(notif.content);
      //ppAh = typedMat.bead.ppAh;
      // if (!notifSignal.maybePpHash) {
      //   console.error("Missing ppAh in ThreadsSignal");
      // }
      ppAh = encodeHashToBase64(notifSignal.pp_ah);
      console.log(`Received NotificationSignal of type ${JSON.stringify(notif.event)}:`, beadAh, typedMat);
      await this.threadsZvm.storeTypedBead(beadAh, typedMat, beadType, notif.timestamp, encodeHashToBase64(notif.author), true, true);
    }
    /* Set notif setting */
    if (NotifiableEvent.NewDmThread == notif.event) {
      ppAh = encodeHashToBase64(notif.content);
      /* skip if known thread */
      const dmThread = this.threadsZvm.perspective.threads.get(ppAh);
      if (dmThread) {
        return;
      }
      /** Store thread */
      const pp = decode(extra) as ParticipationProtocol;
      this.threadsZvm.storeThread(ppAh, pp, notif.timestamp, encodeHashToBase64(notif.author), false, true);
      /* Set NotifSetting */
      console.log("NewDmThread.publishNotifSetting() signal", ppAh);
      await this.threadsZvm.publishNotifSetting(ppAh, NotifySetting.AllMessages);
    }
    if (NotifiableEvent.Fork === notif.event) {
      const pp = decode(extra) as ParticipationProtocol;
      ppAh = encodeHashToBase64(notif.content);
      console.log(`Received NotificationSignal of type ${NotifiableEvent.Fork}:`, pp);
      this.threadsZvm.storeThread(ppAh, pp, notif.timestamp, encodeHashToBase64(notif.author), false, true);
    }

    /** Store Notification */
    this._signaledNotifications.push(notif);
    await this.threadsZvm.storeInboxItem(notif, true, ppAh);
  }


  /** */
  handleSignal(signal: AppSignal) {
    console.log("[threads.dvm] Received Signal", signal);
    if (signal.zome_name !== ThreadsZvm.DEFAULT_ZOME_NAME) {
      return;
    }
    const threadsSignal = signal.payload as ThreadsSignal;
    console.log("THREADS received signal", threadsSignal);
    if (!("signal" in threadsSignal)) {
      return;
    }
    for (const signal of threadsSignal.signal) {
      /*await*/ this.handleThreadsSignal(signal, encodeHashToBase64(threadsSignal.from));
    }
    this.notifySubscribers();
  }


  /** */
  async handleThreadsSignal(threadsSignal: ThreadsSignalProtocol, from: AgentPubKeyB64): Promise<void> {
    /* Update agent's presence stat */
    this.updatePresence(from);
    /** -- Handle Signal according to type -- */
    if (ThreadsSignalProtocolType.Notification in threadsSignal) {
      return this.handleNotificationSignal(threadsSignal.Notification as ThreadsNotification, from);
    }
    if (ThreadsSignalProtocolType.Gossip in threadsSignal) {
      return this.handleGossip(threadsSignal.Gossip as DirectGossipProtocol, from);
    }
  }


  /** */
  private async handleGossip(gossip: DirectGossipProtocol, from: AgentPubKeyB64) {
    //const gossip = threadsSignal.payload.value as DirectGossip;
    /* Send pong response */
    if (gossip.type != "Pong") {
      console.log("PONGING ", from)
      const pong: DirectGossipProtocol = {type: "Pong", from: this._cellProxy.cell.agentPubKey};
      this.broadcastGossip(pong, [from])
    }
    /* Handle signal */
    switch (gossip.type) {
      case "Ping":
      case "Pong":
      break;
      case "UpdateSemanticTopic": {
        const {old_topic_eh, new_topic_eh, title} = gossip as DirectGossipProtocolVariantUpdateSemanticTopic;
        this.threadsZvm.unstoreSemanticTopic(old_topic_eh);
        this.threadsZvm.storeSemanticTopic(new_topic_eh, title, false, true);
      }
      break;
      case "NewSemanticTopic":
        const {topic_eh, title} = gossip as DirectGossipProtocolVariantNewSemanticTopic;
        this.threadsZvm.storeSemanticTopic(topic_eh, title, false, true);
        break;
      case "NewPp": {
        const {creation_ts, ah, pp} = gossip as DirectGossipProtocolVariantNewPp;
        ///*await */ this.threadsZvm.fetchPp(newPpAh);
        this.threadsZvm.storeThread(ah, pp, creation_ts, from, false, true);
      }
      break;
      case "NewBead":
        const {creation_ts, bead_ah, bead_type, pp_ah, data} = gossip as DirectGossipProtocolVariantNewBead;
        console.log("Signal is NewBead of type", bead_type);
        const {typed, beadType} = decode(data) as {typed: TypedBead, beadType: BeadType};
        console.log("NewBead", bead_ah, typed, beadType, bead_type);
        //const beadType = beadTypeStr as BeadType;
        /* await*/ this.threadsZvm.storeTypedBead(bead_ah, materializeTypedBead(typed, beadType), beadType, creation_ts, from, true, true);
      break;
      case "EmojiReactionChange": {
        const {bead_ah, author, emoji, is_added} = gossip as DirectGossipProtocolVariantEmojiReactionChange;
        if (is_added) {
          this.threadsZvm.storeEmojiReaction(bead_ah, author, emoji);
        } else {
          this.threadsZvm.unstoreEmojiReaction(bead_ah, author, emoji);
        }
      }
      break;
    }
  }


  /** */
  async broadcastGossip(gossip: DirectGossipProtocol, peers: Array<AgentPubKeyB64>): Promise<void> {
    const filtered = peers.filter((key) => key != this._cellProxy.cell.agentPubKey);
    console.log(`[threads.dvm] broadcastGossip() Sending DirectGossip "${gossip.type}" to`, filtered, this._cellProxy.cell.agentPubKey);
    /* Skip if no recipients or sending to self only */
    //if (!peers || peers.length == 1 && peers[0] === this._cellProxy.cell.agentPubKey) {
    if (!filtered || filtered.length == 0) {
      console.log("[threads.dvm] broadcastGossip() aborted: No recipients for notification")
      return;
    }
    return this.threadsZvm.broadcastGossip(gossip, filtered);
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


  /** -- Call ZVM and signal peers -- */


  /** */
  async publishMessage(beadType: BaseBeadType, content: TypedContent, ppAh: ActionHashB64, author?: AgentPubKeyB64, ments?: AgentPubKeyB64[], prevBead?: ActionHashB64): Promise<ActionHashB64> {
    const isDmThread = this.threadsZvm.isThreadDm(ppAh);
    if (isDmThread) {
      return this.publishDm(isDmThread, beadType, content, prevBead);
    }
    return this.publishTypedBead(beadType, content, ppAh, author, ments, prevBead);
  }


  /** */
  async publishDm(otherAgent: AgentPubKeyB64, beadType: BaseBeadType, content: TypedContent, prevBead?: ActionHashB64): Promise<ActionHashB64> {
    const dmPair = this.threadsZvm.perspective.dmAgents[otherAgent];
    /** Create or grab DmThread */
    let ppAh: ActionHashB64;
    if (!dmPair) {
      ppAh = await this.threadsZvm.createDmThread(otherAgent);
    } else {
      ppAh = dmPair[0];
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
  async publishTypedBead(beadType: BeadType, content: TypedContent | EncryptedBeadContent, ppAh: ActionHashB64, author?: AgentPubKeyB64, ments?: AgentPubKeyB64[], prevBead?: ActionHashB64): Promise<ActionHashB64> {
    let [ah, _time_anchor, creation_ts, typed] = await this.threadsZvm.publishTypedBead(beadType, content, ppAh, author, ments, prevBead);
    /** Erase saved input */
    delete this._threadInputs[ppAh];
    /** Send gossip to peers */
    await delay(100); // Wait a bit because recipients don't handle signals with async and there could be two NewBead signals.
    const data = encode({typed, beadType});
    const gossip: DirectGossipProtocol = {type: "NewBead", creation_ts, bead_ah: ah, bead_type: beadType, pp_ah: ppAh, data};
    await this.broadcastGossip(gossip, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return ah;
  }



  /** */
  async editSemanticTopic(old_eh: EntryHashB64, title: string): Promise<EntryHashB64> {
    let eh = await this.threadsZvm.editSemanticTopic(old_eh, title);
    const gossip: DirectGossipProtocol = {type: "UpdateSemanticTopic", old_topic_eh: old_eh, new_topic_eh: eh, title};
    await this.broadcastGossip(gossip, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return eh;
  }


  /** */
  async publishSemanticTopic(title: string): Promise<EntryHashB64> {
    let topic_eh = await this.threadsZvm.publishSemanticTopic(title);
    const gossip: DirectGossipProtocol = {type: "NewSemanticTopic", topic_eh, title};
    await this.broadcastGossip(gossip, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return topic_eh;
  }


  /** */
  async publishThreadFromSemanticTopic(appletId: AppletId, topicHash: AnyLinkableHashB64, purpose: string): Promise<[number, ActionHashB64, ParticipationProtocol]> {
    let [creation_ts, ah, pp] = await this.threadsZvm.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, topicHash, purpose);
    const gossip: DirectGossipProtocol = {type: "NewPp", creation_ts, ah, pp};
    await this.broadcastGossip(gossip, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return [creation_ts, ah, pp];
  }


  /** */
  async publishCommentThread(subject: Subject, subject_name: string): Promise<ActionHashB64> {
    const pp: ParticipationProtocol = {
      purpose: "comment",
      rules: "N/A",
      subject,
      subject_name,
    };
    const [creation_ts, ppAh, ppMat] = await this.threadsZvm.publishParticipationProtocol(pp);
    const gossip: DirectGossipProtocol = {type: "NewPp", creation_ts, ah: ppAh, pp: dematerializeParticipationProtocol(ppMat)};
    await this.broadcastGossip(gossip, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return ppAh;
  }


  /** */
  async publishEmoji(beadAh: ActionHashB64, emoji: string) {
    const succeeded = await this.threadsZvm.storeEmojiReaction(beadAh, this.cell.agentPubKey, emoji);
    if (!succeeded) {
      return;
    }
    await this.threadsZvm.zomeProxy.addReaction({bead_ah: decodeHashFromBase64(beadAh), emoji});
    /** Send signal to peers */
    const gossip: DirectGossipProtocol = {type: "EmojiReactionChange", bead_ah: beadAh, author: this.cell.agentPubKey, emoji, is_added: true};
    await this.broadcastGossip(gossip, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
  }


  /** */
  async unpublishEmoji(beadAh: ActionHashB64, emoji: string) {
    await this.threadsZvm.zomeProxy.removeReaction(decodeHashFromBase64(beadAh));
    await this.threadsZvm.unstoreEmojiReaction(beadAh, this.cell.agentPubKey, emoji);
    /** Send signal to peers */
    const gossip: DirectGossipProtocol = {type: "EmojiReactionChange", bead_ah: beadAh, author: this.cell.agentPubKey, emoji, is_added: false};
    await this.broadcastGossip(gossip, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
  }


  /** -- Import & Export -- */

  /** Probe all threads before exporting */
  async exportAllPerspective(): Promise<string> {
    await this.threadsZvm.probeAllInnerAsync();
    /* Probe all threads */
    let probes = []
    for (const [ppAh, thread] of this.threadsZvm.perspective.threads) {
      probes.push(this.threadsZvm.probeAllBeads(ppAh));
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
    const tJson = this.threadsZvm.exportPerspective(this.originalsZvm);
    dvmExport[ThreadsZvm.DEFAULT_ZOME_NAME] = JSON.parse(tJson);

    const pJson = this.profilesZvm.exportPerspective(/*this.originalsZvm*/);
    dvmExport[ProfilesZvm.DEFAULT_ZOME_NAME] = JSON.parse(pJson);
    //}

    const oJson = this.originalsZvm.exportPerspective();
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


    this.originalsZvm.importPerspective(JSON.stringify(originals));
    await this.profilesZvm.importPerspective(JSON.stringify(profiles), canPublish);
    await this.threadsZvm.importPerspective(JSON.stringify(threadsPersp), canPublish, this.originalsZvm);

    console.log("import perspective", this.originalsZvm.perspective);

    this.notifySubscribers();
  }


  /** -- Debug -- */

  /** */
  async generateTestSignals(appletId: AppletId): Promise<void> {
    console.log("generateTestSignals() START");
    const stEh = await this.publishSemanticTopic("signal-topic");
    await delay(1000);
    const [_ts, ppAh, _pp] = await this.publishThreadFromSemanticTopic(appletId, stEh, "testing");
    await delay(1000);
    const msgAh = await this.publishTypedBead(ThreadsEntryType.TextBead, "msg-1", ppAh, this.cell.agentPubKey, []);
    console.log("generateTestSignals() END", msgAh);
  }
}
