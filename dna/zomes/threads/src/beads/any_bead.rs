use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::{error, get_all_typed_local, get_typed_from_record, path2anchor};
use threads_integrity::{Bead, ThreadsEntry, ThreadsEntryTypes, AnyBead};
use crate::beads::index_bead;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddAnyBead {
    pub for_protocol_ah: ActionHash,
    pub value: String,
    pub type_info: String,
}

/// Return bead type, Global Time Anchor, bucket time
#[hdk_extern]
pub fn add_any_bead(input: AddAnyBead) -> ExternResult<(ActionHash, AnyBead, String, Timestamp)> {
    debug!("add_any_bead() {:?}", input);
    let anyBead = AnyBead {
        bead: Bead {
            for_protocol_ah: input.for_protocol_ah,
            maybe_reply_of_ah: None,
        },
        value: input.value,
        type_info: input.type_info.clone(),
    };
    let ah = create_entry(ThreadsEntry::AnyBead(anyBead.clone()))?;
    //let bead_type = format!("__any::{}", input.type_info);
    let tp_pair = index_bead(anyBead.bead.clone(), ah.clone(), "AnyBead"/*&bead_type*/, sys_time()?)?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    Ok((ah, anyBead, path2anchor(&tp_pair.1.path).unwrap(), bucket_time))
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
