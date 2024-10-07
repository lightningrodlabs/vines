use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use time_indexing::{index_item};
use path_explorer_types::*;
use crate::participation_protocols::*;
use crate::subjects::link_subject_to_pp;

/// Create a Pp off of anything
#[hdk_extern]
#[feature(zits_blocking)]
pub fn publish_participation_protocol(pp: ParticipationProtocol) -> ExternResult<(ActionHash, Timestamp)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let maybe_index_time: Option<Timestamp> = None; // FIXME
  let pp_entry = ThreadsEntry::ParticipationProtocol(pp.clone());
  let pp_ah = create_entry(pp_entry)?;

  /// Add subject to Subjects PathTree and link it to PP
  let subject_tp = get_subject_tp(pp.subject.clone())?;
  subject_tp.ensure()?;
  debug!("{} --> {}", path2anchor(&subject_tp.path).unwrap(), pp_ah);
  let _ta = TypedAnchor::try_from(&subject_tp).expect("Should hold a TypedAnchor");
  create_link(
    subject_tp.path_entry_hash()?,
    pp_ah.clone(),
    ThreadsLinkType::Protocols,
    LinkTag::new(pp.purpose),
    // str2tag(&subject_hash_str), // Store Subject Hash in Tag
  )?;

  /// Use given index_time or use the PP's creation time
  let index_time = if let Some(index_time) = maybe_index_time {
    index_time
  } else {
    let action_ts = get(pp_ah.clone(), GetOptions::network())?.unwrap().action().timestamp();
    action_ts
  };

  /// Link from Subject Hash to PP
  link_subject_to_pp(&pp.subject, &pp_ah, index_time.clone())?;

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
