use hdk::prelude::ExternResult;

mod pull_applets;
mod find_subjects_by_type;
mod pull_all_subjects;
mod find_subjects_for_applet;
mod hide;


use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;


/// Create Threads link
pub fn link_subject_to_pp(subject: &Subject, pp_ah: &ActionHash, index_time: Timestamp) -> ExternResult<()> {
  /// Handle AgentPubKey edge case
  let raw_subject_hash = holo_hash_decode_unchecked(&subject.address)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  if subject.type_name == "AgentPubKey" {
    let subject_hash = HoloHash::<hash_type::Agent>::from_raw_39(raw_subject_hash)
      .map_err(|e| wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
    create_link(
      subject_hash,
      pp_ah.clone(),
      ThreadsLinkType::Threads,
      ts2Tag(index_time), // Store index-time in Tag
      //str2tag(&ta.anchor), // Store Anchor in Tag
    )?;
  } else {
    let subject_hash = AnyLinkableHash::from_raw_39(raw_subject_hash)
      .map_err(|e| wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
    create_link(
      subject_hash,
      pp_ah.clone(),
      ThreadsLinkType::Threads,
      ts2Tag(index_time), // Store index-time in Tag
      //str2tag(&ta.anchor), // Store Anchor in Tag
    )?;
  }
  Ok(())
}
