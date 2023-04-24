
mod get_pps;
mod create_pp_protocol_from_semantic_topic;
mod get_pps_from_subject;


use hdk::hash_path::path::DELIMITER;
use hdk::prelude::*;
use hdk::prelude::holo_hash::{DnaHash, holo_hash_encode};
use zome_utils::*;
use threads_integrity::*;


///
#[hdk_extern]
pub fn get_pp(ah: ActionHash) -> ExternResult<ParticipationProtocol> {
  let typed_pair = get_typed_from_ah(ah)?;
  Ok(typed_pair.1)
}


///
fn get_subject_tp(dna_hash: DnaHash, entry_type_name: &str, subject_hash: AnyDhtHash) -> ExternResult<(TypedPath, String)> {
  let subject_str: String = holo_hash_encode(subject_hash.get_raw_39());
  let (mut tp, _) = get_entry_type_path(dna_hash, entry_type_name)?;
  tp.path.append_component(subject_str.clone().into());
  Ok((tp, subject_str))
}


///
pub fn get_entry_type_path(dna_hash: DnaHash, entry_type_name: &str) -> ExternResult<(TypedPath, String)> {
  let (mut tp, dna_str) = get_dna_path(dna_hash)?;
  tp.path.append_component(entry_type_name.into());
  Ok((tp, dna_str))
}


///
pub fn get_dna_path(dna_hash: DnaHash) -> ExternResult<(TypedPath, String)> {
  let dna_str: String = holo_hash_encode(dna_hash.get_raw_39());
  let tp = Path::from(format!("{}{}{}", ROOT_ANCHOR_THREADS, DELIMITER, dna_str))
    .typed(ThreadsLinkType::SubjectPath)?;
  Ok((tp, dna_str))
}
