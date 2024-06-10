use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::*;
use threads_integrity::{ThreadsEntry, ThreadsEntryTypes, AnyBead};
use crate::beads::{get_typed_bead, index_bead};
use crate::notifications::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddAnyBeadInput {
    pub anyBead: AnyBead,
    pub creation_time: Timestamp,
    pub original_author: Option<AgentPubKey>,
    pub can_notify_reply: bool,
}

/// Return bead ah, type, Global Time Anchor, bucket time
#[hdk_extern]
#[feature(zits_blocking)]
pub fn add_any_bead(input: AddAnyBeadInput) -> ExternResult<(ActionHash, String, Timestamp, Vec<(AgentPubKey, WeaveNotification)>)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("add_any_bead() {:?}", input);
    let ah = create_entry(ThreadsEntry::AnyBead(input.anyBead.clone()))?;
    //let bead_type = format!("__any::{}", input.type_info);
    let tp_pair = index_bead(input.anyBead.bead.clone(), ah.clone(), "AnyBead"/*&bead_type*/, input.creation_time)?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    /// Reply
    let mut maybe_notif = Vec::new();
    if input.can_notify_reply {
        if input.anyBead.bead.pp_ah != input.anyBead.bead.prev_bead_ah.clone() {
            let reply_author = get_author(&input.anyBead.bead.prev_bead_ah.clone().into())?;
            let maybe = send_inbox_item(SendInboxItemInput { content: ah.clone().into(), who: reply_author.clone(), event: NotifiableEvent::Reply })?;
            if let Some((_link_ah, notif)) = maybe {
                maybe_notif.push((reply_author, notif));
            }
        }
    }
    /// Done
    Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time, maybe_notif))
}


///
#[hdk_extern]
pub fn get_any_bead_option(bead_ah: ActionHash) -> ExternResult<Option<(Timestamp, AgentPubKey, AnyBead)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    return Ok(get_typed_bead::<AnyBead>(bead_ah).ok());
}


///
#[hdk_extern]
pub fn get_any_bead(bead_ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, AnyBead)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    return get_typed_bead::<AnyBead>(bead_ah);
}


///
#[hdk_extern]
pub fn get_many_any_beads(ahs: Vec<ActionHash>) -> ExternResult<Vec<(Timestamp, AgentPubKey, AnyBead)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    return ahs.into_iter().map(|ah| get_typed_bead::<AnyBead>(ah)).collect();
}


/// Get all AnyBeads in local source-chain
/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_any_beads(_: ()) -> ExternResult<Vec<(Timestamp, ActionHash, AnyBead)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let entry_type = EntryType::App(ThreadsEntryTypes::AnyBead.try_into().unwrap());
    let tuples = get_all_typed_local::<AnyBead>(entry_type)?;
    let res = tuples.into_iter().map(|(ah, create_action, typed)| {
        (create_action.timestamp, ah, typed)
    }).collect();
    Ok(res)
}
