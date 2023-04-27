use hdk::prelude::*;
//use zome_utils::*;
use threads_integrity::*;
use crate::beads::BeadLink;
use crate::path_explorer::*;
use crate::time_indexing::timepath_utils::convert_timepath_to_timestamp;


/// Travers the thread-specific time-index tree and get all BeadLinks
/// USE WITH CARE as this can easily timeout as it's a recursive loop of get_links()
#[hdk_extern]
pub fn get_all_beads(pp_ah: ActionHash/*,  link_tag: Option<LinkTag>*/) -> ExternResult<Vec<BeadLink>> {
  let link_tag = None;
  /// Form TypedPath
  let pp_anchor: String = hash2anchor(pp_ah.clone());
  let thread_tp = Path::from(pp_anchor.clone())
    .typed(ThreadsLinkType::ThreadTimePath)?;
  /// Get All leafs
  let leaf_paths = tp_leaf_children(&thread_tp)?;
  debug!("get_all_beads(), leaf_paths.len = {}", leaf_paths.len());
  let mut res = Vec::new();
  for leaf_tp in leaf_paths {
    debug!("get_all_beads(), leaf_tp = {}", path2anchor(&leaf_tp.path).unwrap_or("<error>".to_string()));
    let Ok(bucket_time) = convert_timepath_to_timestamp(leaf_tp.path.clone())
      else { /* probably at root */ continue; };
    let links = get_links(leaf_tp.path_entry_hash()?, ThreadsLinkType::Beads, link_tag.clone())?;
    let mut bls = links.into_iter()
                       .map(|ll| {
                         BeadLink {
                           bucket_time,
                           bead_ah: ActionHash::from(ll.target),
                           bead_type: tag2str(&LinkTag::from(ll.tag)).unwrap(),
                         }
                       })
                       .collect();
    res.append(&mut bls);
  }
  debug!("get_all_beads(), res.len = {}", res.len());
  Ok(res)
}
