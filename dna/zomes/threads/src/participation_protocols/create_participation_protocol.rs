use hdk::prelude::*;
//use zome_utils::*;
use threads_integrity::*;
use crate::participation_protocols::*;
use crate::path_explorer::*;
use crate::time_indexing::{get_time_path, index_item};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePpInput {
  pub purpose: String,
  pub rules: String,
  pub dna_hash: DnaHash,
  pub subject_hash: AnyLinkableHash,
  pub subject_type: String,
}


/// Create a Pp off anything
#[hdk_extern]
pub fn create_participation_protocol(input: CreatePpInput) -> ExternResult<(ActionHash, Timestamp)> {
  let pp = ParticipationProtocol {
    purpose: input.purpose,
    rules: input.rules,
    subject_hash: input.subject_hash.clone(),
    subject_type: input.subject_type,
  };
  return create_pp(pp, input.dna_hash, None);
}


///
pub fn create_pp(pp: ParticipationProtocol, dna_hash: DnaHash, maybe_index_time: Option<Timestamp>) -> ExternResult<(ActionHash, Timestamp)> {

  let pp_entry = ThreadsEntry::ParticipationProtocol(pp.clone());
  let pp_ah = create_entry(pp_entry)?;
  //let pp_eh = hash_entry(pp_entry)?;

  /// Global Subjects Index
  let (tp, _subject_hash_str) = get_subject_tp(dna_hash, &pp.subject_type, pp.subject_hash.clone())?;
  tp.ensure()?;
  debug!("create_pp_from_semantic_topic(): {} --> {}", path2anchor(&tp.path).unwrap(), pp_ah);
  let ta = TypedAnchor::try_from(&tp).expect("Should hold a TypedAnchor");

  /// Use given index_time or use the PP's creation time
  let index_time = if let Some(index_time) = maybe_index_time {
    index_time
  } else {
    let action_ts = get(pp_ah.clone(), GetOptions::content())?.unwrap().action().timestamp();
    action_ts
  };

  /// Link from Subject Path to Protocol
  create_link(
    tp.path_entry_hash()?,
    pp_ah.clone(),
    ThreadsLinkType::Protocols,
    LinkTag::new(pp.purpose),
    // str2tag(&subject_hash_str), // Store Subject Hash in Tag
  )?;
  /// Link from Subject Hash to Protocol
  create_link(
    pp.subject_hash.clone(),
    pp_ah.clone(),
    ThreadsLinkType::Threads,
    LinkTag::new(index_time.0.to_le_bytes().to_owned()), // Store index-index in Tag
    //str2tag(&ta.anchor), // Store Anchor in Tag
  )?;

  /// Global time-Index
  let global_time_tp = Path::from(GLOBAL_TIME_INDEX)
    .typed(ThreadsLinkType::GlobalTimePath)?;
  let (global_leaf_tp, _ah) = index_item(
    global_time_tp,
    pp_ah.clone().into(),
    PP_ITEM_TYPE,
    ThreadsLinkType::GlobalTimePath.try_into().unwrap(),
    index_time,
    pp.subject_hash.get_raw_39())?;

  debug!("Thread indexed at:\n  - {} (for subject: {:?}", path2anchor(&global_leaf_tp.path).unwrap(), pp.subject_hash);


  /// Done
  Ok((pp_ah, index_time))
}
