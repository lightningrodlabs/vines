mod text_bead;
mod find_latest_beads;
mod find_beads;
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
use crate::*;
//use threads_integrity::*;

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
pub fn fetch_typed_bead<T: TryFrom<Entry>>(bead_ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, T)> {
  debug!("fetch_typed_bead() {}", bead_ah);
  /// Get typed
  let Some(record) = get(bead_ah.clone(), GetOptions::network())? else {
    return error("fetch_typed_bead(): Entry not found");
  };
  let Ok(typed) = get_typed_from_record::<T>(record.clone()) else {
    return error("fetch_typed_bead(): Entry not of requested type");
  };
  let mut res = (record.action().timestamp(), record.action().author().to_owned(), typed);
  /// Get Original author
  let maybe = get_original_author(bead_ah)?;
  if let Some(pair) = maybe {
    debug!("fetch_typed_bead() original author found: {}", pair.1);
    res.0 = pair.0;
    res.1 = pair.1;
  }
  //debug!("fetch_typed_bead() original author not found");
  /// Emit signal
  emit_entry_signal_record(record, false)?;
  ///
  Ok(res)
}
