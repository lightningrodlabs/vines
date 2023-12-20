use hdk::prelude::*;
use threads_integrity::ThreadsLinkType;


///
#[hdk_extern]
fn get_hide_link(subjectHash: AnyLinkableHash) -> ExternResult<Option<ActionHash>> {
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
  return create_link(agent_info()?.agent_latest_pubkey, subjectHash, ThreadsLinkType::Hide, LinkTag::from(()));
}


///
#[hdk_extern]
fn unhide_subject(subjectHash: AnyLinkableHash) -> ExternResult<()> {
  let Some(create_link_hash) = get_hide_link(subjectHash)?
    else { return Ok(()) };
  let _hash = delete_link(create_link_hash)?;
  Ok(())
}


///
#[hdk_extern]
fn get_hidden_subjects(_: ()) -> ExternResult<Vec<AnyLinkableHash>> {
  let links = get_links(agent_info()?.agent_latest_pubkey, ThreadsLinkType::Hide, None)?;
  let hashs = links.iter().map(|link| link.target.clone()).collect();
  Ok(hashs)
}
