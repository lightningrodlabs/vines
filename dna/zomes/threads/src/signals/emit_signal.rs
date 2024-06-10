use hdk::prelude::*;
//use crate::*;
use crate::signals::*;
use zome_utils::*;
//use threads_integrity::*;


/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotifyPeerInput {
  pub notification: ThreadsNotification,
  pub peer: AgentPubKey,
}

///
#[hdk_extern]
fn emit_notification(input: NotifyPeerInput) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Pre-conditions: Don't call yourself (otherwise we get concurrency issues)
  let me = agent_info()?.agent_latest_pubkey;
  if me == input.peer {
    return error("Can't notify self");
  }
  /// emit signal
  debug!("Notifying {:?} to {}", input.notification, input.peer);
  let signal = ThreadsSignal { from: me, signal: vec![ThreadsSignalProtocol::Notification(input.notification)] };
  send_remote_signal(
    ExternIO::encode(signal).unwrap(),
    vec![input.peer],
  )?;
  Ok(())
}


///
pub fn emit_self_signals(signals: Vec<ThreadsSignalProtocol>) -> ExternResult<()> {
  if signals.is_empty() {
    return Ok(());
  }
  let signal = ThreadsSignal {
    from: agent_info()?.agent_latest_pubkey,
    signal: signals,
  };
  return emit_signal(&signal);
}


///
pub fn emit_self_signal(signal: ThreadsSignalProtocol) -> ExternResult<()> {
  let signal = ThreadsSignal {
    from: agent_info()?.agent_latest_pubkey,
    signal: vec![signal],
  };
  return emit_signal(&signal);
}


// ///
// pub fn emit_gossip_signal(dg: DirectGossip) -> ExternResult<()> {
//   let signal = ThreadsSignal {
//     from: dg.from,
//     signal: vec![ThreadsSignalProtocol::DirectGossip(dg.gossip)],
//   };
//   return emit_signal(&signal);
// }


///
pub fn emit_system_signal(sys: SystemSignalProtocol) -> ExternResult<()> {
  let signal = SystemSignal {
    System: sys,
  };
  return emit_signal(&signal);
}


// ///
// pub fn emit_entry_signal(state: EntryStateChange, create: &Create, kind: DeliveryEntryKind) -> ExternResult<()> {
//   let dsp = entry_signal(state, create, kind);
//   return emit_self_signal(dsp);
// }
//
//
// ///
// pub fn entry_signal(state: EntryStateChange, create: &Create, kind: DeliveryEntryKind) -> DeliverySignalProtocol {
//   let info = EntryInfo {
//     hash: AnyDhtHash::from(create.entry_hash.clone()),
//     ts: create.timestamp,
//     author: create.author.clone(),
//     state,
//   };
//   DeliverySignalProtocol::Entry((info, kind))
// }
//
//
// ///
// pub fn entry_signal_ah(state: EntryStateChange, create: &Create, kind: DeliveryEntryKind, ah: ActionHash) -> DeliverySignalProtocol {
//   let info = EntryInfo {
//     hash: AnyDhtHash::from(ah),
//     ts: create.timestamp,
//     author: create.author.clone(),
//     state,
//   };
//   DeliverySignalProtocol::Entry((info, kind))
// }
