use hdk::prelude::*;
use path_utils::ItemLink;

pub mod get_latest_time_indexed_links;
mod sweep_interval;
mod timepath_utils;
mod index_item;
mod timed_item_tag;

pub use sweep_interval::*;
pub use timepath_utils::*;
pub use index_item::*;
pub use timed_item_tag::*;


//
//--------------------------------------------------------------------------------------------------
// Developer README
//
// "Probing" is the act of calling holochain's `get_links()`.
// "Sweeping" is the act of probing a part of a time-index tree, in order to return all stored items in that part.
//--------------------------------------------------------------------------------------------------


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SweepResponse {
  pub sweeped_interval: SweepInterval, // From begin-bucket start time to end-bucket finish time.
  pub found_items: Vec<(Timestamp, ItemLink)>, // Bucket start time
}


impl SweepResponse {
  pub fn new(sweeped_interval: SweepInterval, found_items: Vec<(Timestamp, ItemLink)>) -> Self {
    Self { sweeped_interval, found_items }
  }
}
