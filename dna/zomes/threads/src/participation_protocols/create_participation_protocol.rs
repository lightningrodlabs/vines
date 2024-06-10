use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use time_indexing::{index_item};
use path_explorer_types::*;
use crate::participation_protocols::*;
use crate::notifications::*;

/// Create a Pp off of anything
#[hdk_extern]
#[feature(zits_blocking)]
pub fn create_participation_protocol(pp: ParticipationProtocol) -> ExternResult<(ActionHash, Timestamp, Option<(AgentPubKey, WeaveNotification)>)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let maybe_index_time: Option<Timestamp> = None; // FIXME
  let pp_entry = ThreadsEntry::ParticipationProtocol(pp.clone());
  let pp_ah = create_entry(pp_entry)?;
  //let pp_eh = hash_entry(pp_entry)?;
  /// Global Subjects Index
  let subject_tp = get_subject_tp(pp.subject.applet_id, &pp.subject.type_name, pp.subject.dna_hash.clone(), pp.subject.hash.clone())?;
  subject_tp.ensure()?;
  debug!("create_pp(): {} --> {}", path2anchor(&subject_tp.path).unwrap(), pp_ah);
  let _ta = TypedAnchor::try_from(&subject_tp).expect("Should hold a TypedAnchor");

  /// Use given index_time or use the PP's creation time
  let index_time = if let Some(index_time) = maybe_index_time {
    index_time
  } else {
    let action_ts = get(pp_ah.clone(), GetOptions::network())?.unwrap().action().timestamp();
    action_ts
  };

  /// Link from Subject Path to Protocol
  create_link(
    subject_tp.path_entry_hash()?,
    pp_ah.clone(),
    ThreadsLinkType::Protocols,
    LinkTag::new(pp.purpose),
    // str2tag(&subject_hash_str), // Store Subject Hash in Tag
  )?;
  /// Link from Subject Hash to Protocol
  create_link(
    pp.subject.hash.clone(),
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
    pp.subject.hash.get_raw_39())?;

  debug!("Thread indexed at:\n  - {} (for subject: {:?}", path2anchor(&global_leaf_tp.path).unwrap(), pp.subject.hash);

  /// Notify Subject author
  let mut maybe_notif = None;
  if pp.subject.dna_hash == dna_info()?.hash {
    if let Ok(subject_hash) = AnyDhtHash::try_from(pp.subject.hash) {
      let maybe_author = get_author(&subject_hash);
      if let Ok(author) = maybe_author {
        let maybe= send_inbox_item(SendInboxItemInput { content: pp_ah.clone().into(), who: author.clone(), event: NotifiableEvent::Fork })?;
        if let Some((_link_ah, notif)) = maybe {
          maybe_notif = Some((author, notif))
        }
      }
    }
  }

  /// Done
  Ok((pp_ah, index_time, maybe_notif))
}
