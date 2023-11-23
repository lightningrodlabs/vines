
mod text_message;
mod get_latest_beads;
mod get_all_beads;
mod index_bead;
mod mentions;
mod entry_bead;

pub use index_bead::*;
pub use text_message::*;

//--------------------------------------------------------------------------------------------------

use hdk::prelude::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeadLink {
  //pub index_time: Timestamp, // index_time can be determined by rounding creation_time
  pub creation_time: Timestamp,
  pub bead_ah: ActionHash,
  pub bead_type: String,
}
