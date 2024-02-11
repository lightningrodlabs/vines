use std::convert::TryInto;
use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;


/// Return ppAhs and timestamp of its index-time
#[hdk_extern]
pub fn get_pps_from_subject_hash(lh: AnyLinkableHash) -> ExternResult<Vec<(ActionHash, Timestamp)>> {
  let links = get_links(lh, ThreadsLinkType::Threads, None)?;
  let ahs = links
    .into_iter()
    .map(|l| {
      let ts = tag2Ts(l.tag);
      debug!("get_pps_from_subject_hash() thread {}, creationTime: {}", l.target, ts);
      (ActionHash::try_from(l.target).unwrap(), ts)
    })
    .collect();
  Ok(ahs)
}


/// Return ppAhs and timestamp of its index-time
#[hdk_extern]
pub fn get_pps_from_subject_anchor(anchor: String) -> ExternResult<Vec<(ActionHash, Timestamp)>> {
  let tp = Path::from(anchor).typed(ThreadsLinkType::SubjectPath)?;
  let links = get_links(tp.path_entry_hash()?, ThreadsLinkType::Protocols, None)?;
  let ahs = links
    .into_iter()
    .map(|l| { (ActionHash::try_from(l.target).unwrap(), tag2Ts(l.tag)) })
    .collect();
  Ok(ahs)
}
