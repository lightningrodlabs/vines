use hdk::prelude::*;
use threads_integrity::*;
use crate::path_explorer::*;
use crate::time_indexing::get_latest_time_indexed_links::get_latest_time_indexed_links;


///
#[hdk_extern]
pub fn get_latest_items(_ : ()) -> ExternResult<Vec<ItemLink>> {
  let root_tp = Path::from(GLOBAL_TIME_INDEX).typed(ThreadsLinkType::GlobalTimePath)?;
  let links = get_latest_time_indexed_links(root_tp, Timestamp::HOLOCHAIN_EPOCH, sys_time()?, 20, None)?;
  debug!("get_latest_entries() links.len = {}\n\n", links.len());
  let res = links.into_iter()
                 .map(|link| ItemLink::from(link))
                 .collect();
  Ok(res)
}
