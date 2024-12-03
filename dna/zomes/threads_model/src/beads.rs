use hdi::prelude::*;


/// First bead: prev_bead_ah == pp_ah
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bead {
  pub pp_ah: ActionHash,
  pub prev_bead_ah: ActionHash,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EntryBead {
  pub bead: Bead,
  pub source_eh: EntryHash,
  pub source_type: String,
  pub source_zome: String,
  pub source_role: String,
}
///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TextBead {
  pub bead: Bead,
  pub value: String,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AnyBead {
  pub bead: Bead,
  pub value: String,
  pub type_info: String,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EncryptedBead {
  pub for_other: XSalsa20Poly1305EncryptedData,
  pub for_self: XSalsa20Poly1305EncryptedData,
  pub bead_type: String,
}


///
#[derive(Serialize, PartialEq, Deserialize, Debug, Clone)]
pub enum BeadType {
  Base(BaseBeadType),
  Encrypted,
}

///
#[derive(Serialize, PartialEq, Deserialize, Debug, Clone)]
pub enum BaseBeadType {
  Text,
  Entry,
  Any,
}


///
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum TypedBead {
  Base(TypedBaseBead),
  Encrypted(EncryptedBead),
}

///
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum TypedBaseBead {
  Text(TextBead),
  Entry(EntryBead),
  Any(AnyBead),
}


impl TypedBaseBead {
  pub fn bead(&self) -> Bead {
    match self {
      TypedBaseBead::Any(a) => a.bead.clone(),
      TypedBaseBead::Entry(a) => a.bead.clone(),
      TypedBaseBead::Text(a) => a.bead.clone(),
    }
  }
}








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