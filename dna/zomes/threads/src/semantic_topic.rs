use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;

/// Creates the SemanticTopic
#[hdk_extern]
pub fn create_semantic_topic(semanticTopic: SemanticTopic) -> ExternResult<ActionHash> {
  /// TODO: Make sure Topic does not already exists
  let ah = create_entry(ThreadsEntry::SemanticTopic(semanticTopic.clone()))?;
  let path = prefix_topic_path(semanticTopic.title.clone())?;
  path.ensure()?;
  create_link(
    path.path_entry_hash()?,
    ah.clone(),
    ThreadsLinkType::Topics,
    LinkTag::new(semanticTopic.title.to_lowercase().as_bytes().to_vec()),
  )?;
  Ok(ah)
}


///
fn prefix_topic_path(title: String) -> ExternResult<TypedPath> {
  // conver to lowercase for path for ease of search
  let lower_title = title.to_lowercase();
  let (prefix, _) = lower_title.as_str().split_at(3);
  Path::from(format!("all_semantic_topics.{}", prefix)).typed(ThreadsLinkType::SemanticPrefixPath)
}


/// From a title filter of at least 3 characters, returns all the semantic topics whose title starts with that prefix
/// Ignores case, will return ActionHash, EntryHash and title of SemanticTopic entry.
#[hdk_extern]
pub fn search_semantic_topics(title_filter: String) -> ExternResult<Vec<(ActionHash, EntryHash, String)>> {
  if title_filter.len() < 3 {
    return zome_error!("Cannot search with a prefix less than 3 characters");
  }

  let prefix_path = prefix_topic_path(title_filter.clone())?;

  let semantic_topics = get_semantic_topics(prefix_path)?;
  Ok(semantic_topics)
}


/// return ActionHash, EntryHash and title of every known SemanticTopic entry.
#[hdk_extern]
pub fn get_all_semantic_topics(_: ()) -> ExternResult<Vec<(ActionHash, EntryHash, String)>> {
  let root_path = Path::from("all_semantic_topics").typed(ThreadsLinkType::SemanticPrefixPath)?;
  let children = root_path.children_paths()?;
  debug!("get_all_semantic_topics() found {} children", children.len());
  let mut res: Vec<(ActionHash, EntryHash, String)> = Vec::new();
  for child_path in children {
    let mut sts = get_semantic_topics(child_path)?;
    res.append(&mut sts);
  }
  Ok(res)
}


///
fn get_semantic_topics(path: TypedPath) -> ExternResult<Vec<(ActionHash, EntryHash, String)>>  {
  let links = get_links(path.path_entry_hash()?, ThreadsLinkType::Topics, None)?;

  let semantic_topics = links
    .into_iter()
    .map(|l| {
      let ah = ActionHash::from(l.target);
      let (eh, typed) = get_typed_from_ah::<SemanticTopic>(ah.clone())
        .unwrap(); // FIXME
      // let Ok((eh, _typed)) = get_typed_from_ah::<SemanticTopic>(ah.clone())
      //   else { return };
      return (ah, eh, typed.title);
    })
    .collect();
  /// TODO: remove duplicates
  /// Done
  Ok(semantic_topics)
}
