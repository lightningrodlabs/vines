use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct GlobalQueryLog {
  pub time: u64,
  pub last_known_protocol_ah: ActionHash,
}


#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThreadQueryLog {
  pub time: u64,
  protocol_ah: ActionHash,
  last_known_bead_ah: ActionHash,
}
