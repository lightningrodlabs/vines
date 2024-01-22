import {ActionHashB64, AgentPubKeyB64, decodeHashFromBase64, encodeHashToBase64, Timestamp} from "@holochain/client";
import {ZomeProxy} from "@ddd-qc/lit-happ";
import {
  NotifiableEventType,
  SignalPayload, SignalPayloadType,
  TextMessage,
  WeaveNotification,
  WeaveSignal
} from "../bindings/threads.types";
import {ThreadsDvm} from "./threads.dvm";


// /** */
// export enum NotifiableEventTypes {
//   MENTION, // Another agent mentionned you in a textMessage ; Title is
//   REPLY, // Another agent replied to one of your bead
//   FORK, // Another agent created a thread off of some entry you own
//   DM, // Another agent sent you a private bead to your agentPubKey
// }
//
//
// /** */
// export interface WeaveNotification {
//   eventType: NotifiableEventTypes,
//   author: AgentPubKeyB64,
//   timestamp: Timestamp,
//   title: string,
//   context: any,
// }


/** */
export class Notificator {

  private _dvm: ThreadsDvm;


  /** I am notifying someone else that I have mentionned them */
  notifyMention(agent: AgentPubKeyB64, beadAh: ActionHashB64): void {
    console.log("notifyMention() agent", agent);
    const notif = this.createMentionNotification(agent, beadAh);
    this._dvm.threadsZvm.notifyPeer(agent, notif);
  }


  /** Create Mention Notifcation */
  private createMentionNotification(agent: AgentPubKeyB64, beadAh: ActionHashB64): WeaveSignal {
    const tmInfo = this._dvm.threadsZvm.perspective.textMessages[beadAh];
    console.log("createMentionNotification() texto", tmInfo.textMessage.value);

    //const me = this._dvm.profilesZvm.perspective.profiles[this._dvm.cell.agentPubKey]? this._dvm.profilesZvm.perspective.profiles[this._dvm.cell.agentPubKey].nickname : "unnamed";

    const thread = this._dvm.threadsZvm.perspective.threads[encodeHashToBase64(tmInfo.textMessage.bead.forProtocolAh)];
    const subject = this._dvm.threadsZvm.perspective.allSubjects[thread.pp.subjectHash];
    let threadTopic = `of type ${subject.typeName}`;
    const maybeSemantic = this._dvm.threadsZvm.perspective.allSemanticTopics[thread.pp.subjectHash];
    if (maybeSemantic) {
      threadTopic = `"${maybeSemantic[1]}"`
    }

    const notification: WeaveNotification = {
      eventType: NotifiableEventType.Mention,
      author: this._dvm.cell.agentPubKey,
      timestamp: tmInfo.creationTime,
      title: `New mention in thread ${threadTopic}`,
      //context: encodeHashToBase64(tmInfo.textMessage.bead.forProtocolAh) // ppAh
    }

    const signal: WeaveSignal = {
      maybePpHash: encodeHashToBase64(tmInfo.textMessage.bead.forProtocolAh),
      from: this._dvm.cell.agentPubKey,
      payload: { type: SignalPayloadType.Notification, content: notification }
    }

    return signal;
  }


}
