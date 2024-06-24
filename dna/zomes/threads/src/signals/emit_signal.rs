use hdk::prelude::*;
use crate::signals::*;
//use zome_utils::*;

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


///-------------------------------------------------------------------------------------------------
/// Entry
///-------------------------------------------------------------------------------------------------

///
pub fn emit_entry_signal(record: Record, is_new: bool) -> ExternResult<()> {
  let pulse = EntryPulse::from_NewEntry_record(record, is_new);
  return emit_threads_signal(vec![ThreadsSignalProtocol::Entry(pulse)]);
}



///-------------------------------------------------------------------------------------------------
/// Link
///-------------------------------------------------------------------------------------------------

///
pub fn emit_link_delete_signal(delete: &DeleteLink, create: &CreateLink, is_new: bool) -> ExternResult<()> {
  let link = link_from_delete(delete, create);
  let pulse = LinkPulse { link, state: StateChange::Delete(is_new)};
  return emit_threads_signal( vec![ThreadsSignalProtocol::Link(pulse)]);
}

///
pub fn emit_link_create_signal(link_ah: ActionHash, create: &CreateLink, is_new: bool) -> ExternResult<()> {
  let link = link_from_create(link_ah, create);
  return emit_threads_signal( vec![ThreadsSignalProtocol::Link(LinkPulse {link, state: StateChange::Create(is_new)})]);
}


///
pub fn emit_link_signal(link: Link, state: StateChange) -> ExternResult<()> {
  return emit_threads_signal(vec![ThreadsSignalProtocol::Link(LinkPulse {link, state})]);
}


///
pub fn emit_links_signal(links: Vec<Link>) -> ExternResult<()> {
  let pulses = links
    .into_iter()
    .map(|link| {
      ThreadsSignalProtocol::Link(LinkPulse { link, state: StateChange::Create(false)})
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
