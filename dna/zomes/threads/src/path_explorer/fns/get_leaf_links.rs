use hdk::prelude::*;
use crate::path_explorer::*;


//pub fn probe_leafs(&self, link_type: LinkType, link_tag: Option<LinkTag>) -> ExternResult<Vec<LeafLink>> {

/// A Typed Anchor is an Anchor with LinkType associated with it.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLeafsInput {
  pub typed_anchor: TypedAnchor,
  pub link_tag: Option<Vec<u8>>
}


#[hdk_extern]
pub fn get_leafs(input: GetLeafsInput) -> ExternResult<Vec<LeafLink>> {
  let res = input.typed_anchor.probe_leafs(input.link_tag.map(|tag | LinkTag::from(tag)))?;
  Ok(res)
}
