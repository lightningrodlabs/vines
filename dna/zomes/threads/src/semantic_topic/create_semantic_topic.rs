use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use crate::semantic_topic::determine_topic_anchor;

/// Creates the SemanticTopic
#[hdk_extern]
#[feature(zits_blocking)]
pub fn create_semantic_topic(semanticTopic: SemanticTopic) -> ExternResult<EntryHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Make sur length is OK
  if let Ok(properties) = get_properties() {
    if semanticTopic.title.len() > properties.max_topic_name_length as usize ||
      semanticTopic.title.len() < properties.min_topic_name_length as usize {
      return error("Topic length is invalid.");
    }
  }
  /// TODO: Make sure Topic does not already exists
  let eh = hash_entry(semanticTopic.clone())?;
  let _ah = create_entry(ThreadsEntry::SemanticTopic(semanticTopic.clone()))?;
  let tp = determine_topic_anchor(semanticTopic.title.clone())?;
  tp.ensure()?;
  let ph = tp.path_entry_hash()?;
  debug!("create_semantic_topic() path:  '{}' {} | {}", path2anchor(&tp.path).unwrap(), tp.link_type.zome_type.0, ph);
  create_link(
    ph,
    eh.clone(),
    ThreadsLinkType::Topics,
    LinkTag::new(semanticTopic.title.to_lowercase().as_bytes().to_vec()),
  )?;
  Ok(eh)
}
