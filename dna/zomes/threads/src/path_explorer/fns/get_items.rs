use hdk::prelude::*;
use crate::path_explorer::*;


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetItemsInput {
  pub anchor: String, // We don't need a typedAnchor here since we care only about the ItemLink type and not the Anchor type
  pub link_filter: LinkTypeFilter,
  pub link_tag: Option<LinkTag>,
}


///
#[hdk_extern]
pub fn get_items(input: GetItemsInput) -> ExternResult<Vec<ItemLink>> {
  let path = Path::from(&input.anchor);
  let res = get_itemlinks(path, input.link_filter, input.link_tag)
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


// /// Return all itemLinks from a hash
// #[hdk_extern]
// pub fn get_all_items_from_hash(dh: AnyDhtHash) -> ExternResult<Vec<ItemLink>>  {
//   let lls = collect_any(dh, None)?;
//   Ok(lls)
// }

