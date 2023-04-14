use hdk::hash_path::path::DELIMITER;
use hdk::prelude::*;
use threads_integrity::*;


mod create_semantic_topic;
mod get_all_semantic_topics;


///
pub(crate) fn determine_topic_anchor(title: String) -> ExternResult<TypedPath> {
  // conver to lowercase for path for ease of search
  let lower_title = title.to_lowercase();
  let (prefix, _) = lower_title.as_str().split_at(3);
  // FIXME remove first letter depth
  Path::from(format!("{}{}{}{}{}", ROOT_ANCHOR_SEMANTIC_TOPICS, DELIMITER, lower_title.chars().next().unwrap(), DELIMITER, prefix))
    .typed(ThreadsLinkType::SemanticPrefixPath)
}
