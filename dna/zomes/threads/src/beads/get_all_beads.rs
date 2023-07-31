use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use time_indexing::*;
use crate::beads::{BeadLink};

/// Travers the thread-specific time-index tree and get all BeadLinks
/// USE WITH CARE as this can easily timeout as it's a recursive loop of get_links()
#[hdk_extern]
pub fn get_all_beads(pp_ah: ActionHash/*,  link_tag: Option<LinkTag>*/) -> ExternResult<(SweepInterval, Vec<BeadLink>)> {
  let link_tag = None;
  let search_interval = SweepInterval::now();
  /// Form TypedPath
  let pp_anchor = hash2comp(pp_ah.clone());
  let thread_tp = Path::from(vec![pp_anchor])
    .typed(ThreadsLinkType::ThreadTimePath)?;
  //debug!("thread_tp = {}", path2anchor(&thread_tp).unwrap());
  /// Get All LeafAnchors
  let leaf_tps = tp_leaf_children(&thread_tp)?;
  debug!("leaf_paths.len = {}", leaf_tps.len());
  /// Get BeadLinks from each LeafAnchor
  let mut res = Vec::new();
  for leaf_tp in leaf_tps {
    debug!("leaf_tp = {}", path2anchor(&leaf_tp.path).unwrap_or("<error>".to_string()));
    //let Ok(bucket_begin_time_us) = convert_timepath_to_timestamp(leaf_tp.path.clone())
    //  else { /* probably at root */ continue; };
    let links = get_links(leaf_tp.path_entry_hash()?, ThreadsLinkType::TimeItem, link_tag.clone())?;
    //debug!("links.len = {}", links.len());
    let mut bls = links.into_iter()
                       .map(|ll| {
                         let bt: TimedItemTag = SerializedBytes::from(UnsafeBytes::from(ll.tag.0)).try_into().unwrap();
                         BeadLink {
                           //index_time: bucket_begin_time_us,
                           creation_time: bt.devtest_timestamp,
                           //creation_time: ll.timestamp,
                           bead_ah: ActionHash::try_from(ll.target).unwrap(),
                           bead_type: bt.item_type,
                           //bead_type: tag2str(&LinkTag::from(ll.tag)).unwrap(),
                         }
                       })
                       .collect();
    res.append(&mut bls);
  }
  debug!("res.len = {}", res.len());
  Ok((search_interval, res))
}
