use hdi::prelude::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bead {
  pub for_protocol_ah: ActionHash,
  pub maybe_reply_of_ah: Option<ActionHash>,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TextMessage {
  pub value: String,
  pub bead: Bead,
}


