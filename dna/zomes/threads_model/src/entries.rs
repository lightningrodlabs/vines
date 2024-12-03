use hdi::prelude::*;
use zome_integrity_utils::*;



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


#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct Subject {
    pub address: AnyHashB64,
    //pub name: String,
    pub type_name: String,
    pub dna: DnaHash,
    pub applet_id: EntryHash,
}

// #[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
// #[serde(rename_all = "camelCase")]
// pub struct Subject {
//     pub address: String, // HoloHashB64
//     pub type_name: String,
//     pub dna_hash_b64: String, // DnaHashB64
//     pub applet_id: String, // EntryHashB64 of the Applet entry in the group dna (We)
// }


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

