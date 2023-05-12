use hdk::prelude::*;
//use zome_utils::*;
use threads_integrity::*;


///
#[hdk_extern]
pub fn get_pps_from_subject_hash(lh: AnyLinkableHash) -> ExternResult<Vec<(ActionHash, Timestamp)>> {
  let links = get_links(lh, ThreadsLinkType::Threads, None)?;
  let ahs = links
    .into_iter()
    .map(|l| { (ActionHash::from(l.target), l.timestamp) })
    .collect();
  Ok(ahs)
}


///
#[hdk_extern]
pub fn get_pps_from_subject_anchor(anchor: String) -> ExternResult<Vec<(ActionHash, Timestamp)>> {
  let tp = Path::from(anchor).typed(ThreadsLinkType::SubjectPath)?;
  let links = get_links(tp.path_entry_hash()?, ThreadsLinkType::Protocols, None)?;
  let ahs = links
    .into_iter()
    .map(|l| { (ActionHash::from(l.target), l.timestamp) })
    .collect();
  Ok(ahs)
}
