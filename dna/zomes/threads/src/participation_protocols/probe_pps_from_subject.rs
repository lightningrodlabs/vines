//use std::convert::TryInto;
use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use crate::emit_links_signal;


/// Return ppAhs and timestamp of its index-time
#[hdk_extern]
pub fn probe_pps_from_subject_hash(lh: AnyLinkableHash) -> ExternResult<Vec<(ActionHash, Timestamp)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let links = get_links(link_input(lh, ThreadsLinkType::Threads, None))?;
  let ahs = links
    .iter()
    .map(|l| {
      let ts = tag2Ts(l.tag.clone());
      //debug!("get_pps_from_subject_hash() thread {}, creationTime: {}", l.target, ts);
      (ActionHash::try_from(l.target.clone()).unwrap(), ts)
    })
    .collect();
  /// Emit signal
  emit_links_signal(links)?;
  /// Done
  Ok(ahs)
}


/// Return ppAhs and timestamp of its index-time
#[hdk_extern]
pub fn probe_pps_from_subject_anchor(anchor: String) -> ExternResult<Vec<(ActionHash, Timestamp)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  if anchor.is_empty() {
    return error("Empty anchor input");
  }
  let tp = Path::from(anchor).typed(ThreadsLinkType::SubjectPath)?;
  let links = get_links(link_input(tp.path_entry_hash()?, ThreadsLinkType::Protocols, None))?;
  let ahs = links.iter()
    .map(|l| { (ActionHash::try_from(l.target.clone()).unwrap(), tag2Ts(l.tag.clone())) })
    .collect();
  /// Emit signal
  emit_links_signal(links)?;
  /// Done
  Ok(ahs)
}
