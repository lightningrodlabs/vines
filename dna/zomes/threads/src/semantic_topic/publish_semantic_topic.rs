use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use crate::semantic_topic::{determine_topic_anchor, pull_all_semantic_topics::does_topic_exist};
//use crate::participation_protocols::*;

/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PublishTopicInput {
  pub applet_id: String,
  pub topic: SemanticTopic,
}


/// Creates the SemanticTopic
#[hdk_extern]
#[feature(zits_blocking)]
pub fn publish_semantic_topic(input: PublishTopicInput) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Make sur length is OK
  if let Ok(properties) = get_properties() {
    if input.topic.title.len() > properties.max_topic_name_length as usize ||
      input.topic.title.len() < properties.min_topic_name_length as usize {
      return error("Topic length is invalid.");
    }
  }
  /// Make sure Topic does not already exists
  let maybe = does_topic_exist(input.topic.title.clone())?;
  if let Some((ah, _eh)) = maybe {
    return Ok(ah);
  }
  /// Create entry
  let ah = create_entry(ThreadsEntry::SemanticTopic(input.topic.clone()))?;
  /// Create Topics Link
  let tp = determine_topic_anchor(input.topic.title.clone())?;
  tp.ensure()?;
  let ph = tp.path_entry_hash()?;
  debug!("create_semantic_topic() path:  '{}' {} | {}", path2anchor(&tp.path).unwrap(), tp.link_type.zome_type.0, ph);
  create_link(
    ph,
    ah.clone(),
    ThreadsLinkType::Topics,
    LinkTag::new(input.topic.title.to_lowercase().as_bytes().to_vec()),
  )?;
  // /// Create SubjetPath Link
  // let subject = Subject {
  //   address: holo_hash_encode(ah.get_raw_39()),
  //   name: input.topic.title,
  //   type_name: SEMANTIC_TOPIC_TYPE_NAME.to_string(),
  //   dna_hash_b64: holo_hash_encode(dna_info()?.hash.get_raw_39()),
  //   applet_id: input.applet_id,
  // };
  // let subject_tp = get_subject_tp(subject)?;
  // subject_tp.ensure()?;
  /// Done
  Ok(ah)
}
