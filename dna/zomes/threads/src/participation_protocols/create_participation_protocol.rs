use hdk::prelude::*;
//use zome_utils::*;
use threads_integrity::*;
use crate::participation_protocols::*;
use crate::path_explorer::*;
use crate::time_indexing::get_time_path;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePpInput {
  pub purpose: String,
  pub rules: String,
  pub dna_hash: DnaHash,
  pub topic_hash: AnyLinkableHash,
  pub type_name: String,
}


/// Create a Pp off anything
#[hdk_extern]
pub fn create_participation_protocol(input: CreatePpInput) -> ExternResult<ActionHash> {
  let pp = ParticipationProtocol {
    purpose: input.purpose,
    rules: input.rules,
    topic_hash: input.topic_hash.clone(),
    topic_type: TopicType::Applet(AppletTopicType::from(input.topic_hash)),
  };
  return create_pp(pp, input.dna_hash, &input.type_name);
}


///
pub fn create_pp(pp: ParticipationProtocol, dna_hash: DnaHash, entry_type_name: &str) -> ExternResult<ActionHash> {

  let pp_entry = ThreadsEntry::ParticipationProtocol(pp.clone());
  let pp_ah = create_entry(pp_entry)?;
  //let pp_eh = hash_entry(pp_entry)?;

  /// Global Subjects Index
  let (tp, _subject_hash_str) = get_subject_tp(dna_hash, entry_type_name, pp.topic_hash.clone())?;
  tp.ensure()?;
  debug!("create_pp_from_semantic_topic(): {} --> {}", path2anchor(&tp.path).unwrap(), pp_ah);
  let ta = TypedAnchor::try_from(&tp).expect("Should hold a TypedAnchor");

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
    pp.topic_hash,
    pp_ah.clone(),
    ThreadsLinkType::Threads,
    str2tag(&ta.anchor), // Store Anchor in Tag
  )?;

  /// Global time-Index
  let action_timestamp = get(pp_ah.clone(), GetOptions::content())?.unwrap().action().timestamp();
  let root_time_path = Path::from(GLOBAL_TIME_INDEX)
    .typed(ThreadsLinkType::GlobalTimePath)?;
  let leaf_tp = get_time_path(root_time_path.clone(), action_timestamp)?;
  leaf_tp.ensure()?;
  create_link(
    leaf_tp.path_entry_hash()?,
    pp_ah.clone(),
    ThreadsLinkType::Protocols,
    LinkTag::new(vec![]),
  )?;
  debug!("Thread indexed at:\n  - {}", path2anchor(&leaf_tp.path).unwrap());

  /// Done
  Ok(pp_ah)
}
