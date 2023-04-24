
mod text_message;
mod get_latest_beads;


use hdk::prelude::*;
use hdk::prelude::holo_hash::holo_hash_encode;
//use zome_utils::*;
use threads_integrity::*;
use crate::path_explorer::*;
use crate::time_indexing::timepath_utils::*;


/// Returns the Thread Time Anchor and the Global Time Anchor
pub fn index_bead(bead: Bead, ah: ActionHash, bead_type: &str) -> ExternResult<(TypedPath, TypedPath)> {

  let pp_ahB64_str: String = holo_hash_encode(bead.protocol_ah.clone().get_raw_39());

  let ah_time = sys_time()?; // FIXME: use Action's timestamp

  /// Thread time-Index
  let thread_path = Path::from(pp_ahB64_str.clone())
    .typed(ThreadsLinkType::BeadTimePath)?;
  let thread_leaf_tp = get_time_path(thread_path.clone(), ah_time)?;
  thread_leaf_tp.ensure()?;
  create_link(
    thread_leaf_tp.path_entry_hash()?,
    ah.clone(),
    ThreadsLinkType::Beads,
    str2tag(bead_type),
  )?;
  debug!("Bead indexed at:\n  - {}", path2anchor(&thread_leaf_tp.path).unwrap());

  /// Global time-Index
  let root_time_path = Path::from(GLOBAL_TIME_INDEX)
    .typed(ThreadsLinkType::GlobalTimePath)?;
  let leaf_tp = get_time_path(root_time_path.clone(), ah_time)?;
  leaf_tp.ensure()?;
  create_link(
    leaf_tp.path_entry_hash()?,
    ah.clone(),
    ThreadsLinkType::Beads,
    str2tag(&pp_ahB64_str),
  )?;
  debug!("Bead indexed at:\n  - {}", path2anchor(&leaf_tp.path).unwrap());

  /// Done
  Ok((thread_leaf_tp, leaf_tp))
}
