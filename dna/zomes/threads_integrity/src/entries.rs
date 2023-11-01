use hdi::prelude::*;

///
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
    pub subject_hash: AnyLinkableHash,
    pub subject_type: String,
}



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
