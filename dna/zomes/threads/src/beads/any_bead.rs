use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::{error, get_all_typed_local, get_author, get_typed_from_record, path2anchor};
use threads_integrity::{ThreadsEntry, ThreadsEntryTypes, AnyBead};
use crate::beads::index_bead;
use crate::notify_peer::{NotifiableEvent, send_inbox_item, SendInboxItemInput, WeaveNotification};

/// Return bead type, Global Time Anchor, bucket time
#[hdk_extern]
pub fn add_any_bead(anyBead: AnyBead) -> ExternResult<(ActionHash, String, Timestamp, Option<(AgentPubKey, WeaveNotification)>)> {
    debug!("add_any_bead() {:?}", anyBead);
    let ah = create_entry(ThreadsEntry::AnyBead(anyBead.clone()))?;
    //let bead_type = format!("__any::{}", input.type_info);
    let tp_pair = index_bead(anyBead.bead.clone(), ah.clone(), "AnyBead"/*&bead_type*/, sys_time()?)?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    /// Reply
    let mut maybe_notif = None;
    if let Some(reply_ah) = anyBead.bead.prev_known_bead_ah.clone() {
        let reply_author = get_author(&reply_ah.clone().into())?;
        let maybe= send_inbox_item(SendInboxItemInput {content: ah.clone().into(), who: reply_author.clone(), event: NotifiableEvent::Reply})?;
        if let Some((_link_ah, notif)) = maybe {
            maybe_notif = Some((reply_author, notif));
        }
    }
    /// Done
    Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time, maybe_notif))
}


/// WARN Will return actual action creation time and not devtest_timestamp
#[hdk_extern]
pub fn get_any_bead(bead_ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, AnyBead)> {
    //let fn_start = sys_time()?;
    let res = match get(bead_ah.clone(), GetOptions::content())? {
        Some(record) => {
            let action = record.action().clone();
            let Ok(typed) = get_typed_from_record::<AnyBead>(record)
                else { return error("get_any_bead(): Entry not an AnyBead") };
            Ok((action.timestamp(), action.author().to_owned(), typed))
        }
        None => error("get_any_bead(): Entry not found"),
    };
    //let fn_end = sys_time()?;
    //debug!("GET TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
    res
}


///
#[hdk_extern]
pub fn get_many_any_beads(ahs: Vec<ActionHash>) -> ExternResult<Vec<(Timestamp, AgentPubKey, AnyBead)>> {
    return ahs.into_iter().map(|ah| get_any_bead(ah)).collect();
}


/// Get all AnyBeads in local source-chain
/// WARN Will return actual action creation time and not devtest_timestamp
#[hdk_extern]
pub fn query_any_beads(_: ()) -> ExternResult<Vec<(Timestamp, ActionHash, AnyBead)>> {
    let entry_type = EntryType::App(ThreadsEntryTypes::AnyBead.try_into().unwrap());
    let tuples = get_all_typed_local::<AnyBead>(entry_type)?;
    let res = tuples.into_iter().map(|(ah, create_action, typed)| {
        (create_action.timestamp, ah, typed)
    }).collect();
    Ok(res)
}
