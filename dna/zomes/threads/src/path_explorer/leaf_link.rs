use hdk::prelude::*;

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

/// Return links from a leaf Anchor for all link types
pub(crate) fn get_all_leaf_links(dh: AnyDhtHash, link_tag: Option<LinkTag>) -> ExternResult<Vec<LeafLink>> {
  let zome_link_types = zome_info()?.zome_types.links;
  let mut res = Vec::new();
  for szt in zome_link_types.0 {
    for link_type in szt.1 {
      let links = get_links(
        dh.clone(),
        LinkTypeFilter::single_type(szt.0, link_type),
        link_tag.clone(),
      )?;
      for link in links {
        debug!("get_all_leaf_links() LeafLink: {:?} ; tag = {:?}", link.target, link.tag);
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


/// Return links from a leaf Anchor for all link types
pub(crate) fn get_all_leaf_links_from_path(path: Path, link_tag: Option<LinkTag>) -> ExternResult<Vec<LeafLink>> {
  debug!("get_all_leaf_links_from_path() Leaf-anchor: {:?}", path);
  let res = get_all_leaf_links(AnyDhtHash::from(path.path_entry_hash()?), link_tag)?;
  Ok(res)
}


///
pub(crate) fn convert_links_to_leaf_links(links: Vec<Link>, link_type: LinkType) -> ExternResult<Vec<LeafLink>> {
  let mut res = Vec::new();
  for link in links {
    debug!("convert_links_to_leaf_links() LeafLink: target = {} ; tag = {:?}", link.target, link.tag);
    res.push(LeafLink {
      index: link_type.0,
      target: link.target.as_ref().to_vec(),
      tag: link.tag.as_ref().to_vec(),
    })
  }
  Ok(res)
}
