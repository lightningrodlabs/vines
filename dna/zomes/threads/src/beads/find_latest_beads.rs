use hdk::{
  prelude::*,
};
use threads_integrity::*;
use crate::beads::{BeadLink};
use zome_utils::*;
use time_indexing::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
//#[serde(rename_all = "camelCase")]
pub struct GetLatestBeadsInput {
  pp_ah: ActionHash,
  begin_time: Option<Timestamp>,
  end_time: Option<Timestamp>,
  target_limit: Option<usize>,
}


///
#[hdk_extern]
pub fn find_latest_beads(input: GetLatestBeadsInput) -> ExternResult<(SweepInterval, Vec<BeadLink>)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Convert arguments
  let origin_time = dna_info()?.modifiers.origin_time;
  let pp_comp = hash2comp(input.pp_ah.clone());
  let begin = input.begin_time.unwrap_or(origin_time);
  let end = input.end_time.unwrap_or(sys_time().unwrap());
  let limit = input.target_limit.unwrap_or(usize::MAX);
  debug!("start = {} | target_count = {}",begin, limit);
  let search_interval = SweepInterval::new(begin, end)?;
  debug!("search_interval = {}", search_interval.print_as_anchors());
  let root_tp = Path::from(vec![pp_comp]).typed(ThreadsLinkType::ThreadTimePath)?;
  /// Query DHT
  let response = get_latest_time_indexed_links(root_tp, search_interval, limit, None, ThreadsLinkType::TimeItem)?;
  debug!("links.len = {}", response.1.len());
  /// Convert links to BeadLinks
  let bls: Vec<BeadLink> = response.1
    .into_iter()
    .map(|(_index_time, link)| {
      let bt: TimedItemTag = SerializedBytes::from(UnsafeBytes::from(link.tag.0)).try_into().unwrap();
      BeadLink {
        //index_time,
        creation_time: bt.ts_us,
        //creation_time: link.timestamp,
        bead_ah: ActionHash::try_from(link.target).unwrap(),
        bead_type: bt.item_type,
        author: link.author,
      }
    })
    .collect();
  debug!("bls.len = {}", bls.len());
  /// Done
  Ok((response.0, bls))
}
