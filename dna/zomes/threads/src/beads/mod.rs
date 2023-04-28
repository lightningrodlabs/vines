
mod text_message;
mod get_latest_beads;
mod get_all_beads;


use hdk::prelude::*;
//use zome_utils::*;
use threads_integrity::*;
use crate::path_explorer::*;
use crate::time_indexing::*;




#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeadLink {
  pub index_time: Timestamp,
  pub creation_time: Timestamp,
  pub bead_ah: ActionHash,
  pub bead_type: String,
}


/// Returns the Thread Time Anchor and the Global Time Anchor
pub fn index_bead(bead: Bead, bead_ah: ActionHash, bead_type: &str, index_time_us: Timestamp) -> ExternResult<(TypedPath, TypedPath)> {
  /// Thread time-Index
  let pp_anchor: String = hash2anchor(bead.for_protocol_ah.clone());
  let thread_path = Path::from(pp_anchor.clone())
    .typed(ThreadsLinkType::ThreadTimePath)?;
  let thread_leaf_tp = get_time_path(thread_path.clone(), index_time_us)?;
  thread_leaf_tp.ensure()?;
  create_link(
    thread_leaf_tp.path_entry_hash()?,
    bead_ah.clone(),
    ThreadsLinkType::Beads,
    str2tag(bead_type),
  )?;
  debug!("Bead indexed at:\n  - {}", path2anchor(&thread_leaf_tp.path).unwrap());

  /// Global time-Index
  let root_time_path = Path::from(GLOBAL_TIME_INDEX)
    .typed(ThreadsLinkType::GlobalTimePath)?;
  let leaf_tp = get_time_path(root_time_path.clone(), index_time_us)?;
  leaf_tp.ensure()?;
  create_link(
    leaf_tp.path_entry_hash()?,
    bead_ah.clone(),
    ThreadsLinkType::Beads,
    str2tag(&pp_anchor),
  )?;
  debug!("Bead indexed at:\n  - {}", path2anchor(&leaf_tp.path).unwrap());

  /// Done
  Ok((thread_leaf_tp, leaf_tp))
}
