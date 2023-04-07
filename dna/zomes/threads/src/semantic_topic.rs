use hdk::prelude::*;

use threads_integrity::*;

/// Creates the SemanticTopic
#[hdk_extern]
pub fn create_semantic_topic(semanticTopic: SemanticTopic) -> ExternResult<ActionHash> {
  let ah = create_entry(ThreadsEntry::SemanticTopic(semanticTopic.clone()))?;
  let path = prefix_topic_path(semanticTopic.title.clone())?;
  path.ensure()?;
  Ok(ah)
}


///
fn prefix_topic_path(title: String) -> ExternResult<TypedPath> {
  // conver to lowercase for path for ease of search
  let lower_title = title.to_lowercase();
  let (prefix, _) = lower_title.as_str().split_at(3);
  Path::from(format!("all_semantic_topics.{}", prefix)).typed(ThreadsLinkType::SemanticPrefixPath)
}
