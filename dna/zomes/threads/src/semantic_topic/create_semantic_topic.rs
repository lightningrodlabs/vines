use hdk::prelude::*;
use threads_integrity::*;
//use zome_utils::*;
use crate::path_explorer::*;
use crate::semantic_topic::determine_topic_anchor;

/// Creates the SemanticTopic
#[hdk_extern]
pub fn create_semantic_topic(semanticTopic: SemanticTopic) -> ExternResult<ActionHash> {
  /// TODO: Make sure Topic does not already exists
  let ah = create_entry(ThreadsEntry::SemanticTopic(semanticTopic.clone()))?;
  let tp = determine_topic_anchor(semanticTopic.title.clone())?;
  tp.ensure()?;
  let ph = tp.path_entry_hash()?;
  debug!("create_semantic_topic() path:  '{}' {} | {}", path2str(tp.path).unwrap(), tp.link_type.zome_type.0, ph);
  create_link(
    ph,
    ah.clone(),
    ThreadsLinkType::Topics,
    LinkTag::new(semanticTopic.title.to_lowercase().as_bytes().to_vec()),
  )?;
  Ok(ah)
}
