use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::{error, get_eh, path2anchor};
use threads_integrity::Bead;
use crate::beads::index_bead;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddAnyAsBead {
    pub ah: ActionHash,
    pub for_protocol_ah: ActionHash,
}

/// Return bead type, Global Time Anchor, bucket time
#[hdk_extern]
pub fn add_any_as_bead(input: AddAnyAsBead) -> ExternResult<(String, String, Timestamp)> {
    debug!("add_any_as_bead() {:?}", input);
    let maybeRecord = get(input.ah.clone(), GetOptions::content())?;
    let Some(record) = maybeRecord
        else { return error("No record found at given ActionHash")};
    let Some(ah_type) = record.action().entry_type()
        else { return error("No entry found at given ActionHash")};
    let EntryType::App(entry_def) = ah_type
        else { return error("No AppEntryDef found at given ActionHash")};
    let ah_time = record.action().timestamp();
    let bead = Bead {
        for_protocol_ah: input.for_protocol_ah,
        maybe_reply_of_ah: None,
    };
    let bead_type = format!("{}::{}", entry_def.zome_index, entry_def.entry_index.0);
    let tp_pair = index_bead(bead, input.ah.clone(), &bead_type, ah_time)?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    Ok((bead_type, path2anchor(&tp_pair.1.path).unwrap(), bucket_time))
}


//
// ///
// #[hdk_extern]
// pub fn get_bead_eh(beadAh: ActionHash) -> ExternResult<EntryHash> {
//     debug!("get_bead_eh() {}", beadAh);
//     let eh = get_eh(beadAh)?;
//     Ok(eh)
// }
