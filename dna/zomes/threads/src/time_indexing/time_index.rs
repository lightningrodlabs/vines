use hdk::{
  hash_path::path::{TypedPath},
  prelude::*,
};
use std::cmp;
use zome_utils::zome_error;
use crate::path_explorer::{get_all_leaf_links, get_all_leaf_links_from_path, tp_children};
use crate::time_indexing::timepath_utils::*;


/// Traverse the time-index tree from `end_ts` to `start_ts` until `target_count` links are found.
pub fn get_latest_time_indexed_links(
  root_tp: TypedPath,
  start_ts: Timestamp,
  end_ts: Timestamp,
  target_count: usize,
  link_tag: Option<LinkTag>,
) -> ExternResult<Vec<Link>> {
  /// TODO: let origin_time = dna_info()?.origin_time
  /// check start_time > origin_time

  let Ok(time_diff) = end_ts - start_ts
    else { return zome_error!("Start time must be before end time") } ;

  /// end_time must be longer than 1 hour, otherwise return empty list
  //let Ok(latest_included_timestamp) = end_time - std::time::Duration::from_secs(60 * 60)
  //  else { return Ok(Vec::new()); };
  if time_diff < chrono::Duration::hours(1) {
    let time_path = get_time_path(root_tp, start_ts)?;
    let leaf_links = get_all_leaf_links_from_path(time_path.path, link_tag)?;
    //return Ok(leaf_links);
    return Ok(Vec::new());
  }


  /// Floor to the hour
  let end_time = Timestamp::from_micros((end_ts.as_seconds_and_nanos().0 / 3600) * 3600 * 1000 * 1000);
  let start_time = Timestamp::from_micros((start_ts.as_seconds_and_nanos().0 / 3600) * 3600 * 1000 * 1000);
  debug!("get_latest_time_indexed_links()\n start: {} -> {} \n end: {} -> {}",
        start_ts.as_seconds_and_nanos().0, start_time.as_seconds_and_nanos().0,
    end_ts.as_seconds_and_nanos().0, end_time.as_seconds_and_nanos().0);


  let mut res = Vec::new();

  /// Grab links from latest time-index hour
  let latest_hour_path = get_time_path(root_tp.clone(), end_time)?;
  if latest_hour_path.exists()? {
    let mut last_hour_links = get_links(
      latest_hour_path.path_entry_hash()?,
      LinkTypeFilter::single_type(root_tp.link_type.zome_index, root_tp.link_type.zome_type),
      link_tag.clone(),
    )?;
    res.append(&mut last_hour_links);
  }


  /// Setup search loop. Grab parent
  let mut latest_seen_child_path = latest_hour_path;
  let mut current_search_path = latest_seen_child_path.parent().unwrap();
  let mut depth = 0;

  /// Traverse tree until target count is reached or root_path is reached
  while res.len() < target_count && current_search_path.as_ref().len() >= root_tp.as_ref().len() {
    if current_search_path.exists()? {
      let latest_seen_child_value =
        get_timepath_leaf_value(&latest_seen_child_path).unwrap();
      let children = tp_children(&current_search_path)?;

      let raw_children_dbg_info = children
        .iter()
        .map(|l| format!("{{ tag: {:?} timestamp: {:?} }}, ", l.tag, l.timestamp))
        .collect::<String>();

      /// Keep children older than latest time value
      let mut older_children_pairs = children
        .into_iter()
        .filter_map(|l| get_component_from_link_tag(&l).ok().map(|c| (c, l))) // filter out non-path links
        .map(|(c, l)| Ok((convert_component_to_i32(&c)?, l)))
        .collect::<Result<Vec<_>, WasmError>>()?;

      /// Remove "newer" children
      older_children_pairs.retain(|(time_value, _)| *time_value < latest_seen_child_value);

      /// Remove children older than start_time

      let link_count_before_dbg_info = res.len();

      append_target_links_recursive(older_children_pairs, &mut res, target_count, depth, root_tp.link_type, link_tag.clone())?;

      /// Debug info
      let links_added = res.get(link_count_before_dbg_info..).unwrap_or(&[]);
      debug!("get_latest_time_indexed_links() Finished including all descendants of node in tree (depth {:?} current_search_path {:?}).
            Raw children {:?}. Messages added {:?}", depth, current_search_path, raw_children_dbg_info, links_added);
    }

    latest_seen_child_path = current_search_path;
    current_search_path = latest_seen_child_path.parent().unwrap();
    depth += 1;
  }
  /// Done
  Ok(res)
}


///
fn append_target_links_recursive(
  mut children: Vec<(i32, Link)>,
  target_links: &mut Vec<Link>,
  target_count: usize,
  depth: u8,
  link_type: ScopedLinkType,
  link_tag: Option<LinkTag>,
) -> ExternResult<()> {
  /// It's important to sort by component time value instead of timestamp,
  /// since in the proptest, fake messages are inserted with chosen time-path,
  /// but the timestamp is not fake and still represents the system time.
  children.sort_unstable_by_key(|(time_value, _)| cmp::Reverse(*time_value));

  /// Traverse tree
  for (_, child_link) in children {
    if depth == 0 {
      /// Grab all children at the hour level
      let mut links = get_links(
        child_link.target,
        LinkTypeFilter::single_type(link_type.zome_index, link_type.zome_type),
        link_tag.clone(),
      )?;
      target_links.append(&mut links);
    } else {
      /// Grab children and go deeper
      let grandchildren = get_links(
        child_link.target,
        LinkTypeFilter::single_type(link_type.zome_index, link_type.zome_type),
        None,
      )?;
      let grandchildren_pairs = grandchildren
        .into_iter()
        .filter_map(|l| get_component_from_link_tag(&l).ok().map(|c| (c, l))) // filter out non-path links
        .map(|(c, l)| Ok((convert_component_to_i32(&c)?, l)))
        .collect::<Result<Vec<_>, WasmError>>()?;
      /// Go deeper
      append_target_links_recursive(grandchildren_pairs, target_links, target_count, depth - 1, link_type, link_tag.clone())?;
    }
    if target_links.len() >= target_count {
      break;
    }
  }
  /// Done
  Ok(())
}

