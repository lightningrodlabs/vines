use hdk::{
  prelude::*,
};
use std::cmp;
use zome_utils::zome_error;
use crate::path_explorer::*;
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

  let start_tp = get_time_path(root_tp.clone(), start_ts)?;
  debug!("get_latest_time_indexed_links() start: {} | diff = {}", timepath2str(&start_tp), time_diff);


  /// end_time must be longer than 1 hour, otherwise return empty list?
  if time_diff < chrono::Duration::hours(1) {
    //let _leaf_links = get_any_itemlinks_from_path(start_tp.path, link_tag)?;
    //return Ok(leaf_links);
    return Ok(Vec::new());
  }


  /// Floor to the hour
  let end_time = Timestamp::from_micros((end_ts.as_seconds_and_nanos().0 / 3600) * 3600 * 1000 * 1000);
  let start_time = Timestamp::from_micros((start_ts.as_seconds_and_nanos().0 / 3600) * 3600 * 1000 * 1000);
  debug!("get_latest_time_indexed_links() start: {} -> {}",
    start_ts.as_seconds_and_nanos().0, start_time.as_seconds_and_nanos().0);
  debug!("get_latest_time_indexed_links()   end: {} -> {}",
    end_ts.as_seconds_and_nanos().0, end_time.as_seconds_and_nanos().0);


  let mut res = Vec::new();

  /// Grab links from latest time-index hour
  let latest_hour_path = get_time_path(root_tp.clone(), end_time)?;
  debug!("get_latest_time_indexed_links() latest_hour_path: {}", timepath2str(&latest_hour_path));
  if latest_hour_path.exists()? {
    let mut last_hour_links = get_links(
      latest_hour_path.path_entry_hash()?,
      LinkTypeFilter::single_dep(root_tp.link_type.zome_index),
      //LinkTypeFilter::single_type(root_tp.link_type.zome_index, root_tp.link_type.zome_type),
      //ThreadsLinkType::Protocols.try_into_filter()?,
      link_tag.clone(),
    )?;
    debug!("get_latest_time_indexed_links() latest_hour_path found {}", last_hour_links.len());
    res.append(&mut last_hour_links);
  }


  /// Setup search loop. Grab parent
  let mut latest_seached_path = latest_hour_path;
  let mut current_search_path = latest_seached_path.parent().unwrap();
  let mut depth = 0;

  /// Traverse tree until target count is reached or root_path is reached
  while res.len() < target_count && current_search_path.as_ref().len() >= root_tp.as_ref().len() {
    debug!("*** searching: {} | found: {}", path2anchor(&current_search_path.path).unwrap(), res.len());
    if current_search_path.exists()? {
      let latest_searched_leaf_value = get_timepath_leaf_value(&latest_seached_path).unwrap();

      let latest_searched_time = convert_timepath_to_timestamp(latest_seached_path.path.clone()).unwrap();
      debug!("*** searching:   - latest_searched_time: {}", latest_searched_time);
      let current_search_time = convert_timepath_to_timestamp(current_search_path.path.clone())
        .unwrap_or(start_time); // If at root component, search years starting from start_time
      debug!("*** searching:   - current_search_time: {}", current_search_time);

      if current_search_time < start_time {
        debug!("WENT PAST START_TIME");
        break;
      }

      let children = tp_children(&current_search_path)?;

      let raw_children_dbg_info = children
        .iter()
        .map(|l| format!("{{ tag: {} timestamp: {:?} }}, ", compTag2str(&l.tag).unwrap_or("<failed>".to_string()), l.timestamp))
        .collect::<String>();

      /// Keep children older than latest time value
      let mut older_children_pairs = children
        .into_iter()
        .filter_map(|l| get_component_from_link_tag(&l).ok().map(|c| (c, l))) // filter out non-path links
        .map(|(c, l)| Ok((convert_component_to_i32(&c)?, l)))
        .collect::<Result<Vec<_>, WasmError>>()?;

      /// Remove "newer" children
      older_children_pairs.retain(|(time_value, _)| *time_value < latest_searched_leaf_value);

      /// Remove children older than start_time
      // FIXME
      // older_children_pairs.retain(|(time_value, _)| *time_value < latest_searched_leaf_value);

      let link_count_before_dbg_info = res.len();

      append_target_links_recursive(older_children_pairs, &mut res, target_count, depth, root_tp.link_type, link_tag.clone())?;

      /// Debug info
      let links_added = res.get(link_count_before_dbg_info..).unwrap_or(&[]);
      debug!("get_latest_time_indexed_links() Finished including all descendants of node in tree (depth {} current_search_time {}).
            Raw children {}. Links added {}", depth, current_search_time, raw_children_dbg_info, links_added.len());
    }

    latest_seached_path = current_search_path;
    if let Some(csp) = latest_seached_path.parent() {
      current_search_path = csp
    } else {
      debug!("NO PARENT");
      break;
    };
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

