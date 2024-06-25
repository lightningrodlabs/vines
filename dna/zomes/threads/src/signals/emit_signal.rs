use hdk::prelude::*;
use crate::signals::*;


///
pub fn emit_zome_signal(pulses: Vec<ZomeSignalProtocol>) -> ExternResult<()> {
  if pulses.is_empty() {
    return Ok(());
  }
  let signal = ZomeSignal {
    from: agent_info()?.agent_latest_pubkey,
    pulses,
  };
  return emit_signal(&signal);
}

///-------------------------------------------------------------------------------------------------
/// System
///-------------------------------------------------------------------------------------------------

///
pub fn emit_system_signal(sys: SystemSignalProtocol) -> ExternResult<()> {
  let signal = ZomeSignal {
    from: agent_info()?.agent_latest_pubkey,
    pulses: vec![ZomeSignalProtocol::System(sys)],
  };
  return emit_signal(&signal);
}


///-------------------------------------------------------------------------------------------------
/// Entry
///-------------------------------------------------------------------------------------------------

///
pub fn emit_new_entry_signal(record: Record, is_new: bool) -> ExternResult<()> {
  let pulse = EntryPulse::try_from_new_record(record, is_new)?;
  return emit_zome_signal(vec![ZomeSignalProtocol::Entry(pulse)]);
}

///
pub fn emit_delete_entry_signal(ha: ActionHashed, entry: Entry, is_new: bool) -> ExternResult<()> {
  let pulse = EntryPulse::try_from_delete_record(ha, entry, is_new)?;
  return emit_zome_signal(vec![ZomeSignalProtocol::Entry(pulse)]);
}


///-------------------------------------------------------------------------------------------------
/// Link
///-------------------------------------------------------------------------------------------------

///
pub fn emit_link_delete_signal(delete: &DeleteLink, create: &CreateLink, is_new: bool) -> ExternResult<()> {
  let link = link_from_delete(delete, create);
  let pulse = LinkPulse { link, state: StateChange::Delete(is_new)};
  return emit_zome_signal( vec![ZomeSignalProtocol::Link(pulse)]);
}

///
pub fn emit_link_create_signal(link_ah: ActionHash, create: &CreateLink, is_new: bool) -> ExternResult<()> {
  let link = link_from_create(link_ah, create);
  return emit_zome_signal( vec![ZomeSignalProtocol::Link(LinkPulse {link, state: StateChange::Create(is_new)})]);
}


///
pub fn emit_link_signal(link: Link, state: StateChange) -> ExternResult<()> {
  return emit_zome_signal(vec![ZomeSignalProtocol::Link(LinkPulse {link, state})]);
}


///
pub fn emit_links_signal(links: Vec<Link>) -> ExternResult<()> {
  let pulses = links
    .into_iter()
    .map(|link| {
      ZomeSignalProtocol::Link(LinkPulse { link, state: StateChange::Create(false)})
    })
    .collect();
  emit_zome_signal(pulses)?;
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
