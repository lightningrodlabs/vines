use hdk::{
  prelude::*,
};
use threads_integrity::*;
use crate::beads::BeadLink;
use crate::path_explorer::*;
use crate::time_indexing::time_index::get_latest_time_indexed_links;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLatestBeadsInput {
  pp_ah: ActionHash,
  start_time: Option<Timestamp>,
  target_count: usize,
}


///
#[hdk_extern]
pub fn get_latest_beads(input: GetLatestBeadsInput) -> ExternResult<Vec<BeadLink>> {
  let pp_str = hash2anchor(input.pp_ah.clone());

  let start = input.start_time.unwrap_or(Timestamp::HOLOCHAIN_EPOCH); // FIXME use dna_info.origin_time
  debug!("get_latest_beads() pp_str = {} | start = {}", pp_str, start);

  let root_tp = Path::from(pp_str).typed(ThreadsLinkType::BeadTimePath)?;
  let links = get_latest_time_indexed_links(root_tp, start, sys_time()?, input.target_count, None)?;
  debug!("get_latest_beads() links.len = {}", links.len());

  let res: Vec<BeadLink> = links.into_iter()
                 .map(|link| {
                   BeadLink {
                     bead_ah: ActionHash::from(link.target),
                     bead_type: tag2str(&link.tag).unwrap(),
                   }
                 })
                 .collect();
  debug!("get_latest_beads() res.len = {}", res.len());

  /// Done
  Ok(res)
}
