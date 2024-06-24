use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use path_explorer_types::*;
use crate::*;
use crate::semantic_topic::determine_topic_anchor;


/// Walk semantic-topic AnchorTree
/// Return EntryHash and title of every known SemanticTopic entry.
#[hdk_extern]
pub fn pull_all_semantic_topics(_: ()) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let root_path = Path::from(ROOT_ANCHOR_SEMANTIC_TOPICS).typed(ThreadsLinkType::SemanticTopicPath)?;
  let root_anchor = TypedAnchor::try_from(&root_path).unwrap();
  debug!("pull_all_semantic_topics() {:?}", root_anchor);
  let leaf_anchors = root_anchor.walk()?;
  debug!("pull_all_semantic_topics() {} leaf_anchors found.", leaf_anchors.len());
  let mut pulses = Vec::new();
  for leaf_anchor in leaf_anchors {
    let sts = pull_semantic_topics(leaf_anchor.anchor)?;
    for (record, _) in sts {
      let entry_pulse = EntryPulse::from_NewEntry_record(record, false);
      pulses.push(ThreadsSignalProtocol::Entry(entry_pulse));
    }
  }
  /// Emit signal
  emit_threads_signal(pulses)?;
  ///
  Ok(())
}


///
fn pull_semantic_topics(leaf_anchor: String) -> ExternResult<Vec<(Record, SemanticTopic)>>  {
  let path = Path::from(&leaf_anchor);
  let itemlinks = get_itemlinks(path, ThreadsLinkType::Topics.try_into_filter()?, None)?;
  debug!("pull_semantic_topics() {} leaf_links found", itemlinks.len());
  let semantic_topics = itemlinks
    .into_iter()
    .map(|ll| {
      let eh = ll.item_hash.into_entry_hash().unwrap();
      let (record, typed) = get_typed_and_record::<SemanticTopic>(&eh.into())
        .unwrap(); // FIXME
      return (record, typed);
      //return (eh, typed.title);
    })
    .collect();
  /// TODO: remove duplicates
  /// Done
  Ok(semantic_topics)
}


/// From a title filter of at least 3 characters, returns all the semantic topics whose title starts with that prefix
/// Ignores case, will return ActionHash, EntryHash and title of SemanticTopic entry.
#[hdk_extern]
pub fn search_semantic_topics(title_filter: String) -> ExternResult<Vec<(EntryHash, String)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  if title_filter.len() < 3 {
    return zome_error!("Cannot search with a prefix less than 3 characters");
  }
  let tp = determine_topic_anchor(title_filter.clone())?;
  let semantic_topics: Vec<(EntryHash, String)> = pull_semantic_topics(path2anchor(&tp.path).unwrap())?
    .into_iter()
    .map(|(record, typed)| (record.action().entry_hash().unwrap().to_owned(), typed.title))
    .collect();
  Ok(semantic_topics)
}
