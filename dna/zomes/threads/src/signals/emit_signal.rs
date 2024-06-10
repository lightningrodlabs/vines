use hdk::prelude::*;
//use crate::*;
use crate::signals::*;
//use zome_utils::*;
//use threads_integrity::*;


// /// Input to the notify call
// #[derive(Serialize, Deserialize, SerializedBytes, Debug)]
// #[serde(rename_all = "camelCase")]
// pub struct NotifyPeerInput {
//   pub payload: ThreadsSignal,
//   pub peer: AgentPubKey,
// }
//
// ///
// #[hdk_extern]
// fn notify_peer(input: NotifyPeerInput) -> ExternResult<()> {
//   std::panic::set_hook(Box::new(zome_panic_hook));
//   debug!("Notifying {:?} to {}", input.payload, input.peer);
//   let _ = call_remote(
//     input.peer,
//     THREADS_DEFAULT_COORDINATOR_ZOME_NAME,
//     "recv_remote_signal".into(),
//     None,
//     ExternIO::encode(input.payload).unwrap(),
//   )?;
//   Ok(())
// }




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
