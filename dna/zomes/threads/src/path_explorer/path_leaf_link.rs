use hdk::prelude::*;
use crate::path_explorer::*;

/// Struct holding info about the link between a LeafAnchor and an AnchorLeaf.
/// A LeafAnchor is an Anchor wit no sub anchors.
/// An AnchorLeaf is the target data linked from a LeafAnchor.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeafLink {
  pub index: u8,
  pub target: Vec<u8>,
  pub tag: Vec<u8>,
}


/// Return all children links from an Anchor
#[hdk_extern]
pub fn get_anchor_all_leaf_links(ta: TypedAnchor) -> ExternResult<Vec<LeafLink>>  {
  let tp = ta.as_path();
  let lls = get_path_all_leaf_links(tp)?;
  Ok(lls)
}


/// Return links from a leaf Anchor for all link types
fn get_path_all_leaf_links(tp: TypedPath) -> ExternResult<Vec<LeafLink>> {
  let zome_link_types = zome_info()?.zome_types.links;
  debug!("get_leaf_links() Leaf-anchor: {:?}", tp);
  let mut res = Vec::new();
  for szt in zome_link_types.0 {
    for link_type in szt.1 {
      let links = get_links(
        tp.path_entry_hash()?,
        LinkTypeFilter::single_type(szt.0, link_type),
        None,
      )?;
      for link in links {
        debug!("get_leaf_links() LeafLink: {:?} ; tag = {:?}", link.target, link.tag);
        res.push(LeafLink {
          index: link_type.0,
          target: link.target.as_ref().to_vec(),
          tag: link.tag.as_ref().to_vec(),
        })
      }
    }
  }
  Ok(res)
}

