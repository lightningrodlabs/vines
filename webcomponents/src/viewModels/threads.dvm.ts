import {delay, DnaViewModel} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "./threads.zvm";
import {
  ActionHashB64,
  AgentPubKeyB64,
  AppSignal, AppSignalCb,
  decodeHashFromBase64, encodeHashToBase64,
  EntryHashB64
} from "@holochain/client";
import {
  DirectGossip, DirectGossipType, NotifiableEventType,
  ParticipationProtocol,
  SignalPayloadType,
  TextMessage,
  THREADS_DEFAULT_ROLE_NAME, ThreadsEntryType, WeaveNotification, WeaveSignal
} from "../bindings/threads.types";
import {AnyLinkableHashB64} from "./threads.perspective";
import {AppletId, Hrl} from "@lightningrodlabs/we-applet";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {decode} from "@msgpack/msgpack";



/** */
export interface ThreadsDnaPerspective {
  agentPresences: Record<AgentPubKeyB64, number>,
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
  static readonly ZVM_DEFS = [ThreadsZvm, ProfilesZvm/*, PathExplorerZvm*/ ]

  readonly signalHandler?: AppSignalCb = this.handleSignal;


  /** QoL Helpers */
  get profilesZvm(): ProfilesZvm {
    return this.getZomeViewModel(ProfilesZvm.DEFAULT_ZOME_NAME) as ProfilesZvm;
  }

  get threadsZvm(): ThreadsZvm {
    return this.getZomeViewModel(ThreadsZvm.DEFAULT_ZOME_NAME) as ThreadsZvm;
  }


  /** -- Perspective -- */

  protected hasChanged(): boolean {
    // TODO
    return true
  }

  get perspective(): ThreadsDnaPerspective {
    return {
      agentPresences: this._agentPresences,
      signaledNotifications: this._signaledNotifications,
    }
  }

  /** agentPubKey -> timestamp */
  private _agentPresences: Record<string, number> = {};

  private _signaledNotifications: WeaveNotification[] = [];


  /** -- Methods -- */

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

    /** Store received Entry */
    if (NotifiableEventType.Mention in notif.event || NotifiableEventType.Reply in notif.event) {
      const tm: TextMessage = decode(extra) as TextMessage;
      console.log("Received NotificationSignal of type TextMessage:", tm);
      await this.threadsZvm.storeTextMessage(encodeHashToBase64(notif.content), notif.timestamp, encodeHashToBase64(notif.author), tm, false, true);
    }
    if (NotifiableEventType.Fork in notif.event) {
      const pp: ParticipationProtocol = decode(extra) as ParticipationProtocol;
      console.log("Received NotificationSignal of type ParticipationProtocol:", pp);
      await this.threadsZvm.storePp(encodeHashToBase64(notif.content), pp, notif.timestamp, true, true);
    }

    /** Store Notification */
    this._signaledNotifications.push(notif);
    this.threadsZvm.storeInboxItem(notif);
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
        this.threadsZvm.storePp(newPpAh, pp, tss, false, true);
        break;
      case DirectGossipType.NewBead:
        const [ts, beadAh, beadType, ppAh, beadData] = gossip.content;
        console.log("Signal is NewBead of type", beadType);
        if (beadType == ThreadsEntryType.TextMessage) {
          ///*await */this.threadsZvm.fetchTextMessage(decodeHashFromBase64(beadAh), true);
          const tm: TextMessage = {
            value: new TextDecoder().decode(new Uint8Array(beadData)),
            bead: { forProtocolAh: decodeHashFromBase64(ppAh)}
          }
          /* await*/ this.threadsZvm.storeTextMessage(beadAh, ts, weaveSignal.from, tm, true, true);
        } else {
          if (beadType == ThreadsEntryType.EntryBead) {
            ///*await */this.threadsZvm.fetchEntryBead(decodeHashFromBase64(beadAh), true);
            const json = new TextDecoder().decode(new Uint8Array(beadData));
            const entryBead = JSON.parse(json);
            /* await*/ this.threadsZvm.storeEntryBead(beadAh, ts, weaveSignal.from, entryBead, true, true);
          } else {
            ///*await */this.threadsZvm.fetchAnyBead(decodeHashFromBase64(beadAh), true);
            const json = new TextDecoder().decode(new Uint8Array(beadData));
            const anyBead = JSON.parse(json);
            /* await*/ this.threadsZvm.storeAnyBead(beadAh, ts, weaveSignal.from, anyBead, true, true);
          }
        }
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
  async publishEntryBead(eh: EntryHashB64, ppAh: ActionHashB64) {
    let [ah, _time_anchor, creationTime, entryBead] = await this.threadsZvm.publishEntryBead(eh, ppAh);
    /** Send signal to peers */
    const data = JSON.stringify(entryBead);
    const uint8array = Array.from(new TextEncoder().encode(data));
    const signal: WeaveSignal = this.createGossipSignal({type: DirectGossipType.NewBead, content: [creationTime, ah, ThreadsEntryType.EntryBead, ppAh, uint8array]}, ppAh);
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return ah;
  }


  /** */
  async publishHrlBead(hrl: Hrl, ppAh: ActionHashB64): Promise<ActionHashB64> {
    let [ah, _time_anchor, creationTime, anyBead] = await this.threadsZvm.publishHrlBead(hrl, ppAh);
    /** Send signal to peers */
    const data = JSON.stringify(anyBead);
    const uint8array = Array.from(new TextEncoder().encode(data));
    const signal: WeaveSignal = this.createGossipSignal({type: DirectGossipType.NewBead, content: [creationTime, ah, ThreadsEntryType.AnyBead, ppAh, uint8array]}, ppAh);
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return ah;
  }


  /** */
  async publishTextMessage(msg: string, ppAh: ActionHashB64, ments?: AgentPubKeyB64[]): Promise<ActionHashB64> {
    let [ah, _time_anchor, creation_time] = await this.threadsZvm.publishTextMessage(msg, ppAh, ments);
    /** Send signal to peers */
    const uint8array = Array.from(new TextEncoder().encode(msg));
    const signal: WeaveSignal = this.createGossipSignal({type: DirectGossipType.NewBead, content: [creation_time, ah, ThreadsEntryType.TextMessage, ppAh, uint8array]}, ppAh);
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


  /** -- Debug -- */

  /** */
  async generateTestSignals(appletId: AppletId): Promise<void> {
    console.log("generateTestSignals() START");
    const stEh = await this.publishSemanticTopic("signal-topic");
    await delay(1000);
    const [_ts, ppAh, _pp] = await this.publishThreadFromSemanticTopic(appletId, stEh, "testing");
    await delay(1000);
    const msgAh = await this.publishTextMessage("msg-1", ppAh, []);
    console.log("generateTestSignals() END", msgAh);
  }
}
