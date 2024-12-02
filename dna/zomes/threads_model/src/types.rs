
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeadLink {
  pub creation_time: Timestamp, // index_time can be determined by rounding creation_time
  pub bead_ah: ActionHash,
  pub bead_type: String,
  pub author: AgentPubKey,
}

