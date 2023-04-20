use hdk::{
  hash_path::path::{TypedPath},
  prelude::*,
};
use hdk::prelude::holo_hash::{ActionHashB64, holo_hash_encode};
use threads_integrity::*;
use crate::path_explorer::{path2str, str2tag};
use crate::time_indexing::timepath_utils::get_time_path;

///
#[hdk_extern]
pub fn add_text_message(texto: TextMessage) -> ExternResult<String> {
  let ah = create_entry(ThreadsEntry::TextMessage(texto.clone()))?;
  let tp_pair = index_bead(texto.bead, ah, "TextMessage")?;
  Ok(path2str(&tp_pair.1.path).unwrap())
}


/// Returns the Thread Time TypePath and the Global Time TypePath
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
  debug!("Bead indexed at:\n  - {}", path2str(&thread_leaf_tp.path).unwrap());

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
  debug!("Bead indexed at:\n  - {}", path2str(&leaf_tp.path).unwrap());

  /// Done
  Ok((thread_leaf_tp, leaf_tp))
}
