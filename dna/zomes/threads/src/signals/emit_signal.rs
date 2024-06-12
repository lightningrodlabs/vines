use hdk::prelude::*;
//use crate::*;
use crate::signals::*;
use zome_utils::*;
use threads_integrity::*;


/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EmitNotificationTipInput {
  pub notification: ThreadsNotification,
  pub peer: AgentPubKey,
}

///
#[hdk_extern]
fn emit_notification_tip(input: EmitNotificationTipInput) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Pre-conditions: Don't call yourself (otherwise we get concurrency issues)
  let me = agent_info()?.agent_latest_pubkey;
  if me == input.peer {
    return error("Can't notify self");
  }
  /// emit signal
  let tip = TipProtocol::Notification { value: input.notification };
  broadcast_tip_inner(vec![input.peer], tip)?;
  /// Done
  Ok(())
}


///
pub fn emit_self_signal(pulses: Vec<ThreadsSignalProtocol>) -> ExternResult<()> {
  if pulses.is_empty() {
    return Ok(());
  }
  let signal = ThreadsSignal {
    from: agent_info()?.agent_latest_pubkey,
    pulses,
  };
  return emit_signal(&signal);
}


///
pub fn emit_system_signal(sys: SystemSignalProtocol) -> ExternResult<()> {
  let signal = SystemSignal {
    System: sys,
  };
  return emit_signal(&signal);
}


///
pub fn emit_entry_signal(state: StateChange, create: &Create, typed: ThreadsEntry) -> ExternResult<()> {
  let dsp = entry_signal(state, create, typed);
  return emit_self_signal(vec![dsp]);
}


///
pub fn entry_signal(state: StateChange, create: &Create, typed: ThreadsEntry) -> ThreadsSignalProtocol {
  let info = EntryInfo {
    hash: AnyDhtHash::from(create.entry_hash.clone()),
    ts: create.timestamp,
    author: create.author.clone(),
    state,
  };
  ThreadsSignalProtocol::Entry((info, typed))
}


///
pub fn entry_signal_ah(state: StateChange, create: &Create, typed: ThreadsEntry, ah: ActionHash) -> ThreadsSignalProtocol {
  let info = EntryInfo {
    hash: AnyDhtHash::from(ah),
    ts: create.timestamp,
    author: create.author.clone(),
    state,
  };
  ThreadsSignalProtocol::Entry((info, typed))
}


///
pub fn emit_link_delete_signal(link_ah: ActionHash, link_type: ThreadsLinkType, delete: &DeleteLink, create: &CreateLink, is_new: bool) -> ExternResult<()> {
  let dsp = link_delete_info(delete, create, is_new);
  return emit_self_signal(vec![ThreadsSignalProtocol::Link((link_ah, dsp, link_type))]);
}

///
pub fn emit_link_create_signal(link_ah: ActionHash, link_type: ThreadsLinkType, create: &CreateLink, is_new: bool) -> ExternResult<()> {
  let dsp = link_create_info(create, is_new);
  return emit_self_signal( vec![ThreadsSignalProtocol::Link((link_ah, dsp, link_type))]);
}


///
pub fn link_create_info(create: &CreateLink, is_new: bool) -> LinkInfo {
  LinkInfo {
    base: create.base_address.clone(),
    target: create.target_address.clone(),
    tag: Some(create.tag.clone().into_inner()),
    ts: create.timestamp,
    author: create.author.clone(),
    state: StateChange::Create(is_new),
  }
}


///
pub fn link_delete_info(delete: &DeleteLink, create: &CreateLink, is_new: bool) -> LinkInfo {
  LinkInfo {
    base: delete.base_address.clone(),
    target: create.target_address.clone(),
    tag: Some(create.tag.clone().into_inner()),
    ts: delete.timestamp,
    author: delete.author.clone(),
    state: StateChange::Delete(is_new),
  }
}
