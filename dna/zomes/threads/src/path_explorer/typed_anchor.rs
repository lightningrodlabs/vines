use hdk::prelude::*;
use crate::path_explorer::*;


/// Struct for holding an easily exportable typed Anchor.
/// An Anchor is a Holochain Path made exclusively of human readable strings.
/// A Typed Anchor is an Anchor with LinkType associated with it.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypedAnchor {
  pub anchor: String,
  pub zome_index: u8,
  pub link_index: u8,
}


///
impl TypedAnchor {
  pub fn new(anchor: String, zome_index: u8, link_index: u8) -> Self {
    TypedAnchor {zome_index, link_index, anchor}
  }

  // pub fn from(anchor: String, link_index: u8) -> Self {
  //   TypedAnchor {zome_index: zome_info().unwrap().id.0, link_index, anchor}
  // }

  ///
  pub fn as_path(&self) -> TypedPath {
    TypedPath {
      link_type: ScopedZomeType {zome_index: ZomeIndex::from(self.zome_index), zome_type: LinkType::from(self.link_index)},
      path: Path::from(self.anchor.clone()),
    }
  }


  ///
  pub fn children(&self) -> ExternResult<Vec<TypedPath>> {
    let tp = self.as_path();
    let subs = tp_children_paths(&tp)?;
    Ok(subs)
  }


  ///
  pub fn is_leaf(&self) -> bool {
    return self.children()
      .expect("Failed to get Anchor children")
      .is_empty();
  }


  /// Return all LeafAnchors from this Anchor
  /// USE WITH CARE as this can easily timeout as it's a recursive loop of get_links()
  pub fn probe_leaf_anchors(&self) -> ExternResult<Vec<TypedAnchor>> {
    let res_tps = tp_leaf_children(&self.as_path())?;
    //debug!("TypedAnchor.probe_leaf_anchors() '{}' has {} children.", self.anchor, res_tps.len());
    let res = res_tps
      .into_iter()
      .map(|tp| TypedAnchor::try_from(&tp).unwrap())
      .collect();
    Ok(res)
  }


  /// Return all AnchorLeafs of type from this Anchor
  pub fn probe_leafs(&self, link_tag: Option<LinkTag>) -> ExternResult<Vec<LeafLink>> {
    let tp = self.as_path();
    let links = get_links(
    tp.path_entry_hash()?,
    LinkTypeFilter::single_type(tp.link_type.zome_index, tp.link_type.zome_type),
    link_tag,
    )?;
    let res = convert_links_to_leaf_links(links)?;
    Ok(res)
  }
}


///
impl TryFrom<&TypedPath> for TypedAnchor {
  type Error = SerializedBytesError;
  fn try_from(tp: &TypedPath) -> Result<Self, Self::Error> {
    Ok(TypedAnchor {
      zome_index: tp.link_type.zome_index.0,
      link_index: tp.link_type.zome_type.0,
      anchor: path2anchor(&tp.path)?,
    })
  }
}

