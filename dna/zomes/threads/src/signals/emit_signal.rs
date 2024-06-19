use hdk::prelude::*;
use crate::signals::*;
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
pub fn emit_link_delete_signal(delete: &DeleteLink, create: &CreateLink, is_new: bool) -> ExternResult<()> {
  let link = link_from_delete(delete, create);
  return emit_threads_signal( vec![ThreadsSignalProtocol::Link((link, StateChange::Delete(is_new)))]);
}

///
pub fn emit_link_create_signal(link_ah: ActionHash, create: &CreateLink, is_new: bool) -> ExternResult<()> {
  let link = link_from_create(link_ah, create);
  return emit_threads_signal( vec![ThreadsSignalProtocol::Link((link, StateChange::Create(is_new)))]);
}


///
pub fn emit_link_signal(link: Link, state: StateChange) -> ExternResult<()> {
  return emit_threads_signal(vec![ThreadsSignalProtocol::Link((link, state))]);
}


///
pub fn emit_links_signal(links: Vec<Link>) -> ExternResult<()> {
  let pulses = links
    .into_iter()
    .map(|link| {
      ThreadsSignalProtocol::Link((link, StateChange::Create(false)))
    })
    .collect();
  emit_threads_signal(pulses)?;
  Ok(())
}



///
pub fn link_from_create(create_ah: ActionHash, create: &CreateLink) -> Link {
  Link {
    author: create.author.clone(),
    base: create.base_address.clone(),
    target: create.target_address.clone(),
    timestamp: create.timestamp,
    zome_index: create.zome_index,
    link_type: create.link_type,
    tag: LinkTag::from(create.tag.clone().into_inner()),
    create_link_hash: create_ah,
  }
}


///
pub fn link_from_delete(delete: &DeleteLink, create: &CreateLink) -> Link {
  Link {
    author: delete.author.clone(),
    base: create.base_address.clone(),
    target: create.target_address.clone(),
    timestamp: delete.timestamp,
    zome_index: create.zome_index,
    link_type: create.link_type,
    tag: LinkTag::from(create.tag.clone().into_inner()),
    create_link_hash: delete.link_add_address.clone(),
  }
}
