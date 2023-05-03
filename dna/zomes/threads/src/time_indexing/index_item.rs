use hdk::prelude::*;
//use zome_utils::*;
use crate::path_explorer::*;
use crate::time_indexing::*;


/// Index an Item according to given time and root TypedPath
/// Returns the LeafAnchor and ActionHash of the created link
pub fn index_item(
  root_tp: TypedPath,
  item_hash: AnyLinkableHash,
  item_type: &str,
  index_time_us: Timestamp,
  tag_data: &[u8]) -> ExternResult<(TypedPath, ActionHash)> {
  let tag = TimedItemTag {
    item_type: item_type.to_string(),
    devtest_timestamp: index_time_us,
    custom_data: tag_data.to_vec(),
  };
  /// Create TimeIndexPath
  let leaf_tp = get_time_path(root_tp.clone(), index_time_us)?;
  leaf_tp.ensure()?;
  /// Create Link from TimeIndexPath to Item
  let link_ah = create_link(
    leaf_tp.path_entry_hash()?,
    item_hash,
    root_tp.link_type,
    LinkTag::new(tag.to_vec()),
  )?;
  debug!("Item indexed at: {}", path2anchor(&leaf_tp.path).unwrap());
  /// Done
  Ok((leaf_tp, link_ah))
}
