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
  DirectMessage,
  DirectMessageType, NotifiableEventType,
  ParticipationProtocol,
  SignalPayloadType,
  TextMessage,
  THREADS_DEFAULT_ROLE_NAME, WeaveNotification, WeaveSignal
} from "../bindings/threads.types";
import {AnyLinkableHashB64} from "./threads.perspective";
import {AppletId, Hrl, WeNotification} from "@lightningrodlabs/we-applet";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {toasty} from "../toast";
import {mdiAlertOctagonOutline, mdiAlertOutline, mdiCheckCircleOutline, mdiInformationOutline, mdiCog} from "@mdi/js";
import {timeSince} from "../utils";


/** */
export interface ThreadsDnaPerspective {
  agentPresences: Record<AgentPubKeyB64, number>,
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
    return this.getZomeViewModel(ProfilesZvm.DEFAULT_ZOME_NAME) as ProfilesZvm
  }

  get threadsZvm(): ThreadsZvm {
    return this.getZomeViewModel(ThreadsZvm.DEFAULT_ZOME_NAME) as ThreadsZvm
  }


  /** -- Perspective -- */

  protected hasChanged(): boolean {
    return true
  }

  get perspective(): ThreadsDnaPerspective {
    return {
      agentPresences: this._agentPresences,
    }
  }

  /** agentPubKey -> timestamp */
  private _agentPresences: Record<string, number> = {};


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
  handleSignal(signal: AppSignal) {
    console.log("[threads.dvm] Received Signal", signal);
    if (signal.zome_name === ProfilesZvm.DEFAULT_ZOME_NAME) {
      return;
    }
    const weaveSignal = signal.payload as WeaveSignal;
    //const signalPayload = weaveSignal.payload;
    /* Update agent's presence stat */
    this.updatePresence(weaveSignal.from);

    /** -- Handle Notification -- */
    if (weaveSignal.payload.type == SignalPayloadType.Notification) {
      const notif = weaveSignal.payload.content as WeaveNotification;
      const author = this.profilesZvm.perspective.profiles[notif.author]? this.profilesZvm.perspective.profiles[notif.author].nickname : "unknown";
      const date = new Date(notif.timestamp / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
      const date_str = timeSince(date) + " ago";
      let message = `From ${author} | ${date_str}`;
      // FIXME handle notifications
      switch (notif.event.type as NotifiableEventType) {
        case NotifiableEventType.Mention:
          this.threadsZvm.storeMention(encodeHashToBase64(notif.event.content[0]), weaveSignal.from, encodeHashToBase64(notif.event.content[1]));
          break;
        case NotifiableEventType.Dm:
        case NotifiableEventType.Reply:
        case NotifiableEventType.Fork:
          break;
        default:
          console.error("Bad eventType", notif.event.type);
          break;
      }
      /** in-app toast */
      toasty(notif.title, message);
      // /** We Notification */
      // if (this.weServices) {
      //   const myNotif: WeNotification  = {
      //     title: notif.title,
      //     body: message,
      //     notification_type: notif.event.type,
      //     icon_src: wrapPathInSvg(mdiInformationOutline),
      //     urgency: 'medium',
      //     timestamp: notif.timestamp,
      //   }
      //   this.weServices.notifyWe([myNotif]);
      return;
    }

    /** -- Handle DM -- */
    const dm = weaveSignal.payload.content as DirectMessage;
    /* Send pong response */
    if (dm.type != DirectMessageType.Pong) {
      console.log("PONGING ", weaveSignal.from)
      const pong: WeaveSignal = {
        from: this._cellProxy.cell.agentPubKey,
        payload: {type: SignalPayloadType.Dm, content: {type: DirectMessageType.Pong, content: this._cellProxy.cell.agentPubKey}}};
      this.signalPeers(pong, [weaveSignal.from])
    }
    /* Handle signal */
    switch (dm.type) {
      case DirectMessageType.Ping:
      case DirectMessageType.Pong:
        break;
      case DirectMessageType.NewSemanticTopic:
        const [stEh, title] = dm.content;
        this.threadsZvm.storeSemanticTopic(stEh, title, false, true);
        break;
      case DirectMessageType.NewPp:
        const [tss, newPpAh, pp] = dm.content
        ///*await */ this.threadsZvm.fetchPp(newPpAh);
        this.threadsZvm.storePp(newPpAh, pp, tss, false, true);
        break;
      case DirectMessageType.NewBead:
        const [ts, beadAh, beadType, ppAh, beadData] = dm.content;
        console.log("Signal is NewBead of type", beadType);
        if (beadType == "TextMessage") {
          ///*await */this.threadsZvm.fetchTextMessage(decodeHashFromBase64(beadAh), true);
          const tm: TextMessage = {
            value: new TextDecoder().decode(new Uint8Array(beadData)),
            bead: { forProtocolAh: decodeHashFromBase64(ppAh)}
          }
          this.threadsZvm.storeTextMessage(beadAh, ts, weaveSignal.from, tm, true, true);
        } else {
          if (beadType == "EntryBead") {
            ///*await */this.threadsZvm.fetchEntryBead(decodeHashFromBase64(beadAh), true);
            const json = new TextDecoder().decode(new Uint8Array(beadData));
            const entryBead = JSON.parse(json);
            this.threadsZvm.storeEntryBead(beadAh, ppAh, ts, weaveSignal.from, entryBead, true, true);
          } else {
            ///*await */this.threadsZvm.fetchAnyBead(decodeHashFromBase64(beadAh), true);
            const json = new TextDecoder().decode(new Uint8Array(beadData));
            const anyBead = JSON.parse(json);
            this.threadsZvm.storeAnyBead(beadAh, ppAh, ts, weaveSignal.from, anyBead, true, true);
          }
        }
        break;
      case DirectMessageType.EmojiReactionChange:
        const [beadAh2, author, emoji, isAdded] = dm.content
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
    if (signal.payload.type != SignalPayloadType.Dm) {
      console.error("signalPeers() failed. Can only signal DMs", signal);
      return;
    }
    const filtered = peers.filter((key) => key != this._cellProxy.cell.agentPubKey);
    console.log(`[threads.dvm] signalPeers() Sending DM "${signal.payload.content.type}" to`, filtered, this._cellProxy.cell.agentPubKey);
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

  private createDmSignal(dm: DirectMessage, maybePpHash?: ActionHashB64): WeaveSignal {
    return {
      maybePpHash,
      from: this._cellProxy.cell.agentPubKey,
      payload: {type: SignalPayloadType.Dm, content: dm},
    };
  }

  /** */
  async publishEntryBead(eh: EntryHashB64, ppAh: ActionHashB64) {
    let [ah, _time_anchor, creationTime, entryBead] = await this.threadsZvm.publishEntryBead(eh, ppAh);
    /** Send signal to peers */
    const data = JSON.stringify(entryBead);
    const uint8array = Array.from(new TextEncoder().encode(data));
    const signal: WeaveSignal = this.createDmSignal({type: DirectMessageType.NewBead, content: [creationTime, ah, "EntryBead", ppAh, uint8array]}, ppAh);
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return ah;
  }


  /** */
  async publishHrlBead(hrl: Hrl, ppAh: ActionHashB64): Promise<ActionHashB64> {
    let [ah, _time_anchor, creationTime, anyBead] = await this.threadsZvm.publishHrlBead(hrl, ppAh);
    /** Send signal to peers */
    const data = JSON.stringify(anyBead);
    const uint8array = Array.from(new TextEncoder().encode(data));
    const signal: WeaveSignal = this.createDmSignal({type: DirectMessageType.NewBead, content: [creationTime, ah, "AnyBead", ppAh, uint8array]}, ppAh);
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return ah;
  }


  /** */
  async publishTextMessage(msg: string, ppAh: ActionHashB64, ments?: AgentPubKeyB64[]): Promise<ActionHashB64> {
    let [ah, _time_anchor, creation_time] = await this.threadsZvm.publishTextMessage(msg, ppAh, ments);
    /** Send signal to peers */
    const uint8array = Array.from(new TextEncoder().encode(msg));
    const signal: WeaveSignal = this.createDmSignal({type: DirectMessageType.NewBead, content: [creation_time, ah, "TextMessage", ppAh, uint8array]}, ppAh);
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return ah;
  }


  /** */
  async publishSemanticTopic(title: string): Promise<EntryHashB64> {
    let eh = await this.threadsZvm.publishSemanticTopic(title);
    const signal: WeaveSignal = this.createDmSignal({type: DirectMessageType.NewSemanticTopic, content: [eh, title]});
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
    return eh;
  }


  /** */
  async publishThreadFromSemanticTopic(appletId: AppletId, topicHash: AnyLinkableHashB64, purpose: string): Promise<[number, ActionHashB64, ParticipationProtocol]> {
    let [ts, ah, pp] = await this.threadsZvm.publishThreadFromSemanticTopic(appletId, this.cell.dnaHash, topicHash, purpose);
    const signal: WeaveSignal = this.createDmSignal({type: DirectMessageType.NewPp, content: [ts, ah, pp]}, ah);
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
    const signal: WeaveSignal = this.createDmSignal({type: DirectMessageType.EmojiReactionChange, content: [beadAh, this.cell.agentPubKey, emoji, true]});
    await this.signalPeers(signal, this.profilesZvm.getAgents()/*this.allCurrentOthers()*/);
  }

  /** */
  async unpublishEmoji(beadAh: ActionHashB64, emoji: string) {
    await this.threadsZvm.zomeProxy.removeReaction(decodeHashFromBase64(beadAh));
    await this.threadsZvm.unstoreEmojiReaction(beadAh, this.cell.agentPubKey, emoji);
    /** Send signal to peers */
    const signal: WeaveSignal = this.createDmSignal({type: DirectMessageType.EmojiReactionChange, content: [beadAh, this.cell.agentPubKey, emoji, false]});
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
