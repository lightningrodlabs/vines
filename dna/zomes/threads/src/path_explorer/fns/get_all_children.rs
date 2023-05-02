// use hdk::hash_path::path::DELIMITER;
// use crate::path_explorer::{batch_convert_path_to_anchor, compTag2str, get_any_children, TypedAnchor};
// use hdk::prelude::*;


// /// Fetch all children of any anchor link-type
// /// Child is an anchor if tag is a Component (utf32) -> broken
// #[hdk_extern]
// pub fn get_all_children(parent_anchor: String) -> ExternResult<Vec<TypedAnchor>> {
//   let parent_path = Path::from(parent_anchor.clone());
//   let children = get_any_children(parent_path, None)?;
//   debug!("{}: found {}", parent_anchor, children.len());
//   let mut child_anchors = Vec::new();
//   for link in children.into_iter() {
//     /// Child is an anchor if tag is a Component (utf32)
//     let Ok(comp_str) = compTag2str(&link.tag)
//       else {
//         debug!("compTag2str() failed for {:?}", link.tag.0);
//         continue;
//       };
//     let anchor = format!("{}{}{}", parent_anchor.clone(), DELIMITER, comp_str);
//     let ta = TypedAnchor::new(anchor, link.zome_index.0, link.link_type.0);
//     child_anchors.push(ta);
//   };
//   Ok(child_anchors)
// }
