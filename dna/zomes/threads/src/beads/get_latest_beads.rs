use hdk::{
  prelude::*,
};
use threads_integrity::*;
use crate::beads::BeadLink;
use crate::path_explorer::*;
use crate::time_indexing::get_latest_time_indexed_links::get_latest_time_indexed_links;
use crate::time_indexing::SearchInterval;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLatestBeadsInput {
  pp_ah: ActionHash,
  start_time: Option<Timestamp>,
  target_count: usize,
}


///
#[hdk_extern]
pub fn get_latest_beads(input: GetLatestBeadsInput) -> ExternResult<(SearchInterval, Vec<BeadLink>)> {
  /// Convert arguments
  let pp_str = hash2anchor(input.pp_ah.clone());
  let start = input.start_time.unwrap_or(Timestamp::HOLOCHAIN_EPOCH); // FIXME use dna_info.origin_time
  debug!("pp_str = {} | start = {} | target_count = {}", pp_str, start, input.target_count);
  let search_interval = SearchInterval::with_beginning_at(start);
  debug!("search_interval = {}", search_interval);
  let root_tp = Path::from(pp_str).typed(ThreadsLinkType::ThreadTimePath)?;
  /// Query DHT
  let response = get_latest_time_indexed_links(root_tp, search_interval, input.target_count, None)?;
  debug!("links.len = {}", response.1.len());
  /// Convert links to BeadLinks
  let bls: Vec<BeadLink> = response.1
    .into_iter()
    .map(|(bucket_time, link)| {
      BeadLink {
        bucket_time,
        bead_ah: ActionHash::from(link.target),
        bead_type: tag2str(&link.tag).unwrap(),
      }
    })
    .collect();
  debug!("bls.len = {}", bls.len());
  /// Done
  Ok((response.0, bls))
}
