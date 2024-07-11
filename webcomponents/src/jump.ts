import {NotifiableEvent} from "./viewModels/threads.perspective";
import {ActionId} from "@ddd-qc/lit-happ";

export interface JumpEvent {
  hash: ActionId,
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
export function beadJumpEvent(hash: ActionId): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {hash, type: JumpDestinationType.Bead}, bubbles: true, composed: true});
}

export function threadJumpEvent(hash: ActionId): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {hash, type: JumpDestinationType.Thread}, bubbles: true, composed: true});
}
