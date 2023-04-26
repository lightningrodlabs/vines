use hdk::prelude::*;
use hdk::prelude::holo_hash::AnyDhtHashB64;
use zome_utils::zome_error;
use crate::path_explorer::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct MyLinkFilter(pub Vec<(u8, Vec<u8>)>);

impl LinkTypeFilterExt for MyLinkFilter {
  fn try_into_filter(self) -> Result<LinkTypeFilter, WasmError> {
    let zomes: Vec<ZomeIndex> = self.0.iter().map(|(a, _b)| a.clone().into()).collect();
    let mut res: Vec<(ZomeIndex, Vec<LinkType>)> = Vec::new();
    let mut type_count = 0;
    for pair in self.0 {
      let lts: Vec<LinkType> = pair.1.iter().map(|a| a.clone().into()).collect();
      type_count += lts.len();
      res.push((pair.0.into(), lts))
    }
    if type_count == 0 {
      return Ok(LinkTypeFilter::Dependencies(zomes));
    }
    Ok(LinkTypeFilter::Types(res))
  }
}

///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetItemsInput {
  pub anchor: String, // We don't need a typedAnchor here since we care only about the ItemLink type and not the Anchor type
  pub link_filter: MyLinkFilter, //TODO: LinkTypeFilter once defined in JS
  pub link_tag: Option<Vec<u8>>, // TODO: LinkTag once defined in JS
}


///
#[hdk_extern]
pub fn get_items(input: GetItemsInput) -> ExternResult<Vec<ItemLink>> {
  let path = Path::from(&input.anchor);
  let res = get_itemlinks(path, input.link_filter, input.link_tag.map(|a| LinkTag::from(a.clone())))
    ?;
  Ok(res)
}


/// Return all itemLinks from a LeafAnchor
#[hdk_extern]
pub fn get_all_items(leaf_anchor: String) -> ExternResult<Vec<ItemLink>>  {
  if leaf_anchor.is_empty() {
    return zome_error!("get_all_items() Failed. Input string is empty");
  }
  let path = Path::from(leaf_anchor.clone());
  let lls = get_all_itemlinks(path, None)?;
  debug!("get_all_items() {} ; found {}", leaf_anchor, lls.len());
  Ok(lls)
}


/// Return all itemLinks from a B64 hash
#[hdk_extern]
pub fn get_all_items_from_b64(b64: AnyDhtHashB64) -> ExternResult<Vec<ItemLink>>  {
  let hash: AnyDhtHash = b64.clone().into();
  debug!("get_all_items_from_b64() {} -> {}", b64, hash);
  let mut links = get_links(hash, all_dna_link_types(), None)?;
  debug!("get_all_items_from_b64() found {} children", links.len());
  /// Only need one of each hash.
  links.sort_unstable_by(|a, b| a.tag.cmp(&b.tag));
  links.dedup_by(|a, b| a.tag.eq(&b.tag));
  /// Convert to ItemLinks
  let res = links.into_iter().map(|link| ItemLink::from(link)).collect();
  Ok(res)
}


// /// Return all itemLinks from a B64 hash
// #[hdk_extern]
// pub fn get_all_items_from_b64(b64: AnyDhtHashB64) -> ExternResult<Vec<ItemLink>>  {
//   let hash: AnyDhtHash = b64.into();
//   let anchor = hash2anchor(hash);
//   debug!("get_all_items_from_b64() {} -> {}", b64, anchor);
//   let lls = get_all_items(anchor)?;
//   Ok(lls)
// }

