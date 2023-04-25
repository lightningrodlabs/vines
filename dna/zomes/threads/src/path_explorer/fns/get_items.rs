use hdk::prelude::*;
use hdk::prelude::holo_hash::AnyDhtHashB64;
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
  let path = Path::from(leaf_anchor);
  let lls = get_all_itemlinks(path, None)?;
  Ok(lls)
}


/// Return all itemLinks from a B64 hash
#[hdk_extern]
pub fn get_all_items_from_b64(b64: AnyDhtHashB64) -> ExternResult<Vec<ItemLink>>  {
  let hash: AnyDhtHash = b64.into();
  let anchor = hash2anchor(hash);
  let lls = get_all_items(anchor)?;
  Ok(lls)
}

