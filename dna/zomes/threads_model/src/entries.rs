use hdi::prelude::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum BaseBeadKind {
    AnyBead(AnyBead),
    EntryBead(EntryBead),
    TextBead(TextBead),
}
impl BaseBeadKind {
    pub fn bead(&self) -> Bead {
        match self {
            BaseBeadKind::AnyBead(a) => a.bead.clone(),
            BaseBeadKind::EntryBead(a) => a.bead.clone(),
            BaseBeadKind::TextBead(a) => a.bead.clone(),
        }
    }
}



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
#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct SemanticTopic {
    pub title: String,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ParticipationProtocol {
    pub purpose: String,
    pub rules: String,
    pub subject: Subject,
    pub subject_name: String,
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subject {
    pub address: String, // HoloHashB64
    pub type_name: String,
    pub dna_hash_b64: String, // DnaHashB64
    pub applet_id: String, // EntryHashB64 of the Applet entry in the group dna (We)
}


#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct GlobalLastProbeLog {
    pub ts: Timestamp,
    pub maybe_last_known_pp_ah: Option<ActionHash>,
}


#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThreadLastProbeLog {
    pub ts: Timestamp,
    pub pp_ah: ActionHash,
    pub maybe_last_known_bead_ah: Option<ActionHash>,
}

