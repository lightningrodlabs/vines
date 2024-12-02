use hdi::prelude::*;
use crate::entries::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BeadLink {
  pub creation_time: Timestamp, // index_time can be determined by rounding creation_time
  pub author: AgentPubKey,
  pub bead_ah: ActionHash,
  pub bead_type: BeadType,
}


#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BeadInfo {
  pub creation_time: Timestamp,
  pub author: AgentPubKey,
  pub bead_type: BeadType,
  pub bead: Bead,
}


///
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum BeadType {
  Base(BaseBeadType),
  Encrypted,
}

///
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum BaseBeadType {
  Text,
  Entry,
  Any,
}


///
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum TypedBead {
  Base(TypedBaseBead),
  Encrypted(EncryptedBead),
}

///
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum TypedBaseBead {
  Text(TextBead),
  Entry(EntryBead),
  Any(AnyBead),
}


