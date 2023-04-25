use hdk::prelude::*;
use hdk::prelude::holo_hash::hash_type;
use crate::path_explorer::dna_zomes;

/// Struct holding info about the link between a LeafAnchor and an Item.
/// A LeafAnchor is an Anchor wit no sub anchors.
/// An Item is the object linked from a LeafAnchor.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemLink {
  pub link_type: ScopedLinkType,
  pub target: AnyDhtHash, //AnyLinkableHash TODO: replace once AnyLinkableHash is available in JS
  pub tag: LinkTag,
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
      link_type: ScopedLinkType { zome_index: link.zome_index, zome_type: link.link_type },
      target: linkable2dht(link.target),
      tag: link.tag,
    }
  }
}



///
pub fn get_itemlinks(path: Path, link_filter: impl LinkTypeFilterExt, link_tag: Option<LinkTag>) -> ExternResult<Vec<ItemLink>> {
  let links = get_links(
    path.path_entry_hash()?,
    link_filter,
    link_tag,
  )?;
  let res = links.into_iter().map(|link| ItemLink::from(link)).collect();
  Ok(res)
}


///
pub fn get_all_itemlinks(path: Path, link_tag: Option<LinkTag>) -> ExternResult<Vec<ItemLink>> {
  let all_zomes = dna_zomes();
  let res = get_itemlinks(
    path,
    LinkTypeFilter::Dependencies(all_zomes),
    link_tag.clone())
    ?;
  Ok(res)
}


// /// Return links from a LeafAnchor for all link types
// pub(crate) fn collect_any(hash: AnyDhtHash, link_tag: Option<LinkTag>) -> ExternResult<Vec<ItemLink>> {
//   let zome_link_types = zome_info()?.zome_types.links;
//   let mut res = Vec::new();
//   for szt in zome_link_types.0 {
//     for link_type in szt.1 {
//       let links = get_links(
//         hash.clone(),
//         LinkTypeFilter::single_type(szt.0, link_type),
//         link_tag.clone(),
//       )?;
//       for link in links {
//         debug!("get_all_leaf_links() LeafLink: {:?} ; tag = {:?}", link.target, link.tag);
//         res.push(ItemLink::from(link))
//       }
//     }
//   }
//   Ok(res)
// }


// /// Return links from a leaf Anchor for all link types
// pub(crate) fn get_any_itemlinks_from_path(path: Path, link_tag: Option<LinkTag>) -> ExternResult<Vec<ItemLink>> {
//   debug!("get_all_leaf_links_from_path() Leaf-anchor: {:?}", path);
//   let res = collect_any(AnyDhtHash::from(path.path_entry_hash()?), link_tag)?;
//   Ok(res)
// }

