
mod text_message;
mod get_latest_beads;
mod get_all_beads;
mod index_bead;

pub use index_bead::*;

//---


use hdk::prelude::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeadLink {
  pub index_time: Timestamp,
  pub creation_time: Timestamp,
  pub bead_ah: ActionHash,
  pub bead_type: String,
}




#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct BeadTag {
  pub bead_type: String,
  pub devtest_timestamp: Timestamp,
}


///
impl BeadTag {
  fn to_vec(self) -> Vec<u8> {
    let sb = SerializedBytes::try_from(self.clone()).unwrap();
    // let clone: Self = sb.clone().try_into().unwrap();
    // debug!("BeadTag.serde test:\n {:?}\n {:?}", self, clone);
    debug!("BeadTag.serde: {:?}", self);
    return sb.bytes().to_owned();
  }
}
