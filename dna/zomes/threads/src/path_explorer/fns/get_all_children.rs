use hdk::hash_path::path::DELIMITER;
use crate::path_explorer::{batch_convert_path_to_anchor, compTag2str, get_any_children, TypedAnchor};
use hdk::prelude::*;

///
#[hdk_extern]
pub fn get_all_children(parent_anchor: String) -> ExternResult<Vec<TypedAnchor>> {
  let parent_path = Path::from(parent_anchor.clone());
  let children = get_any_children(parent_path, None)?;
  let child_anchors = children.into_iter().map(|link| {
    let comp_str = compTag2str(&link.tag).unwrap();
    let anchor = format!("{}{}{}", parent_anchor.clone(), DELIMITER, comp_str);
    return TypedAnchor::new(anchor, link.zome_index.0, link.link_type.0);
  }).collect();
  Ok(child_anchors)
}
