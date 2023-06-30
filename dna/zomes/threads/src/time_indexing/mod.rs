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

//--------------------------------------------------------------------------------------------------
// User README
// ## time-indexing Zome
// Enables to index any AnyLinkableHash in a Link tree structure called a time-index.
// An indexed AnyLinkableHash is called a TimedItem, or simply 'item' in  this context.
// A time-index starts with a user defined anchor (called the 'root anchor'), and has a granularity of an hour.
// This means a user can define multiple time-indexes to store items separately.
//
// To index an item the user has to call the function:
// `index_item(
//   root_tp: TypedPath,
//   item_hash: AnyLinkableHash,
//   item_type: &str,
//   time_link_type: ScopedLinkType,
//   index_time_us: Timestamp,
//   tag_data: &[u8])`
//
// The user has to provide its own LinkType for the root anchor of the time-index.
// The user has to define and provide a LinkType specifically for TimedItems when using this library, otherwise time-indexing would have to be a Zome instead of a simple crate.
// The user has to provide the type of the item being indexed, so other agents can know what kind of item is behind the hash.
// The user can also provide its own tag data for its own use.
//
// Once items are stored, the user can query a time-index by providing a SweepInterval, the time-interval
// for which a recursive search (`get_links()`) will be done on the time-index tree.
//
// The default SweepInterval is `dna_info().origin_time` to `sys_time()` (FIXME: HOLOCHAIN_EPOCH is used for now instead as origin_time is not available).
//
// Technically, the user has to call the function:
// ```
// get_latest_time_indexed_links(
//   root_tp: TypedPath,
//   sweep_interval: SweepInterval,
//   target_count: usize,
//   link_tag: Option<LinkTag>,
// )
// ```
//
// It will reverse-walk the time-index tree from `sweep_interval.end` to `begin` until `target_count` items are found.
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
