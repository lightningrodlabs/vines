use hdk::prelude::*;
//use crate::*;
use crate::signals::*;
//use zome_utils::*;
use threads_integrity::*;


///
pub fn emit_threads_signal(pulses: Vec<ThreadsSignalProtocol>) -> ExternResult<()> {
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
pub fn emit_entry_signal_record(record: Record, is_new: bool) -> ExternResult<()> {
  let typed_entry: ThreadsEntry = record_to_typed(record.clone())?;
  return emit_entry_signal(record.action_address().to_owned(), record.action(), is_new, typed_entry);
}


///
pub fn emit_entry_signal(ah: ActionHash, action: &Action, is_new: bool, typed: ThreadsEntry) -> ExternResult<()> {
  let info = entry_info(ah, action, is_new, &typed);
  return emit_threads_signal(vec![ThreadsSignalProtocol::Entry((info, typed))]);
}


///
pub fn entry_info(ah: ActionHash, action: &Action, is_new: bool, typed: &ThreadsEntry) -> EntryInfo {
  let mut entry_info = EntryInfo::from_action(action, is_new);
  match typed {
    ThreadsEntry::AnyBead(_)
    | ThreadsEntry::EntryBead(_)
    | ThreadsEntry::TextBead(_)
    | ThreadsEntry::EncryptedBead(_)
    | ThreadsEntry::ParticipationProtocol(_) => entry_info.hash = AnyDhtHash::from(ah),
    _ => (),
  };
  entry_info
}


///
pub fn emit_link_delete_signal(link_ah: ActionHash, link_type: ThreadsLinkType, delete: &DeleteLink, create: &CreateLink, is_new: bool) -> ExternResult<()> {
  let dsp = link_delete_info(delete, create, is_new);
  return emit_threads_signal(vec![ThreadsSignalProtocol::Link((link_ah, dsp, link_type))]);
}

///
pub fn emit_link_create_signal(link_ah: ActionHash, link_type: ThreadsLinkType, create: &CreateLink, is_new: bool) -> ExternResult<()> {
  let dsp = link_create_info(create, is_new);
  return emit_threads_signal( vec![ThreadsSignalProtocol::Link((link_ah, dsp, link_type))]);
}


///
pub fn emit_link_signal(link_ah: ActionHash, link_type: ThreadsLinkType, link: &Link, state: StateChange) -> ExternResult<()> {
  let dsp = link_info(link, state);
  return emit_threads_signal(vec![ThreadsSignalProtocol::Link((link_ah, dsp, link_type))]);
}

///
pub fn link_info(link: &Link, state: StateChange) -> LinkInfo {
  LinkInfo {
    base: link.base.clone(),
    target: link.target.clone(),
    tag: Some(link.tag.clone().into_inner()),
    ts: link.timestamp,
    author: link.author.clone(),
    state,
  }
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
