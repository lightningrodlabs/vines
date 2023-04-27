use hdk::prelude::*;
use hdk::prelude::holo_hash::hash_type;
use crate::path_explorer::{all_dna_link_types};
use crate::time_indexing::timepath_utils::convert_timepath_to_timestamp;

/// Struct holding info about the link between a LeafAnchor and an Item.
/// A LeafAnchor is an Anchor wit no sub anchors.
/// An Item is the object linked from a LeafAnchor.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemLink {
  pub target: AnyDhtHash, //AnyLinkableHash TODO: replace once AnyLinkableHash is available in JS
  pub tag: Vec<u8>, // LinkTag ; TODO
  /// Flattened ScopedLinkType
  pub zome_index: u8,
  pub link_index: u8,
}


fn linkable2dht(hash: AnyLinkableHash) -> AnyDhtHash {
  match hash.hash_type() {
    hash_type::AnyLinkable::Entry => {
      AnyDhtHash::from(hash.into_entry_hash().unwrap())
    }
    hash_type::AnyLinkable::Action => {
      AnyDhtHash::from(hash.into_action_hash().unwrap())
    }
    hash_type::AnyLinkable::External => {
      panic!("Can't convert External hash to AnyDhtHash");
    }
  }
}


impl ItemLink {
  pub fn from(link: Link) -> ItemLink {
    ItemLink {
      zome_index: link.zome_index.0,
      link_index: link.link_type.0,
      target: linkable2dht(link.target),
      tag: link.tag.0,
    }
  }
}


///
pub fn get_itemlinks(path: Path, link_filter: impl LinkTypeFilterExt, link_tag: Option<LinkTag>) -> ExternResult<Vec<ItemLink>> {
  /// Grab Items
  let mut links = get_links(
    path.path_entry_hash()?,
    link_filter,
    link_tag,
  )?;
  /// Convert to ItemLinks
  let res = links.into_iter().map(|link| ItemLink::from(link)).collect();
  Ok(res)
}


///
pub fn get_all_itemlinks(path: Path, link_tag: Option<LinkTag>) -> ExternResult<Vec<ItemLink>> {
  let res = get_itemlinks(path, all_dna_link_types(), link_tag.clone())?;
  Ok(res)
}
