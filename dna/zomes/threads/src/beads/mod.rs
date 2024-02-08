
mod text_bead;
mod get_latest_beads;
mod get_all_beads;
mod index_bead;
mod mentions;
mod entry_bead;
mod any_bead;
mod emoji_reaction;

pub use index_bead::*;
pub use text_bead::*;

//--------------------------------------------------------------------------------------------------

use hdk::prelude::*;
use zome_utils::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeadLink {
  //pub index_time: Timestamp, // index_time can be determined by rounding creation_time
  pub creation_time: Timestamp,
  pub bead_ah: ActionHash,
  pub bead_type: String,
}


///
pub fn get_typed_bead<T: TryFrom<Entry>>(bead_ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, T)> {
  //let fn_start = sys_time()?;
  let res = match get(bead_ah.clone(), GetOptions::content())? {
    Some(record) => {
      let action = record.action().clone();
      let Ok(typed) = get_typed_from_record::<T>(record)
          else { return error("get_typed_bead(): Entry not of requested type") };
      Ok((action.timestamp(), action.author().to_owned(), typed))
    }
    None => error("get_typed_bead(): Entry not found"),
  };
  //let fn_end = sys_time()?;
  //debug!("GET TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
  res
}
