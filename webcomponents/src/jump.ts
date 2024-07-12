import {NotifiableEvent} from "./viewModels/threads.perspective";
import {ActionId, DhtId} from "@ddd-qc/lit-happ";

export interface JumpEvent {
  address: DhtId,
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
export function beadJumpEvent(ah: ActionId): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {address: ah, type: JumpDestinationType.Bead}, bubbles: true, composed: true});
}

export function threadJumpEvent(ah: ActionId): CustomEvent<JumpEvent> {
  return new CustomEvent<JumpEvent>('jump', {detail: {address: ah, type: JumpDestinationType.Thread}, bubbles: true, composed: true});
}
