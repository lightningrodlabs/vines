use hdk::prelude::*;
use crate::path_explorer::{get_all_leaf_links, get_all_leaf_links_from_path, LeafLink, TypedAnchor};


/// Return all children links from an Anchor
#[hdk_extern]
pub fn get_all_leaf_links_from_anchor(anchor: String) -> ExternResult<Vec<LeafLink>>  {
  let path = Path::try_from(anchor)?;
  let lls = get_all_leaf_links_from_path(path)?;
  Ok(lls)
}


/// Return all children links from a hash
#[hdk_extern]
pub fn get_all_leaf_links_from_hash(dh: AnyDhtHash) -> ExternResult<Vec<LeafLink>>  {
  let lls = get_all_leaf_links(dh, None)?;
  Ok(lls)
}
