use hdk::hdi::prelude::DnaHash;
use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use time_indexing::{index_item};
use path_explorer::*;
use crate::participation_protocols::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePpInput {
  pub pp: ParticipationProtocol,
  pub applet_id: EntryHash,
  pub dna_hash: DnaHash,
}


/// Create a Pp off anything
#[hdk_extern]
pub fn create_participation_protocol(input: CreatePpInput) -> ExternResult<(ActionHash, Timestamp)> {
  return create_pp(input.pp, input.applet_id, input.dna_hash, None);
}


///
pub fn create_pp(pp: ParticipationProtocol, applet_id: EntryHash, dna_hash: DnaHash, maybe_index_time: Option<Timestamp>) -> ExternResult<(ActionHash, Timestamp)> {

  let pp_entry = ThreadsEntry::ParticipationProtocol(pp.clone());
  let pp_ah = create_entry(pp_entry)?;
  //let pp_eh = hash_entry(pp_entry)?;

  /// Global Subjects Index
  let tp = get_subject_tp(applet_id, &pp.subject_type, dna_hash, pp.subject_hash.clone())?;
  tp.ensure()?;
  debug!("create_pp_from_semantic_topic(): {} --> {}", path2anchor(&tp.path).unwrap(), pp_ah);
  let _ta = TypedAnchor::try_from(&tp).expect("Should hold a TypedAnchor");

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
    LinkTag::new(index_time.0.to_le_bytes().to_owned()), // Store index-time in Tag
    //str2tag(&ta.anchor), // Store Anchor in Tag
  )?;

  /// Global time-Index
  let global_time_tp = Path::from(GLOBAL_TIME_INDEX)
    .typed(ThreadsLinkType::GlobalTimePath)?;
  let (global_leaf_tp, _ah) = index_item(
    global_time_tp,
    pp_ah.clone().into(),
    PP_ITEM_TYPE,
    ThreadsLinkType::TimeItem.try_into().unwrap(),
    index_time,
    pp.subject_hash.get_raw_39())?;

  debug!("Thread indexed at:\n  - {} (for subject: {:?}", path2anchor(&global_leaf_tp.path).unwrap(), pp.subject_hash);


  /// Done
  Ok((pp_ah, index_time))
}
