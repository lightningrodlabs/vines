use hdk::prelude::*;
use zome_utils::zome_panic_hook;
use threads_integrity::ThreadsLinkType;


///
#[hdk_extern]
fn get_hide_link(subjectHash: AnyLinkableHash) -> ExternResult<Option<ActionHash>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let links = get_links(agent_info()?.agent_latest_pubkey, ThreadsLinkType::Hide, None)?;
  for link in links.iter() {
    if link.target.clone() == subjectHash {
      return Ok(Some(link.create_link_hash.to_owned()));
    }
  }
  Ok(None)
}


///
#[hdk_extern]
fn hide_subject(subjectHash: AnyLinkableHash) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  return create_link(agent_info()?.agent_latest_pubkey, subjectHash, ThreadsLinkType::Hide, LinkTag::from(()));
}


///
#[hdk_extern]
fn unhide_subject(subjectHash: AnyLinkableHash) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let Some(create_link_hash) = get_hide_link(subjectHash)?
    else { return Ok(()) };
  let _hash = delete_link(create_link_hash)?;
  Ok(())
}


///
#[hdk_extern]
fn get_hidden_subjects(_: ()) -> ExternResult<Vec<AnyLinkableHash>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let links = get_links(agent_info()?.agent_latest_pubkey, ThreadsLinkType::Hide, None)?;
  let hashs = links.iter().map(|link| link.target.clone()).collect();
  Ok(hashs)
}
