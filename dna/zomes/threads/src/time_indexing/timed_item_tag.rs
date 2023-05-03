use hdk::prelude::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct TimedItemTag {
  pub item_type: String,
  pub devtest_timestamp: Timestamp,
  pub custom_data: Vec<u8>,
}


///
impl TimedItemTag {
  pub fn to_vec(self) -> Vec<u8> {
    let sb = SerializedBytes::try_from(self.clone()).unwrap();
    //debug!("BeadTag.serde: {:?}", self);
    return sb.bytes().to_owned();
  }
}
