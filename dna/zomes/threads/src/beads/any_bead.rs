use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::*;
use threads_integrity::{ThreadsEntry, ThreadsEntryTypes, AnyBead};
use crate::beads::{get_typed_bead, index_bead};
use crate::notify_peer::{NotifiableEvent, send_inbox_item, SendInboxItemInput, WeaveNotification};


/// Return bead ah, type, Global Time Anchor, bucket time
#[hdk_extern]
pub fn add_any_bead(anyBead: AnyBead) -> ExternResult<(ActionHash, String, Timestamp, Vec<(AgentPubKey, WeaveNotification)>)> {
    debug!("add_any_bead() {:?}", anyBead);
    let ah = create_entry(ThreadsEntry::AnyBead(anyBead.clone()))?;
    //let bead_type = format!("__any::{}", input.type_info);
    let tp_pair = index_bead(anyBead.bead.clone(), ah.clone(), "AnyBead"/*&bead_type*/, sys_time()?)?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    /// Reply
    let mut maybe_notif = Vec::new();
    if let Some(reply_ah) = anyBead.bead.prev_known_bead_ah.clone() {
        let reply_author = get_author(&reply_ah.clone().into())?;
        let maybe= send_inbox_item(SendInboxItemInput {content: ah.clone().into(), who: reply_author.clone(), event: NotifiableEvent::Reply})?;
        if let Some((_link_ah, notif)) = maybe {
            maybe_notif.push((reply_author, notif));
        }
    }
    /// Done
    Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time, maybe_notif))
}


///
#[hdk_extern]
pub fn get_any_bead(bead_ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, AnyBead)> {
    return get_typed_bead::<AnyBead>(bead_ah);
}


///
#[hdk_extern]
pub fn get_many_any_beads(ahs: Vec<ActionHash>) -> ExternResult<Vec<(Timestamp, AgentPubKey, AnyBead)>> {
    return ahs.into_iter().map(|ah| get_typed_bead::<AnyBead>(ah)).collect();
}


/// Get all AnyBeads in local source-chain
/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_any_beads(_: ()) -> ExternResult<Vec<(Timestamp, ActionHash, AnyBead)>> {
    let entry_type = EntryType::App(ThreadsEntryTypes::AnyBead.try_into().unwrap());
    let tuples = get_all_typed_local::<AnyBead>(entry_type)?;
    let res = tuples.into_iter().map(|(ah, create_action, typed)| {
        (create_action.timestamp, ah, typed)
    }).collect();
    Ok(res)
}
