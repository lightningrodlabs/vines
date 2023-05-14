use hdk::prelude::*;
//use zome_utils::*;
use threads_integrity::*;
use crate::path_explorer::*;
use crate::time_indexing::*;


/// Returns the Thread Time Anchor and the Global Time Anchor
pub fn index_bead(bead: Bead, bead_ah: ActionHash, bead_type: &str, index_time_us: Timestamp) -> ExternResult<(TypedPath, TypedPath)> {
  /// Index in Thread time-Index
  let pp_anchor: String = hash2anchor(bead.for_protocol_ah.clone());
  let thread_tp = Path::from(pp_anchor.clone())
    .typed(ThreadsLinkType::ThreadTimePath)?;
  let (thread_leaf_tp, _ah) = index_item(thread_tp, bead_ah.clone().into(), bead_type, index_time_us, &vec![])?;
  //debug!("Bead indexed at thread:\n  - {} {}", path2anchor(&thread_leaf_tp.path).unwrap(), thread_leaf_tp.path_entry_hash()?);

  /// Index in Global time-Index
  let global_time_tp = Path::from(GLOBAL_TIME_INDEX)
    .typed(ThreadsLinkType::GlobalTimePath)?;
  let (global_leaf_tp, _ah) = index_item(
    global_time_tp,
    bead_ah.clone().into(),
    bead_type, index_time_us,
    bead.for_protocol_ah.get_raw_39())?;
  //debug!("Bead indexed at global:\n  - {}", path2anchor(&leaf_tp.path).unwrap());

  /// Done
  Ok((thread_leaf_tp, global_leaf_tp))
}
