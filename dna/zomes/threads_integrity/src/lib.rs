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
use threads_model::*;


///-------------------------------------------------------------------------------------------------
/// Entry types
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


///-------------------------------------------------------------------------------------------------
/// Link types
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
