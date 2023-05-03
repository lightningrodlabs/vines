use hdk::prelude::*;
use crate::path_explorer::ItemLink;

pub mod get_latest_time_indexed_links;
pub mod get_latest_items;
pub mod get_all_items;
mod search_interval;
mod timepath_utils;
mod index_item;
mod timed_item_tag;

pub use search_interval::*;
pub use timepath_utils::*;
pub use index_item::*;
pub use timed_item_tag::*;


//--------------------------------------------------------------------------------------------------

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
  pub searched_interval: SearchInterval, // From begin bucket start time to end bucket finish time.
  pub found_items: Vec<(Timestamp, ItemLink)>, // Bucket start time
}


impl SearchResponse {
  pub fn new(searched_interval: SearchInterval, found_items: Vec<(Timestamp, ItemLink)>) -> Self {
    Self { searched_interval, found_items }
  }
}
