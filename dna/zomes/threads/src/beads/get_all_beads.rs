use hdk::prelude::*;
//use zome_utils::*;
use threads_integrity::*;
use crate::beads::BeadLink;
use crate::path_explorer::*;


/// Travers the thread-specific time-index tree and get all BeadLinks
/// USE WITH CARE as this can easily timeout as it's a recursive loop of get_links()
//#[hdk_extern]
pub fn get_all_beads(pp_ah: ActionHash,  link_tag: Option<LinkTag>) -> ExternResult<Vec<BeadLink>> {
  /// Form TypedPath
  let pp_anchor: String = hash2anchor(pp_ah.clone());
  let thread_tp = Path::from(pp_anchor.clone())
    .typed(ThreadsLinkType::ThreadTimePath)?;
  /// Get All leafs
  let leaf_paths = tp_leaf_children(&thread_tp)?;
  let mut res = Vec::new();
  for leaf_path in leaf_paths {
    let links = get_links(leaf_path.path_entry_hash()?, ThreadsLinkType::Beads, link_tag.clone())?;
    let mut bls = links.into_iter()
                       .map(|ll| {
                         BeadLink {
                           bead_ah: ActionHash::from(ll.target),
                           bead_type: tag2str(&LinkTag::from(ll.tag)).unwrap(),
                         }
                       })
                       .collect();
    res.append(&mut bls);
  }
  Ok(res)
}
