use hdk::{
  prelude::*,
};
use std::cmp;
use hdk::hash_path::path::Component;
use path_utils::*;

use crate::*;
use crate::timepath_utils::*;


/// Reverse-walk the time-index tree from `sweep_interval.end` to `begin` until `items_limit` items are found.
pub fn get_latest_time_indexed_links(
  root_anchor_tp: TypedPath,
  sweep_interval: SweepInterval,
  items_limit: usize,
  link_tag: Option<LinkTag>,
  time_link_type: impl LinkTypeFilterExt + Copy,
) -> ExternResult<(SweepInterval, Vec<(Timestamp, Link)>)> {
  /// TODO: let origin_time = dna_info()?.origin_time

  if items_limit == 0 {
    return Err(wasm_error!(WasmErrorInner::Guest("Invalid input for get_latest_time_indexed_links(): 'items_limit' cannot be '0'".to_string())));
  }

  debug!("get_latest_time_indexed_links() START");
  debug!("        link_tag: {:?}", link_tag);

  /// Determine latest hour and the previous
  let mut rounded_sweep_interval = sweep_interval.into_hour_buckets();
  let latest_hour_us = rounded_sweep_interval.get_end_bucket_start_time();
  let latest_hour_tp = get_time_path(root_anchor_tp.clone(), latest_hour_us)?;
  let prev_hour_us = Timestamp::from_micros(latest_hour_us.0 - 3600 * 1000 * 1000);
  let prev_hour_tp = get_time_path(root_anchor_tp.clone(), prev_hour_us)?;
  //let _begin_tp = get_time_path(root_tp.clone(), rounded_sweep_interval.begin.clone())?;
  debug!("  sweep_interval: {}", sweep_interval.print_as_anchors());
  debug!("rounded_interval: {}", rounded_sweep_interval.print_as_anchors());
  debug!("  latest_hour_tp: {}", timepath2anchor(&latest_hour_tp));
  debug!("    prev_hour_tp: {}", timepath2anchor(&prev_hour_tp));

  let mut total_items = Vec::new();
  let mut has_probed_prev = false;

  /// Grab links from latest time-index hour
  if latest_hour_tp.exists()? {
    let latest_hour_us = convert_timepath_to_timestamp(latest_hour_tp.path.clone())?;
    let last_hour_links = get_links(
      latest_hour_tp.path_entry_hash()?,
      LinkTypeFilter::single_dep(root_anchor_tp.link_type.zome_index),
      //LinkTypeFilter::single_type(root_tp.link_type.zome_index, root_tp.link_type.zome_type),
      //ThreadsLinkType::Protocols.try_into_filter()?,
      link_tag.clone(),
    )?;
    debug!("latest_hour_tp items: {}", last_hour_links.len());
    let mut last_hour_pairs = last_hour_links.into_iter()
      .map(|link| (latest_hour_us.clone(), link))
      .collect();
    total_items.append(&mut last_hour_pairs);

    /// Probe previous hour if limit already reached, since we don't know if this bucket was already probed
    /// in order to not get stuck in the same bucket forever
    if total_items.len() >= items_limit {
      has_probed_prev = true;
      if prev_hour_tp.exists()? {
        let prev_hour_links = get_links(
          prev_hour_tp.path_entry_hash()?,
          LinkTypeFilter::single_dep(root_anchor_tp.link_type.zome_index),
          link_tag.clone(),
        )?;
        debug!("prev_hour_tp items: {}", prev_hour_links.len());
        let mut prev_hour_pairs = prev_hour_links.into_iter()
                                                 .map(|link| (prev_hour_us.clone(), link))
                                                 .collect();
        total_items.append(&mut prev_hour_pairs);
      }
    }
  }


  /// Setup sweep loop. Start sweeping at parent node of end time.
  let mut oldest_probed_tp = if has_probed_prev { prev_hour_tp } else { latest_hour_tp };
  let mut current_sweep_tp = oldest_probed_tp.parent().unwrap();
  let mut depth = 0;

  /// Traverse tree until target count is reached or root node is reached.
  while total_items.len() < items_limit && current_sweep_tp.as_ref().len() >= root_anchor_tp.as_ref().len() {
    debug!("*** Sweeping: {} | total: {}", timepath2anchor(&current_sweep_tp), total_items.len());
    if current_sweep_tp.exists()? {
      let oldest_probed_leaf_i32 = get_timepath_leaf_value(&oldest_probed_tp).unwrap();

      let latest_probed_time_us = convert_timepath_to_timestamp(oldest_probed_tp.path.clone()).unwrap();
      debug!("*** Sweeping: latest_probed_time: {}", latest_probed_time_us);
      let current_search_time_us = convert_timepath_to_timestamp(current_sweep_tp.path.clone())
        .unwrap_or(rounded_sweep_interval.begin); // If at root component, search years starting from begin_time
      debug!("*** Sweeping:  current_search_time: {}", current_search_time_us);

      if current_search_time_us < rounded_sweep_interval.begin {
        debug!("WENT PAST BEGINNING");
        break;
      }

      let children = tp_children(&current_sweep_tp)?;

      /// DEBUG INFO
      let raw_children_dbg_info = children
        .iter()
        .map(|l| format!("{{ tag: \"{}\" timestamp: {:?} }}, ", compTag2str(&l.tag).unwrap_or("<failed>".to_string()), l.timestamp))
        .collect::<String>();

      /// Remove children later than latest time value
      let mut older_children_pairs: Vec<(TypedPath, i32, Link)> = children
        .into_iter()
        .filter_map(|l| get_component_from_link_tag(&l).ok().map(|c| (c, l))) // filter out non-path links
        .map(|(c, l)| {
          let tuple = (current_sweep_tp.clone(), convert_component_to_i32(&c)?, l);
          Ok(tuple)
        })
        .collect::<Result<Vec<_>, WasmError>>()?;

      /// Remove children older than oldest
      older_children_pairs.retain(|(_path, compi32, _)| *compi32 < oldest_probed_leaf_i32);

      /// Remove children older than sweepInterval.begin
      // FIXME
      // older_children_pairs.retain(|(time_value, _)| *time_value < oldest_probed_leaf_i32);

      /// Sweep in descendants if any
      if !older_children_pairs.is_empty() {
        let link_count_before_dbg_info = total_items.len();
        debug!("*** Starting recursive sweep of the {} descendants of {} (depth {})", older_children_pairs.len(), timepath2anchor(&current_sweep_tp), depth);
        sweep_and_append(
          older_children_pairs,
          &mut total_items,
          items_limit,
          depth,
          root_anchor_tp.link_type,
          link_tag.clone(),
          time_link_type,
        )?;
        /// Debug info
        let links_added = total_items.get(link_count_before_dbg_info..).unwrap_or(&[]);
        debug!("Descendants of {} (depth {}). Leafs added {}"
        , timepath2anchor(&current_sweep_tp), depth, /*raw_children_dbg_info,*/ links_added.len());
      }
    }

    // /* Exit if limit reached */
    // if (total_item_links.len() >= target_count) {
    //   debug!("target_count REACHED");
    //   break;
    // }

    /* "Move up" tree */
    oldest_probed_tp = current_sweep_tp.clone();
    if let Some(csp) = oldest_probed_tp.parent() {
      current_sweep_tp = csp
    } else {
      debug!("NO PARENT, e.g. ROOT REACHED");
      break;
    };
    depth += 1;
  }

  /// Determine sweeped interval
  debug!("current_sweep_tp = {} | total = {}", timepath2anchor(&current_sweep_tp), total_items.len());
  let oldest_probed_bucket_time =
    if total_items.len() >= items_limit {
      if has_probed_prev {
        prev_hour_us
      } else {
        total_items.last().unwrap().0
      }
  } else {
    convert_timepath_to_timestamp(current_sweep_tp.path)
      .unwrap_or(rounded_sweep_interval.begin)
  };



  debug!("END. sweeped_interval = [{}, {}]", ts2anchor(oldest_probed_bucket_time), ts2anchor(rounded_sweep_interval.end));
  let sweeped_interval = SweepInterval::new(oldest_probed_bucket_time, rounded_sweep_interval.end).unwrap();
  /// Done
  Ok((sweeped_interval, total_items))
}


///
fn sweep_and_append(
  mut children: Vec<(TypedPath, i32, Link)>,
  target_links: &mut Vec<(Timestamp, Link)>,
  target_count: usize,
  depth: u8,
  link_type: ScopedLinkType,
  link_tag: Option<LinkTag>,
  time_link_type: impl LinkTypeFilterExt + Copy,
) -> ExternResult<()> {
  /// It's important to sort by component time value instead of timestamp,
  /// since in the proptest, fake messages are inserted with chosen time-path,
  /// but the timestamp is not fake and still represents the system time.
  children.sort_unstable_by_key(|(_path, time_component_value, _)| cmp::Reverse(*time_component_value));

  //let mut last_probed_anchor =

  /// Traverse tree
  for (parent_tp, compi32, child_link) in children {
    if depth == 0 {
      /// Grab all children items at the hour level
      let links = get_links(
        child_link.target.clone(),
        time_link_type.try_into_filter()?,
        link_tag.clone(),
      )?;
      //debug!(" - get_links() of parent {}.{} : {} found", timepath2anchor(&parent_tp), compi32, links.len()/*, child_link.target*/);
      /// Form leaf path
      let mut leaf_tp = parent_tp.clone();
      let comp = Component::from(format!("{}", compi32));
      leaf_tp.path.append_component(comp);
      let ts = convert_timepath_to_timestamp(leaf_tp.path)?;
      let mut pairs = links
        .into_iter()
        .map(|l| (ts, l))
        .collect();
      target_links.append(&mut pairs);
    } else {
      /// Grab children and go deeper
      let grandchildren = get_links(
        child_link.target,
        LinkTypeFilter::single_type(link_type.zome_index, link_type.zome_type),
        None,
      )?;
      //debug!(" - get_links(grandchildren) of parent {}.{} : {} found", timepath2anchor(&parent_tp), compi32, grandchildren.len());

      let grandchildren_pairs = grandchildren
        .into_iter()
        .filter_map(|l| get_component_from_link_tag(&l).ok().map(|c| (c, l))) // filter out non-path links
        .map(|(c, l)| {
          let mut leaft_tp = parent_tp.clone();
          let comp = Component::from(format!("{}", compi32));
          leaft_tp.path.append_component(comp.clone());
          let tuple = (leaft_tp, convert_component_to_i32(&c)? /* compi32*/, l);
          Ok(tuple)
        })
        .collect::<Result<Vec<_>, WasmError>>()?;
      /// Go deeper
      sweep_and_append(grandchildren_pairs, target_links, target_count, depth - 1, link_type, link_tag.clone(), time_link_type)?;
    }
    if target_links.len() >= target_count {
      break;
    }
  }
  /// Done
  Ok(())
}

