use hdk::prelude::*;
use zome_utils::*;
use crate::*;


/// Struct for holding an easily exportable typed Anchor.
/// A Typed Anchor is an Anchor with LinkType associated with it.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypedAnchor {
  pub anchor: String,
  /// Flattened ScopedLinkType
  pub zome_index: u8,
  pub link_index: u8,
}



/// From TypedPath
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


///
impl TypedAnchor {
  ///
  pub fn new(anchor: String, zome_index: u8, link_index: u8) -> Self {
    TypedAnchor {zome_index, link_index, anchor}
  }

  /// into TypedPath
  pub fn as_path(&self) -> TypedPath {
    TypedPath {
      link_type: ScopedZomeType {zome_index: ZomeIndex::from(self.zome_index), zome_type: LinkType::from(self.link_index)},
      path: Path::from(self.anchor.clone()),
    }
  }


  ///
  pub fn path_hash(&self)-> EntryHash {
    return Path::from(self.anchor.clone())
      .path_entry_hash()
      .expect("Anchor should convert to entry hash");
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


  /// Return all Items hanging off this Anchor according to tag
  pub fn get_all_items(&self, link_tag: Option<LinkTag>) -> ExternResult<Vec<ItemLink>> {
    let tp = self.as_path();
    return get_all_itemlinks(tp.path, link_tag);
  }


  /// Return Items hanging off this Anchor according to filter and tag
  pub fn get_items(&self, link_filter: impl LinkTypeFilterExt, link_tag: Option<LinkTag>) -> ExternResult<Vec<ItemLink>> {
    let tp = self.as_path();
    return get_itemlinks(tp.path, link_filter, link_tag);
  }

}

///
pub fn batch_convert_path_to_anchor(tps: Vec<TypedPath>) -> ExternResult<Vec<TypedAnchor>> {
  let this_zome_index = zome_info()?.id.0;
  let mut res = Vec::new();
  for tp in tps {
    //let leaf = child_pair.1.leaf().unwrap();
    //let leaf_str = String::try_from(leaf).unwrap();
    //debug!("get_anchor_children()    - leaf: '{}' ; tag = {:?}", leaf_str, child_path.make_tag());
    let Ok(str) = path2anchor(&tp.path)
      else { return Err(wasm_error!(WasmErrorInner::Guest("Failed to convert Path to Anchor".to_string()))) };
    res.push(TypedAnchor::new(str, this_zome_index, tp.link_type.zome_type.0));
  }
  Ok(res)
}
