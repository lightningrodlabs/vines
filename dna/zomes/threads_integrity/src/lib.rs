#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

pub mod beads;
pub mod last_search_log;
pub mod globals;

//--------------------------------------------------------------------------------------------------

use hdi::prelude::*;
use hdi::prelude::holo_hash::hash_type;

pub use beads::*;
pub use last_search_log::*;
pub use globals::*;


#[hdk_entry_defs]
#[unit_enum(ThreadsEntryTypes)]
pub enum ThreadsEntry {
    #[entry_def(required_validations = 3, visibility = "public")]
    SemanticTopic(SemanticTopic),
    #[entry_def(required_validations = 3, visibility = "public")]
    ParticipationProtocol(ParticipationProtocol),
    #[entry_def(required_validations = 3, visibility = "public")]
    TextMessage(TextMessage),
    #[entry_def(required_validations = 1, visibility = "private")]
    GlobalQueryLog(GlobalLastSearchLog),
    #[entry_def(required_validations = 1, visibility = "private")]
    ThreadQueryLog(ThreadLastSearchLog),
}


/// List of all link kinds handled by this Zome
#[hdk_link_types]
#[derive(Serialize, Deserialize)]
pub enum ThreadsLinkType {
    ReversePath,
    GlobalTimePath,
    ThreadTimePath,
    SemanticTopicPath,
    SubjectPath,
    Topics,
    Threads,
    Beads,
    Protocols,
    Invalid,
}


//--------------------------------------------------------------------------------------------------

///
#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct SemanticTopic {
    pub title: String,
}


///
#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct ParticipationProtocol {
    pub purpose: String,
    pub rules: String,
    pub subject_hash: AnyLinkableHash,
    pub subject_type: SubjectType,
}


///
#[derive(Serialize, Deserialize, PartialEq, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum SubjectType {
    Dna,
    Agent,
    Bead,
    SemanticTopic,
    Applet(AppletSubjectType),
}


///
#[derive(Serialize, Deserialize, PartialEq, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum AppletSubjectType {
    Entry,
    Action,
    External,
}

impl AppletSubjectType {
    pub fn from(lh: AnyLinkableHash) -> Self {
        match lh.hash_type() {
            hash_type::AnyLinkable::Entry => {
                AppletSubjectType::Entry
            }
            hash_type::AnyLinkable::Action => {
                AppletSubjectType::Entry
            }
            hash_type::AnyLinkable::External => {
                AppletSubjectType::External
            }
        }
    }
}

