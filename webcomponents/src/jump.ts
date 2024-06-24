import {AnyLinkableHashB64, NotifiableEvent} from "./viewModels/threads.perspective";
import {ActionHashB64} from "@holochain/client";

export interface JumpEvent {
  hash: AnyLinkableHashB64,
  type: JumpDestinationType,
}


export enum JumpDestinationType {
  Applet = "Applet",
  Thread = "Thread",
  Bead = "Bead",
  Dm = "Dm",
}


export function notification2JumpEvent(notif: NotifiableEvent): JumpDestinationType {
  if (NotifiableEvent.Fork === notif) {
    return JumpDestinationType.Thread;
  }
  if (NotifiableEvent.NewDmThread === notif) {
    return JumpDestinationType.Dm;
  }
  return JumpDestinationType.Bead;
}


/** */
export function beadJumpEvent(hash: ActionHashB64): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {hash, type: JumpDestinationType.Bead}, bubbles: true, composed: true});
}

export function threadJumpEvent(hash: ActionHashB64): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {hash, type: JumpDestinationType.Thread}, bubbles: true, composed: true});
}
