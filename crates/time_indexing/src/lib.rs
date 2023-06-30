#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

use hdk::prelude::*;
use path_utils::ItemLink;

mod get_latest_time_indexed_links;
mod sweep_interval;
mod timepath_utils;
mod index_item;
mod timed_item_tag;

pub use get_latest_time_indexed_links::*;
pub use sweep_interval::*;
pub use timepath_utils::*;
pub use index_item::*;
pub use timed_item_tag::*;


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
