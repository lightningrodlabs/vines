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
  DirectGossip,
  DirectGossipType,
  NotifiableEventType,
  ParticipationProtocol,
  SignalPayloadType,
  THREADS_DEFAULT_ROLE_NAME,
  ThreadsEntryType, ThreadsProperties,
  WeaveNotification,
  WeaveSignal
} from "../bindings/threads.types";
import {
  AnyLinkableHashB64,
  BeadType,
  materializeTypedBead, ParticipationProtocolMat,
  TypedBead,
} from "./threads.perspective";
import {AppletId, Hrl} from "@lightningrodlabs/we-applet";
import {ProfilesAltZvm, ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {decode, encode} from "@msgpack/msgpack";
import {AuthorshipZvm} from "./authorship.zvm";


/** */
export interface ThreadsDnaPerspective {
  agentPresences: Record<AgentPubKeyB64, number>,
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

  static readonly DEFAULT_BASE_ROLE_NAME = THREADS_DEFAULT_ROLE_NAME;
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
      initialThreadProbeLogTss: this._initialThreadProbeLogTss,
      initialGlobalProbeLogTs: this._initialGlobalProbeLogTs,
      signaledNotifications: this._signaledNotifications,
    }
  }

  /** agentPubKey -> timestamp */
  private _agentPresences: Record<string, number> = {};

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
    console.log("dvm.initializePerspectiveOffline() override")
    await super.initializePerspectiveOffline();
    this._initialGlobalProbeLogTs = this.threadsZvm.perspective.globalProbeLog.ts;
    for (const [ppAh, thread] of this.threadsZvm.perspective.threads) {
        this._initialThreadProbeLogTss[ppAh] = thread.latestProbeLogTime;
    }
    console.log("dvm.initializePerspectiveOffline() override", this.perspective)
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
  private async handleNotificationSignal(notifSignal: WeaveSignal) {
    const notif = notifSignal.payload.content[0] as WeaveNotification;
    const extra: Uint8Array = notifSignal.payload.content[1];

    let ppAh: ActionHashB64;
    /** Store received Entry */
    if (NotifiableEventType.Mention in notif.event || NotifiableEventType.Reply in notif.event || NotifiableEventType.NewBead in notif.event) {
      const {typed, beadType} = decode(extra) as {typed: TypedBead, beadType: BeadType};
      const typedMat = materializeTypedBead(typed, beadType);
      const beadAh = encodeHashToBase64(notif.content);
      ppAh = typedMat.bead.ppAh;
      console.log(`Received NotificationSignal of type ${JSON.stringify(notif.event)}:`, beadAh, typedMat);
      await this.threadsZvm.storeTypedBead(beadAh, typedMat, beadType, notif.timestamp, encodeHashToBase64(notif.author), true, true);
    }
    if (NotifiableEventType.Fork in notif.event) {
      const pp = decode(extra) as ParticipationProtocol;
      ppAh = encodeHashToBase64(notif.content);
      console.log(`Received NotificationSignal of type ${NotifiableEventType.Fork}:`, pp);
      this.threadsZvm.storePp(ppAh, pp, notif.timestamp, encodeHashToBase64(notif.author), true, true); // only real author should notify others
    }

    /** Store Notification */
    this._signaledNotifications.push(notif);
    await this.threadsZvm.storeInboxItem(notif, true, ppAh);
  }


  /** */
  handleSignal(signal: AppSignal) {
    console.log("[threads.dvm] Received Signal", signal);
    if (signal.zome_name === ProfilesZvm.DEFAULT_ZOME_NAME) {
      return;
    }
    const weaveSignal = signal.payload as WeaveSignal;

    /* Update agent's presence stat */
    this.updatePresence(weaveSignal.from);

    /** -- Handle Notification -- */
    if (weaveSignal.payload.type == SignalPayloadType.Notification) {
      return this.handleNotificationSignal(weaveSignal);
    }

    /** -- Handle Gossip -- */
    const gossip = weaveSignal.payload.content as DirectGossip;
    /* Send pong response */
    if (gossip.type != DirectGossipType.Pong) {
      console.log("PONGING ", weaveSignal.from)
      const pong: WeaveSignal = {
        from: this._cellProxy.cell.agentPubKey,
        payload: {type: SignalPayloadType.DirectGossip, content: {type: DirectGossipType.Pong, content: this._cellProxy.cell.agentPubKey}}};
      this.signalPeers(pong, [weaveSignal.from])
    }
    /* Handle signal */
    switch (gossip.type) {
      case DirectGossipType.Ping:
      case DirectGossipType.Pong:
        break;
      case DirectGossipType.NewSemanticTopic:
        const [stEh, title] = gossip.content;
        this.threadsZvm.storeSemanticTopic(stEh, title, false, true);
        break;
      case DirectGossipType.NewPp:
        const [tss, newPpAh, pp] = gossip.content
        ///*await */ this.threadsZvm.fetchPp(newPpAh);
        this.threadsZvm.storePp(newPpAh, pp, tss, weaveSignal.from, false, true);
        break;
      case DirectGossipType.NewBead:
        const [ts, beadAh, beadTypeStr, ppAh, encBead] = gossip.content;
        console.log("Signal is NewBead of type", beadTypeStr);
        const {typed, beadType} = decode(encBead) as {typed: TypedBead, beadType: BeadType};
        console.log("NewBead", typed, beadType, beadTypeStr);
        //const beadType = beadTypeStr as BeadType;
        /* await*/ this.threadsZvm.storeTypedBead(beadAh, materializeTypedBead(typed, beadType), beadType, ts, weaveSignal.from, true, true);
        break;
      case DirectGossipType.EmojiReactionChange:
        const [beadAh2, author, emoji, isAdded] = gossip.content
          if (isAdded) {
            this.threadsZvm.storeEmojiReaction(beadAh2, author, emoji);
          } else {
            this.threadsZvm.unstoreEmojiReaction(beadAh2, author, emoji);
          }
        break;
    }
  }


  /** */
  async signalPeers(signal: WeaveSignal, peers: Array<AgentPubKeyB64>): Promise<void> {
    if (signal.payload.type != SignalPayloadType.DirectGossip) {
      console.error("signalPeers() failed. Can only signal DirectGossip", signal);
      return;
    }
    const filtered = peers.filter((key) => key != this._cellProxy.cell.agentPubKey);
    console.log(`[threads.dvm] signalPeers() Sending DirectGossip "${signal.payload.content.type}" to`, filtered, this._cellProxy.cell.agentPubKey);
    /* Skip if no recipients or sending to self only */
    //if (!peers || peers.length == 1 && peers[0] === this._cellProxy.cell.agentPubKey) {
    if (!filtered || filtered.length == 0) {
      console.log("[threads.dvm] signalPeers() aborted: No recipients for notification")
      return;
    }
    return this.threadsZvm.signalPeers(signal, filtered);
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
  private createGossipSignal(gossip: DirectGossip, maybePpHash?: ActionHashB64): WeaveSignal {
    return {
      maybePpHash,
      from: this._cellProxy.cell.agentPubKey,
      payload: {type: SignalPayloadType.DirectGossip, content: gossip},
    };
  }


  /** */
  async publishTypedBead(beadType: BeadType, content: string | Hrl | EntryHashB64, ppAh: ActionHashB64, author?: AgentPubKeyB64, ments?: AgentPubKeyB64[]): Promise<ActionHashB64> {
    let [ah, _time_anchor, creationTime, typed] = await this.threadsZvm.publishTypedBead(beadType, content, ppAh, author, ments);
    /** Send signal to peers */
    const data = encode({typed, beadType});
    const signal: WeaveSignal = this.createGossipSignal({type: DirectGossipType.NewBead, content: [creationTime, ah, beadType, ppAh, data]}, ppAh);
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return ah;
  }



  /** */
  async publishSemanticTopic(title: string): Promise<EntryHashB64> {
    let eh = await this.threadsZvm.publishSemanticTopic(title);
    const signal: WeaveSignal = this.createGossipSignal({type: DirectGossipType.NewSemanticTopic, content: [eh, title]});
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return eh;
  }


  /** */
  async publishThreadFromSemanticTopic(appletId: AppletId, topicHash: AnyLinkableHashB64, purpose: string): Promise<[number, ActionHashB64, ParticipationProtocol]> {
    let [ts, ah, pp] = await this.threadsZvm.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, topicHash, purpose);
    const signal: WeaveSignal = this.createGossipSignal({type: DirectGossipType.NewPp, content: [ts, ah, pp]}, ah);
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return [ts, ah, pp];
  }


  /** */
  async publishEmoji(beadAh: ActionHashB64, emoji: string) {
    const succeeded = await this.threadsZvm.storeEmojiReaction(beadAh, this.cell.agentPubKey, emoji);
    if (!succeeded) {
      return;
    }
    await this.threadsZvm.zomeProxy.addReaction({bead_ah: decodeHashFromBase64(beadAh), emoji});
    /** Send signal to peers */
    const signal: WeaveSignal = this.createGossipSignal({type: DirectGossipType.EmojiReactionChange, content: [beadAh, this.cell.agentPubKey, emoji, true]});
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
  }


  /** */
  async unpublishEmoji(beadAh: ActionHashB64, emoji: string) {
    await this.threadsZvm.zomeProxy.removeReaction(decodeHashFromBase64(beadAh));
    await this.threadsZvm.unstoreEmojiReaction(beadAh, this.cell.agentPubKey, emoji);
    /** Send signal to peers */
    const signal: WeaveSignal = this.createGossipSignal({type: DirectGossipType.EmojiReactionChange, content: [beadAh, this.cell.agentPubKey, emoji, false]});
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
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
