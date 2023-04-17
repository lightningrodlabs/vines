use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use crate::path_explorer::*;
use crate::semantic_topic::determine_topic_anchor;
use crate::utils::get_threads_zome_index;


/// return ActionHash, EntryHash and title of every known SemanticTopic entry.
#[hdk_extern]
pub fn get_all_semantic_topics(_: ()) -> ExternResult<Vec<(ActionHash, EntryHash, String)>> {
  let root_path = Path::from(ROOT_ANCHOR_SEMANTIC_TOPICS).typed(ThreadsLinkType::SemanticPrefixPath)?;
  let root_anchor = TypedAnchor::try_from(&root_path).unwrap();
  debug!("get_all_semantic_topics() {:?}", root_anchor);
  let leaf_anchors = root_anchor.probe_leaf_anchors()?;
  debug!("get_all_semantic_topics() {} leaf_anchors found.", leaf_anchors.len());
  let mut res: Vec<(ActionHash, EntryHash, String)> = Vec::new();
  for leaf_anchor in leaf_anchors {
    let mut sts = get_semantic_topics(leaf_anchor.anchor)?;
    //debug!("get_all_semantic_topics() sts {:?}", sts);
    res.append(&mut sts);
  }
  //debug!("get_all_semantic_topics() res {:?}", res);
  Ok(res)
}


///
fn get_semantic_topics(leaf_anchor: String) -> ExternResult<Vec<(ActionHash, EntryHash, String)>>  {
  debug!("*** dna_info.zome_names: {:?}", dna_info()?.zome_names);
  let search_ta = TypedAnchor::new(leaf_anchor.clone(), get_threads_zome_index(), ScopedLinkType::try_from(ThreadsLinkType::Topics)?.zome_type.0);
  debug!("get_semantic_topics() leaf_anchor: '{}' | {:?}", leaf_anchor, search_ta);
  let leaf_links = search_ta.probe_leafs(None)?;
  debug!("get_semantic_topics() {} leaf_links found", leaf_links.len());
  let semantic_topics = leaf_links
    .into_iter()
    .map(|ll| {
      let ah = ActionHash::from_raw_39(ll.target).unwrap();
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


// ///
// fn get_semantic_topics(tp: TypedPath) -> ExternResult<Vec<(ActionHash, EntryHash, String)>>  {
//   let ph = tp.path_entry_hash()?;
//   debug!("get_semantic_topics() path  {} | {}", path2str(tp.path).unwrap(), ph);
//   let links = get_links(ph, ThreadsLinkType::Topics, None)?;
//   debug!("get_semantic_topics() links {:?}", links);
//   let semantic_topics = links
//     .into_iter()
//     .map(|l| {
//       let ah = ActionHash::from(l.target);
//       let (eh, typed) = get_typed_from_ah::<SemanticTopic>(ah.clone())
//         .unwrap(); // FIXME
//       // let Ok((eh, _typed)) = get_typed_from_ah::<SemanticTopic>(ah.clone())
//       //   else { return };
//       return (ah, eh, typed.title);
//     })
//     .collect();
//   /// TODO: remove duplicates
//   /// Done
//   Ok(semantic_topics)
// }


/// From a title filter of at least 3 characters, returns all the semantic topics whose title starts with that prefix
/// Ignores case, will return ActionHash, EntryHash and title of SemanticTopic entry.
#[hdk_extern]
pub fn search_semantic_topics(title_filter: String) -> ExternResult<Vec<(ActionHash, EntryHash, String)>> {
  if title_filter.len() < 3 {
    return zome_error!("Cannot search with a prefix less than 3 characters");
  }
  let tp = determine_topic_anchor(title_filter.clone())?;
  let semantic_topics = get_semantic_topics(path2str(&tp.path).unwrap())?;
  Ok(semantic_topics)
}
