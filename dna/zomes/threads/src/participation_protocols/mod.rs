
mod get_pps_from_subject;
mod create_participation_protocol;

pub use create_participation_protocol::*;

use base64::*;

use hdk::hash_path::path::{Component, DELIMITER};
use hdk::hdi::prelude::DnaHash;
use hdk::prelude::*;
use hdk::prelude::holo_hash::{hash_type, HashType, holo_hash_decode, holo_hash_decode_unchecked, holo_hash_encode};
use zome_utils::*;
use threads_integrity::*;
use crate::path_explorer::hash2comp;

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
fn get_subject_tp(applet_id: EntryHash, subject_type_name: &str, dna_hash: DnaHash, subject_hash: AnyLinkableHash) -> ExternResult<TypedPath> {
  debug!("get_subject_tp() applet_id: {}", applet_id);
  let mut tp = get_subject_type_tp(applet_id, subject_type_name)?;
  //let subject_hash_comp = hash2comp(subject_hash);
  let subject_hash_comp = subject2comp(dna_hash, subject_hash);
  tp.path.append_component(subject_hash_comp);
  Ok(tp)
}


///
pub fn get_subject_type_tp(applet_id: EntryHash, subject_type_name: &str) -> ExternResult<TypedPath> {
  let mut tp = get_applet_tp(applet_id)?;
  tp.path.append_component(subject_type_name.into());
  Ok(tp)
}


///
pub fn get_applet_tp(applet_id: EntryHash) -> ExternResult<TypedPath> {
  let applet_id_comp = hash2comp(applet_id);
  let mut tp = Path::from(ROOT_ANCHOR_SUBJECTS)
    .typed(ThreadsLinkType::SubjectPath)?;
  tp.path.append_component(applet_id_comp);
  Ok(tp)
}


///
pub fn subject2comp<T: HashType>(dna_hash: DnaHash, subject_hash: HoloHash<T>) -> Component {
  debug!("subject2comp() {} | {}", dna_hash, subject_hash);
  let subject_str = holo_hash_encode(subject_hash.get_raw_39());
  let dna_str = holo_hash_encode(dna_hash.get_raw_39());
  let str = format!("{}{}{}", dna_str, "|", subject_str);
  debug!("subject2comp() {}", str);
  str.into()
}


///
pub fn comp2subject<T: HashType>(comp: &Component) -> ExternResult<(DnaHash, HoloHash<T>)> {
  let s = String::try_from(comp)
    .map_err(|e| wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;

  debug!("comp2subject() s = {}", s);

  let (dna_hash_str, subject_hash_str) = s.split_at(s.find("|").unwrap());
  let subject_hash_str = &subject_hash_str[1..]; // remove delimiter

  debug!("comp2subject() {} :: {}", dna_hash_str, subject_hash_str);

  let raw_dna_hash = holo_hash_decode_unchecked(&dna_hash_str)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  let dna_hash = DnaHash::from_raw_39(raw_dna_hash)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;

  let raw_subject_hash = holo_hash_decode_unchecked(&subject_hash_str)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  let subject_hash = HoloHash::<T>::from_raw_39(raw_subject_hash)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;

  debug!("comp2subject() {} | {}", dna_hash, subject_hash);

  Ok((dna_hash, subject_hash))
}
