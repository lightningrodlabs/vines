mod text_bead;
mod get_latest_beads;
mod get_all_beads;
mod index_bead;
mod entry_bead;
mod any_bead;
mod emoji_reaction;

pub use index_bead::*;
pub use text_bead::*;

//--------------------------------------------------------------------------------------------------

use hdk::prelude::*;
use zome_utils::*;
use authorship_zapi::get_original_author;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeadLink {
  //pub index_time: Timestamp, // index_time can be determined by rounding creation_time
  pub creation_time: Timestamp,
  pub bead_ah: ActionHash,
  pub bead_type: String,
  pub author: AgentPubKey,
}


///
pub fn get_typed_bead<T: TryFrom<Entry>>(bead_ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, T)> {
  debug!("get_typed_bead() {}", bead_ah);
  /// Get typed
  let Some(record) = get(bead_ah.clone(), GetOptions::network())? else {
    return error("get_typed_bead(): Entry not found");
  };
  let Ok(typed) = get_typed_from_record::<T>(record.clone()) else {
    return error("get_typed_bead(): Entry not of requested type");
  };
  /// Get Original author
  let maybe = get_original_author(bead_ah)?;
  if let Some(pair) = maybe {
    debug!("get_typed_bead() original author found: {}", pair.1);
    return Ok((pair.0, pair.1, typed))
  }
  debug!("get_typed_bead() original author not found");
  ///
  Ok((record.action().timestamp(), record.action().author().to_owned(), typed))
}
