
mod text_message;
mod get_latest_beads;
mod get_all_beads;
mod index_bead;

pub use index_bead::*;
pub use text_message::*;

//--------------------------------------------------------------------------------------------------

use hdk::prelude::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeadLink {
  pub index_time: Timestamp,
  pub creation_time: Timestamp,
  pub bead_ah: ActionHash,
  pub bead_type: String,
}
