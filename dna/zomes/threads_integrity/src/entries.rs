use hdi::prelude::*;

///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bead {
    pub pp_ah: ActionHash,
    pub prev_known_bead_ah: Option<ActionHash>,
}

///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EntryBead {
    pub bead: Bead,
    pub source_eh: EntryHash,
    pub source_type: String,
    pub source_role: String,
    pub source_zome: String,
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
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct SemanticTopic {
    pub title: String,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ParticipationProtocol {
    pub purpose: String,
    pub rules: String,
    pub subject: Subject,
    //pub subject_hash: AnyLinkableHash,
    //pub subject_type: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subject {
    pub hash: AnyLinkableHash,
    //hash_type: AppletSubjectType,
    pub type_name: String,
    pub dna_hash: DnaHash,
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



// ///
// #[derive(Serialize, Deserialize, PartialEq, Clone, Debug)]
// #[serde(rename_all = "camelCase")]
// pub enum SubjectType {
//     Dna,
//     Agent,
//     Bead,
//     SemanticTopic,
//     Applet(AppletSubjectType),
// }
//
//
// ///
// #[derive(Serialize, Deserialize, PartialEq, Clone, Debug)]
// #[serde(rename_all = "camelCase")]
// pub enum AppletSubjectType {
//     Entry,
//     Action,
//     External,
// }
//
// impl AppletSubjectType {
//     pub fn from(lh: AnyLinkableHash) -> Self {
//         match lh.hash_type() {
//             hash_type::AnyLinkable::Entry => {
//                 AppletSubjectType::Entry
//             }
//             hash_type::AnyLinkable::Action => {
//                 AppletSubjectType::Entry
//             }
//             hash_type::AnyLinkable::External => {
//                 AppletSubjectType::External
//             }
//         }
//     }
// }
//
