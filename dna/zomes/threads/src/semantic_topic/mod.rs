
mod publish_semantic_topic;
mod pull_all_semantic_topics;
mod update_semantic_topic;
mod delete_semantic_topic;


use hdi::hash_path::path::DELIMITER;
use hdk::prelude::*;
//use zome_utils::*;
use threads_integrity::*;


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
