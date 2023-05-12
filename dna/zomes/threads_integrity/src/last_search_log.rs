use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct GlobalLastSearchLog {
  pub time: Timestamp,
  pub maybe_last_known_pp_ah: Option<ActionHash>,
}


#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThreadLastSearchLog {
  pub time: Timestamp,
  pp_ah: ActionHash,
  last_known_bead_ah: ActionHash,
}
