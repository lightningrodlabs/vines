// use hdk::prelude::*;
// use threads_integrity::*;
// use crate::path_explorer::*;
// use crate::time_indexing::time_index::get_latest_time_indexed_links;
//

// struct GetAllItemsInput {
//   pub root: String,
//   pub link_tag: Option<LinkTag>,
// }


// /// USE WITH CARE as this can easily timeout
// pub fn get_all_items(root_tp : TypedPath) -> ExternResult<Vec<LeafLink>> {
//   let root_ta= TypedAnchor::try_from(root_tp)?;
//   let tas = root_ta.probe_leaf_anchors()?;
//   debug!("get_all_items() links.len = {}\n\n", links.len());
//   let res = links.into_iter()
//                  .map(|link| {
//                    LeafLink {
//                      index: link.link_type.0,
//                      target: link.target.as_ref().to_vec(),
//                      tag: link.tag.as_ref().to_vec(),
//                    }
//                  })
//                  .collect();
//   Ok(res)
// }
