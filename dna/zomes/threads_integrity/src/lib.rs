#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]


//--------------------------------------------------------------------------------------------------

use hdi::prelude::*;

pub const THREADS_ZOME_NAME: &'static str = "threads";


#[hdk_entry_defs]
#[unit_enum(ThreadsEntryTypes)]
pub enum ThreadsEntry {
    #[entry_def(required_validations = 2, visibility = "public")]
    SemanticTopic(SemanticTopic),
    #[entry_def(required_validations = 2, visibility = "public")]
    ParticipationProtocol(ParticipationProtocol),
    #[entry_def(required_validations = 2, visibility = "public")]
    TextMessage(TextMessage),
}


/// List of all link kinds handled by this Zome
#[hdk_link_types]
#[derive(Serialize, Deserialize)]
pub enum ThreadsLinkType {
    All,
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
pub struct TextMessage {
    pub value: String,
}


///
#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct ParticipationProtocol {
    pub purpose: String,
    pub rules: String,
    pub topic_hash: AnyLinkableHash,
    pub topic_type: TopicType,
}


///
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub enum TopicType {
    Dna,
    Agent,
    Bead,
    SemanticTopic,
    AppletEntry,
    AppletAction,
}
