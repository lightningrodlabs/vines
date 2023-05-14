
mod create_pp_protocol_from_semantic_topic;
mod get_pps_from_subject;
mod create_participation_protocol;

pub use create_participation_protocol::*;


use hdk::hash_path::path::DELIMITER;
use hdk::prelude::*;
use hdk::prelude::holo_hash::{DnaHash, holo_hash_encode};
use zome_utils::*;
use threads_integrity::*;

/// Get all ParticipationProtocol in local source-chain
#[hdk_extern]
pub fn query_pps(_: ()) -> ExternResult<Vec<(Timestamp, ActionHash, ParticipationProtocol)>> {
  let tuples = get_all_typed_local::<ParticipationProtocol>( EntryType::App(ThreadsEntryTypes::ParticipationProtocol.try_into().unwrap()))?;
  let res = tuples.into_iter().map(|(ah, create_action, typed)| {
    (create_action.timestamp, ah, typed)
  }).collect();
  Ok(res)
}


///
#[hdk_extern]
pub fn get_pp(ah: ActionHash) -> ExternResult<(ParticipationProtocol, Timestamp)> {
  let typed_pair = get_typed_and_record(&ah.into())?;
  Ok((typed_pair.1, typed_pair.0.action().timestamp()))
}


///
fn get_subject_tp(dna_hash: DnaHash, subject_type_name: &str, subject_hash: AnyLinkableHash) -> ExternResult<(TypedPath, String)> {
  let subject_str: String = holo_hash_encode(subject_hash.get_raw_39());
  let (mut tp, _) = get_subject_type_path(dna_hash, subject_type_name)?;
  tp.path.append_component(subject_str.clone().into());
  Ok((tp, subject_str))
}


///
pub fn get_subject_type_path(dna_hash: DnaHash, subject_type_name: &str) -> ExternResult<(TypedPath, String)> {
  let (mut tp, dna_str) = get_dna_path(dna_hash)?;
  tp.path.append_component(subject_type_name.into());
  Ok((tp, dna_str))
}


///
pub fn get_dna_path(dna_hash: DnaHash) -> ExternResult<(TypedPath, String)> {
  let dna_str: String = holo_hash_encode(dna_hash.get_raw_39());
  let tp = Path::from(format!("{}{}{}", ROOT_ANCHOR_SUBJECTS, DELIMITER, dna_str))
    .typed(ThreadsLinkType::SubjectPath)?;
  Ok((tp, dna_str))
}
