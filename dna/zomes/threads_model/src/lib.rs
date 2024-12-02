#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

mod entries;
mod properties;
mod types;

pub use entries::*;
pub use properties::*;
pub use types::*;


///-------------------------------------------------------------------------------------------------
/// Global consts
///-------------------------------------------------------------------------------------------------

/// DNA/Zome names
pub const VINES_DEFAULT_ROLE_NAME: &'static str = "rVines";
pub const THREADS_DEFAULT_COORDINATOR_ZOME_NAME: &'static str = "zThreads";
pub const THREADS_DEFAULT_INTEGRITY_ZOME_NAME: &'static str = "threads_integrity";

/// ANCHOR NAMES
pub const ROOT_ANCHOR_SEMANTIC_TOPICS: &'static str = "all_semantic_topics";
pub const ROOT_ANCHOR_SUBJECTS: &'static str = "all_subjects";
pub const SEMANTIC_TOPIC_TYPE_NAME: &'static str = "SemanticTopic";
pub const DM_SUBJECT_TYPE_NAME: &'static str = "AgentPubKey";
pub const GLOBAL_TIME_INDEX: &'static str = "global_time";
pub const PP_ITEM_TYPE: &'static str = "__protocol";
