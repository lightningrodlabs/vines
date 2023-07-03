use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use time_indexing::*;


/// Get the latest 20 items from the global time-index
#[hdk_extern]
pub fn get_latest_items(_ : ()) -> ExternResult<SweepResponse> {
  let root_tp = Path::from(GLOBAL_TIME_INDEX).typed(ThreadsLinkType::GlobalTimePath)?;
  let search_res = get_latest_time_indexed_links(root_tp, SweepInterval::now(), 20, None, ThreadsLinkType::TimeItem)?;
  debug!("links.len = {}\n\n", search_res.1.len());
  let item_links = search_res.1.into_iter()
                             .map(|(ts, link)| (ts, ItemLink::from(link)))
                             .collect();
  Ok(SweepResponse::new(search_res.0, item_links))
}
