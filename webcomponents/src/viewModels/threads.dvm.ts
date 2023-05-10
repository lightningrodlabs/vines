import {DnaViewModel} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "./threads.zvm";
import {ProfilesZvm} from "./profiles.zvm";
import {
  ActionHashB64,
  AgentPubKeyB64,
  AppSignal,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHashB64
} from "@holochain/client";
import {DirectMessageType, SignalPayload} from "../bindings/threads.types";
import {AnyLinkableHashB64} from "./threads.perspective";


/** */
export interface ThreadsDnaPerspective {
  agentPresences: Record<string, number>,
}


/**
 * ViewModel fo the Threads DNA
 * Holds two zomes:
 *  - Threads
 *  - Profiles
 */
export class ThreadsDvm extends DnaViewModel {

  static readonly DEFAULT_BASE_ROLE_NAME = "rThreads";
  static readonly ZVM_DEFS = [ThreadsZvm, ProfilesZvm]
  readonly signalHandler = undefined;

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
    console.log("Received Signal", signal);
    if (signal.zome_name === ProfilesZvm.DEFAULT_ZOME_NAME) {
      return;
    }
    const signalPayload = signal.payload as SignalPayload;
    /* Update agent's presence stat */
    this.updatePresence(signalPayload.from)
    /* Send pong response */
    if (signalPayload.dm.type != DirectMessageType.Pong) {
      console.log("PONGING ", signalPayload.from)
      const pong: SignalPayload = {
        maybePpHash: signalPayload.maybePpHash,
        from: this._cellProxy.cell.agentPubKey,
        dm: {type: DirectMessageType.Pong, content: this._cellProxy.cell.agentPubKey}
      };
      this.notifyPeers(pong, [signalPayload.from])
    }
    /* Handle signal */
    switch (signalPayload.dm.type) {
      case DirectMessageType.Ping:
      case DirectMessageType.Pong:
        break;
      case DirectMessageType.NewSemanticTopic:
        const [stEh, title] = signalPayload.dm.content;
        this.threadsZvm.storeSemanticTopic(stEh, title);
        break;
      case DirectMessageType.NewPp:
        const ppAh = signalPayload.dm.content
        /*await */ this.threadsZvm.fetchPp(ppAh);
        break;
      case DirectMessageType.NewBead:
        const [beadAh, beadType, _beadData] = signalPayload.dm.content;
        console.log("Signal is NewBead of type", beadType);
        if (beadType == "TextMessage") {
          this.threadsZvm.fetchTextMessage(decodeHashFromBase64(beadAh), true);
        }
        break;
    }
  }


  /** */
  async notifyPeers(signal: SignalPayload, peers: Array<AgentPubKeyB64>): Promise<void> {
    // if (signal.message.type != "Ping" && signal.message.type != "Pong") {
    //   console.log(`NOTIFYING ${signal.message.type}`, signal, peers)
    // };
    console.log(`NOTIFYING "${signal.dm.type}" to`, peers)
    /* Skip if no recipients or sending to self only */
    if (!peers || peers.length == 1 && peers[0] === this._cellProxy.cell.agentPubKey) {
      console.log("notifyPeers() aborted: No recipients for notification")
      return;
    }
    return this.threadsZvm.notifyPeers(signal, peers);
  }


  /** */
  async pingPeers(maybePpHash: ActionHashB64 | null, peers: Array<AgentPubKeyB64>) {
    const ping: SignalPayload = {
      maybePpHash: maybePpHash ? maybePpHash : undefined,
      from: this._cellProxy.cell.agentPubKey,
      dm: {type: DirectMessageType.Ping, content: this._cellProxy.cell.agentPubKey}
    };
    // console.log({signal})
    this.notifyPeers(ping, peers);
  }


  /** */
  allCurrentOthers(): AgentPubKeyB64[] {
    const agents = this.profilesZvm.getAgents();
    //console.log({agents})
    //console.log({presences: this._agentPresences})
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


  /** -- Call ZVM and notify peers -- */

  /** */
  async publishTextMessage(msg: string, ppAh: ActionHashB64): Promise<ActionHashB64> {
    let [ah, _time_anchor] = await this.threadsZvm.publishTextMessage(msg, ppAh);
    const signal: SignalPayload = {
      maybePpHash: ppAh,
      from: this._cellProxy.cell.agentPubKey,
      dm: {type: DirectMessageType.NewBead, content: [ah, msg, []]}
    };
    await this.notifyPeers(signal, this.allCurrentOthers());
    return ah;
  }


  /** */
  async publishSemanticTopic(title: string): Promise<EntryHashB64> {
    let eh = await this.threadsZvm.publishSemanticTopic(title);
    const signal: SignalPayload = {
      from: this._cellProxy.cell.agentPubKey,
      dm: {type: DirectMessageType.NewSemanticTopic, content: [eh, title]}
    };
    await this.notifyPeers(signal, this.allCurrentOthers());
    return eh;
  }


  /** */
  async publishThreadFromSemanticTopic(topicHash: AnyLinkableHashB64, purpose: string): Promise<ActionHashB64> {
    let ah = await this.threadsZvm.publishThreadFromSemanticTopic(topicHash, purpose);
    const signal: SignalPayload = {
      maybePpHash: ah,
      from: this._cellProxy.cell.agentPubKey,
      dm: {type: DirectMessageType.NewPp, content: ah}
    };
    await this.notifyPeers(signal, this.allCurrentOthers());
    return ah;
  }
}
