use hdk::prelude::*;
use crate::path_explorer::*;


//pub fn probe_leafs(&self, link_type: LinkType, link_tag: Option<LinkTag>) -> ExternResult<Vec<LeafLink>> {


#[hdk_extern]
pub fn get_leaf_anchors(ta: TypedAnchor) -> ExternResult<Vec<TypedAnchor>> {
  debug!("get_leaf_anchors() {:?}", ta);
  let res = ta.probe_leaf_anchors()?;
  Ok(res)
}
