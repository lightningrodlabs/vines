use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use time_indexing::{index_item};
use path_explorer_types::*;
use crate::participation_protocols::*;


/// Create a Pp off of anything
#[hdk_extern]
#[feature(zits_blocking)]
pub fn publish_participation_protocol(pp: ParticipationProtocol) -> ExternResult<(ActionHash, Timestamp)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let maybe_index_time: Option<Timestamp> = None; // FIXME
  let pp_entry = ThreadsEntry::ParticipationProtocol(pp.clone());
  let pp_ah = create_entry(pp_entry)?;
  //let pp_eh = hash_entry(pp_entry)?;
  /// Global Subjects Index
  let subject_tp = get_subject_tp(pp.subject.clone())?;
  subject_tp.ensure()?;
  debug!("{} --> {}", path2anchor(&subject_tp.path).unwrap(), pp_ah);
  let _ta = TypedAnchor::try_from(&subject_tp).expect("Should hold a TypedAnchor");
  /// Use given index_time or use the PP's creation time
  let index_time = if let Some(index_time) = maybe_index_time {
    index_time
  } else {
    let action_ts = get(pp_ah.clone(), GetOptions::network())?.unwrap().action().timestamp();
    action_ts
  };
  /// Link from Subject Path to PP
  create_link(
    subject_tp.path_entry_hash()?,
    pp_ah.clone(),
    ThreadsLinkType::Protocols,
    LinkTag::new(pp.purpose),
    // str2tag(&subject_hash_str), // Store Subject Hash in Tag
  )?;
  /// Link from Subject Hash to PP
  let raw_subject_hash = holo_hash_decode_unchecked(&pp.subject.address)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  let subject_hash = AnyLinkableHash::from_raw_39(raw_subject_hash)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  create_link(
    subject_hash,
    pp_ah.clone(),
    ThreadsLinkType::Threads,
    ts2Tag(index_time), // Store index-time in Tag
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
    &pp.subject.address.clone().into_bytes())?;
  debug!("Thread indexed at:\n  - {} (for subject: {:?}", path2anchor(&global_leaf_tp.path).unwrap(), pp.subject.address);
  /// Done
  Ok((pp_ah, index_time))
}
