use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct GlobalLastProbeLog {
  pub time: Timestamp,
  pub maybe_last_known_pp_ah: Option<ActionHash>,
}


#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThreadLastProbeLog {
  pub time: Timestamp,
  pp_ah: ActionHash,
  maybe_last_known_bead_ah: Option<ActionHash>,
}
