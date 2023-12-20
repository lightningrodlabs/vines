#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

mod entries;
pub use entries::*;

use hdi::prelude::*;

///-------------------------------------------------------------------------------------------------
/// Threads Global consts
///-------------------------------------------------------------------------------------------------

/// DNA/Zome names
pub const THREADS_DEFAULT_ROLE_NAME: &'static str = "role_threads";
pub const THREADS_DEFAULT_COORDINATOR_ZOME_NAME: &'static str = "zThreads";
pub const THREADS_DEFAULT_INTEGRITY_ZOME_NAME: &'static str = "threads_integrity";

/// ANCHOR NAMES
pub const ROOT_ANCHOR_SEMANTIC_TOPICS: &'static str = "all_semantic_topics";
pub const ROOT_ANCHOR_SUBJECTS: &'static str = "all_subjects";
pub const SEMANTIC_TOPIC_TYPE_NAME: &'static str = "SemanticTopic";
pub const GLOBAL_TIME_INDEX: &'static str = "global_time";
pub const PP_ITEM_TYPE: &'static str = "__protocol";




///-------------------------------------------------------------------------------------------------
/// Threads zome's entry types
///-------------------------------------------------------------------------------------------------

#[hdk_entry_defs]
#[unit_enum(ThreadsEntryTypes)]
pub enum ThreadsEntry {
    #[entry_def(required_validations = 3, visibility = "public")]
    EntryBead(EntryBead),
    #[entry_def(required_validations = 3, visibility = "public")]
    SemanticTopic(SemanticTopic),
    #[entry_def(required_validations = 3, visibility = "public")]
    ParticipationProtocol(ParticipationProtocol),
    #[entry_def(required_validations = 3, visibility = "public")]
    TextMessage(TextMessage),
    #[entry_def(required_validations = 1, visibility = "private")]
    GlobalProbeLog(GlobalLastProbeLog),
    #[entry_def(required_validations = 1, visibility = "private")]
    ThreadProbeLog(ThreadLastProbeLog),
}


///-------------------------------------------------------------------------------------------------
/// Threads zome's link types
///-------------------------------------------------------------------------------------------------

#[hdk_link_types]
#[derive(Serialize, Deserialize)]
pub enum ThreadsLinkType {
    ReversePath,
    GlobalTimePath,
    ThreadTimePath,
    SemanticTopicPath,
    SubjectPath,
    TimeItem,
    Topics,
    Threads,
    Beads,
    Protocols,
    Invalid,
    Mention,
    Hide,
}
