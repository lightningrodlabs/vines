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
  let pp_str = hash2anchor(input.pp_ah.clone());

  let start = input.start_time.unwrap_or(Timestamp::HOLOCHAIN_EPOCH); // FIXME use dna_info.origin_time
  debug!("get_latest_beads() pp_str = {} | start = {}", pp_str, start);

  let root_tp = Path::from(pp_str).typed(ThreadsLinkType::ThreadTimePath)?;
  let response = get_latest_time_indexed_links(root_tp, SearchInterval::with_beginning_at(start), input.target_count, None)?;
  debug!("get_latest_beads() links.len = {}", response.1.len());

  let res: Vec<BeadLink> = response.1.into_iter()
                                   .map(|(bucket_time, link)| {
                   BeadLink {
                     bucket_time,
                     bead_ah: ActionHash::from(link.target),
                     bead_type: tag2str(&link.tag).unwrap(),
                   }
                 })
                                   .collect();
  debug!("get_latest_beads() res.len = {}", res.len());

  /// Done
  Ok((response.0, res))
}
