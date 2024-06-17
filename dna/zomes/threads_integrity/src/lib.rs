#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

mod entries;
mod properties;

pub use entries::*;
pub use properties::*;

use hdi::prelude::*;

///-------------------------------------------------------------------------------------------------
/// Threads Global consts
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




///-------------------------------------------------------------------------------------------------
/// Threads zome's entry types
///-------------------------------------------------------------------------------------------------

#[derive(Serialize, Deserialize, SerializedBytes, Clone)]
#[hdk_entry_types]
#[unit_enum(ThreadsEntryTypes)]
pub enum ThreadsEntry {
    #[entry_type(required_validations = 3, visibility = "public")]
    AnyBead(AnyBead),
    #[entry_type(required_validations = 3, visibility = "public")]
    EntryBead(EntryBead),
    #[entry_type(required_validations = 3, visibility = "public")]
    TextBead(TextBead),
    #[entry_type(required_validations = 3, visibility = "public")]
    EncryptedBead(EncryptedBead),
    #[entry_type(required_validations = 3, visibility = "public")]
    SemanticTopic(SemanticTopic),
    #[entry_type(required_validations = 3, visibility = "public")]
    ParticipationProtocol(ParticipationProtocol),
    #[entry_type(required_validations = 1, visibility = "private")]
    GlobalLastProbeLog(GlobalLastProbeLog),
    #[entry_type(required_validations = 1, visibility = "private")]
    ThreadLastProbeLog(ThreadLastProbeLog),
}


///
pub fn entry_index_to_variant(entry_index: EntryDefIndex) -> ExternResult<ThreadsEntryTypes> {
    let mut i = 0;
    for variant in ThreadsEntryTypes::iter() {
        if i == entry_index.0 {
            return Ok(variant);
        }
        i += 1;
    }
    return Err(wasm_error!(format!("Unknown EntryDefIndex: {}", entry_index.0)));
}


/// TODO: Find a better way to do this
pub fn into_typed(entry: Entry, app_entry_def: &AppEntryDef) -> ExternResult<ThreadsEntry> {
     //let typed = R::try_from(entry).map_err(|e| wasm_error!("Failed to convert Entry")).unwrap();
     let variant = entry_index_to_variant(app_entry_def.entry_index)?;
     let typed: ThreadsEntry = match variant {
         ThreadsEntryTypes::AnyBead => ThreadsEntry::AnyBead(AnyBead::try_from(entry)?),
         ThreadsEntryTypes::EntryBead => ThreadsEntry::EntryBead(EntryBead::try_from(entry)?),
         ThreadsEntryTypes::TextBead => ThreadsEntry::TextBead(TextBead::try_from(entry)?),
         ThreadsEntryTypes::EncryptedBead => ThreadsEntry::EncryptedBead(EncryptedBead::try_from(entry)?),
         ThreadsEntryTypes::SemanticTopic => ThreadsEntry::SemanticTopic(SemanticTopic::try_from(entry)?),
         ThreadsEntryTypes::ParticipationProtocol => ThreadsEntry::ParticipationProtocol(ParticipationProtocol::try_from(entry)?),
         ThreadsEntryTypes::GlobalLastProbeLog => ThreadsEntry::GlobalLastProbeLog(GlobalLastProbeLog::try_from(entry)?),
         ThreadsEntryTypes::ThreadLastProbeLog => ThreadsEntry::ThreadLastProbeLog(ThreadLastProbeLog::try_from(entry)?),
     };
     Ok(typed)
}


///
pub fn record_to_typed(record: Record) -> ExternResult<ThreadsEntry> {
    let RecordEntry::Present(entry) = record.entry() else {
        return Err(wasm_error!("Entry not present"));
    };
    let Some(EntryType::App(app_entry_def)) = record.action().entry_type()
      else { return Err(wasm_error!("Not an app Entry")); };
    return into_typed(entry.to_owned(), app_entry_def);
}



// ///
// pub fn into_typed(entry: Entry, app_entry_def: &AppEntryDef) -> ExternResult<ThreadsEntry> {
//     let Entry::App(app_entry_bytes) = entry
//       else { return Err(wasm_error!("Entry should be an AppEntry")) };
//     let variant = entry_index_to_variant(app_entry_def.entry_index)?;
//     for variant in ThreadsEntryTypes::iter() {
//         let maybe = variant::try_from(entry);
//         if let Ok(typed) = maybe {
//             return typed;
//         }
//     }
//     return Err(wasm_error!("Unknown AppEntry"));
// }


///-------------------------------------------------------------------------------------------------
/// Threads zome's link types
///-------------------------------------------------------------------------------------------------

#[hdk_link_types]
#[derive(Serialize, Deserialize)]
#[repr(u8)]
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
    Inbox,
    Hide,
    EmojiReaction,
    NotifySetting,
    Favorite,
    Dm,
}
