
mod get_pps_from_subject;
mod create_participation_protocol;

pub use create_participation_protocol::*;

use base64::*;

use hdk::hash_path::path::DELIMITER;
use hdk::prelude::*;
use hdk::prelude::holo_hash::{hash_type, HashType, holo_hash_decode, holo_hash_decode_unchecked, holo_hash_encode};
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
fn get_subject_tp(applet_id: EntryHash, subject_type_name: &str, subject_hash: AnyLinkableHash) -> ExternResult<(TypedPath, String)> {
  debug!("get_subject_tp() applet_id: {}", applet_id);
  //let subject_str: String = holo_hash_encode(subject_hash.get_raw_39());
  let subject_str: String = format!("{}", base64::encode_config(applet_id.get_raw_39(), base64::URL_SAFE_NO_PAD));
  debug!("get_subject_tp() subject_str: {} | len: {}", subject_str, subject_str.len());
  debug!("subject_str_bytes: {:?}", subject_str.as_bytes());

  let maybe_raw_hash = base64::decode_config(&subject_str, base64::URL_SAFE_NO_PAD);
  debug!("maybe_raw_hash: {:?}", maybe_raw_hash);
  debug!("eh applet_id: {:?}", EntryHash::from_raw_39(maybe_raw_hash.unwrap()));
  let (mut tp, _) = get_subject_type_path(applet_id, subject_type_name)?;
  tp.path.append_component(subject_str.clone().into());
  Ok((tp, subject_str))
}


///
pub fn get_subject_type_path(applet_id: EntryHash, subject_type_name: &str) -> ExternResult<(TypedPath, String)> {
  let (mut tp, dna_str) = get_applet_path(applet_id)?;
  tp.path.append_component(subject_type_name.into());
  Ok((tp, dna_str))
}


///
pub fn get_applet_path(applet_id: EntryHash) -> ExternResult<(TypedPath, String)> {
  let applet_id_str: String = holo_hash_encode(applet_id.get_raw_39());
  let tp = Path::from(format!("{}{}{}", ROOT_ANCHOR_SUBJECTS, DELIMITER, applet_id_str))
    .typed(ThreadsLinkType::SubjectPath)?;
  Ok((tp, applet_id_str))
}
