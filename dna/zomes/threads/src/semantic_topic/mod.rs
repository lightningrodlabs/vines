
mod create_semantic_topic;
mod get_all_semantic_topics;
mod update_semantic_topic;


use hdi::hash_path::path::DELIMITER;
use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;


/// Get a SemanticTopic
#[hdk_extern]
pub fn get_topic(eh: EntryHash) -> ExternResult<SemanticTopic> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  debug!("get_topic() {:?}", eh);
  let typed = get_typed_from_eh(eh)?;
  Ok(typed)
}



/// Get all SemanticTopics in local source-chain
#[hdk_extern]
pub fn query_semantic_topics(_: ()) -> ExternResult<Vec<(Timestamp, EntryHash, SemanticTopic)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let tuples = get_all_typed_local::<SemanticTopic>( EntryType::App(ThreadsEntryTypes::SemanticTopic.try_into().unwrap()))?;
  let res = tuples.into_iter().map(|(_ah, create_action, typed)| {
    (create_action.timestamp, create_action.entry_hash, typed)
  }).collect();
  Ok(res)
}


///
pub(crate) fn determine_topic_anchor(title: String) -> ExternResult<TypedPath> {
  // conver to lowercase for path for ease of search
  let lower_title = title.to_lowercase();
  let mut anchor = title.as_str();
  if title.len() > 3 {
    let (prefix, _) = lower_title.as_str().split_at(3);
    anchor = prefix;
  }
  // FIXME remove first letter depth
  Path::from(format!("{}{}{}{}{}", ROOT_ANCHOR_SEMANTIC_TOPICS, DELIMITER, lower_title.chars().next().unwrap(), DELIMITER, anchor))
    .typed(ThreadsLinkType::SemanticTopicPath)
}
