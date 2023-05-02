use hdk::{
  prelude::*,
};
use std::cmp;
use crate::path_explorer::*;
use crate::time_indexing::*;
use crate::time_indexing::timepath_utils::*;


/// Reverse-walk the time-index tree from `search_interval.end` to `begin` until `target_count` links are found.
pub fn get_latest_time_indexed_links(
  root_tp: TypedPath,
  search_interval: SearchInterval,
  target_count: usize,
  link_tag: Option<LinkTag>,
) -> ExternResult<(SearchInterval, Vec<(Timestamp, Link)>)> {
  /// TODO: let origin_time = dna_info()?.origin_time
  /// check begin_us > origin_time

  let rounded_interval = search_interval.into_hour_buckets();

  let _begin_tp = get_time_path(root_tp.clone(), rounded_interval.begin.clone())?;
  debug!(" search_interval: {}", search_interval);
  debug!("rounded_interval: {}", rounded_interval);


  let mut res = Vec::new();

  /// Grab links from latest time-index hour
  let latest_hour_tp = get_time_path(root_tp.clone(), rounded_interval.get_end_bucket_start_time())?;
  debug!("latest_hour_path: {}", timepath2str(&latest_hour_tp));
  if latest_hour_tp.exists()? {
    let latest_hour_us = convert_timepath_to_timestamp(latest_hour_tp.path.clone())?;
    let last_hour_links = get_links(
      latest_hour_tp.path_entry_hash()?,
      LinkTypeFilter::single_dep(root_tp.link_type.zome_index),
      //LinkTypeFilter::single_type(root_tp.link_type.zome_index, root_tp.link_type.zome_type),
      //ThreadsLinkType::Protocols.try_into_filter()?,
      link_tag.clone(),
    )?;
    debug!("latest_hour_path found {}", last_hour_links.len());
    let mut last_hour_pairs = last_hour_links.into_iter()
      .map(|link| (latest_hour_us.clone(), link))
      .collect();
    res.append(&mut last_hour_pairs);
  }


  /// Setup search loop. Start search at parent node of end time.
  let mut oldest_searched_tp = latest_hour_tp;
  let mut current_search_tp = oldest_searched_tp.parent().unwrap();
  let mut depth = 0;

  /// Traverse tree until target count is reached or root node is reached.
  while res.len() < target_count && current_search_tp.as_ref().len() >= root_tp.as_ref().len() {
    debug!("*** searching: {} | found: {}", path2anchor(&current_search_tp.path).unwrap(), res.len());
    if current_search_tp.exists()? {
      let oldest_searched_leaf_value = get_timepath_leaf_value(&oldest_searched_tp).unwrap();

      let latest_searched_time_us = convert_timepath_to_timestamp(oldest_searched_tp.path.clone()).unwrap();
      debug!("*** searching:   - latest_searched_time: {}", latest_searched_time_us);
      let current_search_time_us = convert_timepath_to_timestamp(current_search_tp.path.clone())
        .unwrap_or(rounded_interval.begin); // If at root component, search years starting from begin_time
      debug!("*** searching:   - current_search_time: {}", current_search_time_us);

      if current_search_time_us < rounded_interval.begin {
        debug!("WENT PAST BEGINNING");
        break;
      }

      let children = tp_children(&current_search_tp)?;

      /// DEBUG INFO
      let raw_children_dbg_info = children
        .iter()
        .map(|l| format!("{{ tag: {} timestamp: {:?} }}, ", compTag2str(&l.tag).unwrap_or("<failed>".to_string()), l.timestamp))
        .collect::<String>();

      /// Keep children older than latest time value
      let mut older_children_pairs: Vec<(Path, i32, Link)> = children
        .into_iter()
        .filter_map(|l| get_component_from_link_tag(&l).ok().map(|c| (c, l))) // filter out non-path links
        .map(|(c, l)| Ok((current_search_tp.path.clone(), convert_component_to_i32(&c)?, l)))
        .collect::<Result<Vec<_>, WasmError>>()?;

      /// Remove "newer" children
      older_children_pairs.retain(|(_path, comp_value, _)| *comp_value < oldest_searched_leaf_value);

      /// Remove children older than start_time
      // FIXME
      // older_children_pairs.retain(|(time_value, _)| *time_value < latest_searched_leaf_value);

      let link_count_before_dbg_info = res.len();

      append_target_links_recursive(older_children_pairs, &mut res, target_count, depth, root_tp.link_type, link_tag.clone())?;

      /// Debug info
      let links_added = res.get(link_count_before_dbg_info..).unwrap_or(&[]);
      debug!("Finished including all descendants of node in tree (depth {} current_search_time {}).
            Raw children {}. Links added {}", depth, current_search_time_us, raw_children_dbg_info, links_added.len());
    }

    // "Move up" tree
    oldest_searched_tp = current_search_tp.clone();
    if let Some(csp) = oldest_searched_tp.parent() {
      current_search_tp = csp
    } else {
      debug!("NO PARENT");
      break;
    };
    depth += 1;
  }
  /// Done
  let oldest_searched_bucket_time = convert_timepath_to_timestamp(current_search_tp.path).unwrap_or(rounded_interval.begin);
  let searched_interval = SearchInterval::new(oldest_searched_bucket_time, rounded_interval.end).unwrap();
  Ok((searched_interval, res))
}


///
fn append_target_links_recursive(
  mut children: Vec<(Path, i32, Link)>,
  target_links: &mut Vec<(Timestamp, Link)>,
  target_count: usize,
  depth: u8,
  link_type: ScopedLinkType,
  link_tag: Option<LinkTag>,
) -> ExternResult<()> {
  /// It's important to sort by component time value instead of timestamp,
  /// since in the proptest, fake messages are inserted with chosen time-path,
  /// but the timestamp is not fake and still represents the system time.
  children.sort_unstable_by_key(|(_path, time_component_value, _)| cmp::Reverse(*time_component_value));

  /// Traverse tree
  for (parent_path, _, child_link) in children {
    if depth == 0 {
      /// Grab all children at the hour level
      let links = get_links(
        child_link.target,
        LinkTypeFilter::single_type(link_type.zome_index, link_type.zome_type),
        link_tag.clone(),
      )?;
      /// Form leaf path
      let mut pairs = links
        .into_iter()
        .map(|l| {
          let c = get_component_from_link_tag(&l).unwrap();
          //let val = convert_component_to_i32(&c)?;
          let mut  leaf_path = parent_path.clone();
          leaf_path.append_component(c);
          let ts = convert_timepath_to_timestamp(leaf_path)?;
          Ok((ts, l))
        }) // filter out non-path links
        .collect::<Result<Vec<_>, WasmError>>()?;
      ///
      target_links.append(&mut pairs);
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
        .map(|(c, l)| {
          let mut  leaf_path = parent_path.clone();
          leaf_path.append_component(c.clone());
          Ok((leaf_path, convert_component_to_i32(&c)?, l))
        })
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

