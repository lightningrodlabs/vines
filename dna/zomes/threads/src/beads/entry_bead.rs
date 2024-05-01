use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::*;
use threads_integrity::{EntryBead, Bead, ThreadsEntry, ThreadsEntryTypes};
use crate::beads::{get_typed_bead, index_bead};
use crate::notify_peer::{NotifiableEvent, send_inbox_item, SendInboxItemInput, WeaveNotification};


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddEntryBeadInput {
    pub entry_bead: EntryBead,
    pub creation_time: Timestamp,
    pub original_author: Option<AgentPubKey>, // TODO
}

#[hdk_extern]
#[feature(zits_blocking)]
pub fn add_entry_bead(input: AddEntryBeadInput) -> ExternResult<(ActionHash, EntryBead, String, Timestamp)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let ah = create_entry(ThreadsEntry::EntryBead(input.entry_bead.clone()))?;
    let tp_pair = index_bead(input.entry_bead.bead.clone(), ah.clone(), "EntryBead"/*&bead_type*/, input.creation_time)?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    ///
    Ok((ah, input.entry_bead, path2anchor(&tp_pair.1.path).unwrap(), bucket_time))
}


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddEntryAsBeadInput {
    pub eh: EntryHash,
    pub bead: Bead,
    pub role_name: String,
    pub zome_name: String,
    pub original_creation_time: Option<Timestamp>,
    pub original_author: Option<AgentPubKey>,
}


/// Other cells must implement a zome function with interface:
///     get_any_record(eh: EntryHash) -> ExternResult<Option<Record>>;
/// Return bead type, Global Time Anchor, bucket time
#[hdk_extern]
#[feature(zits_blocking)]
pub fn add_entry_as_bead(input: AddEntryAsBeadInput) -> ExternResult<(ActionHash, EntryBead, String, Timestamp, Vec<(AgentPubKey, WeaveNotification)>)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("add_any_as_bead() {:?}", input);
    let response = call(
        CallTargetCell::OtherRole(input.role_name.clone()),
        ZomeName::from(input.zome_name.clone()),
        "get_any_record".into(),
        None,
        input.eh.clone())?;
    let maybeRecord: Option<Record> = decode_response(response)?;
    //let maybeRecord = get(input.ah.clone(), GetOptions::content())?;
    let Some(record) = maybeRecord
        else { return error("No record found at given EntryHash")};
    let Some(entry_type) = record.action().entry_type()
        else { return error("No entry found at given EntryHash")};
    let EntryType::App(entry_def) = entry_type
        else { return error("No AppEntryDef found at given EntryHash")};
    let creation_time = input.original_creation_time.unwrap_or(record.action().timestamp()); //   ah_time
    let bead_type = format!("{}::{}", entry_def.zome_index, entry_def.entry_index.0);
    let entry_bead = EntryBead {
        bead: input.bead.clone(),
        source_role: input.role_name,
        source_zome: input.zome_name,
        source_eh: input.eh,
        source_type: bead_type.clone(),

    };
    let ah = create_entry(ThreadsEntry::EntryBead(entry_bead.clone()))?;
    let tp_pair = index_bead(entry_bead.bead.clone(), ah.clone(), "EntryBead"/*&bead_type*/, creation_time)?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    /// Reply
    let mut maybe_notif = Vec::new();
    if let Some(reply_ah) = entry_bead.bead.prev_known_bead_ah.clone() {
        let reply_author = get_author(&reply_ah.clone().into())?;
        let maybe= send_inbox_item(SendInboxItemInput {content: ah.clone().into(), who: reply_author.clone(), event: NotifiableEvent::Reply})?;
        if let Some((_link_ah, notif)) = maybe {
            maybe_notif.push((reply_author, notif));
        }
    }
    ///
    Ok((ah, entry_bead, path2anchor(&tp_pair.1.path).unwrap(), bucket_time, maybe_notif))
}


///
#[hdk_extern]
pub fn get_entry_bead_option(bead_ah: ActionHash) -> ExternResult<Option<(Timestamp, AgentPubKey, EntryBead)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    return Ok(get_typed_bead::<EntryBead>(bead_ah).ok());
}


///
#[hdk_extern]
pub fn get_entry_bead(bead_ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, EntryBead)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    return get_typed_bead::<EntryBead>(bead_ah);
}


///
#[hdk_extern]
pub fn get_many_entry_beads(ahs: Vec<ActionHash>) -> ExternResult<Vec<(Timestamp, AgentPubKey, EntryBead)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    return ahs.into_iter().map(|ah| get_typed_bead::<EntryBead>(ah)).collect();
}


/// Get all EntryBeads in local source-chain
/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_entry_beads(_: ()) -> ExternResult<Vec<(Timestamp, ActionHash, EntryBead)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let entry_type = EntryType::App(ThreadsEntryTypes::EntryBead.try_into().unwrap());
    let tuples = get_all_typed_local::<EntryBead>(entry_type)?;
    let res = tuples.into_iter().map(|(ah, create_action, typed)| {
        (create_action.timestamp, ah, typed)
    }).collect();
    Ok(res)
}
