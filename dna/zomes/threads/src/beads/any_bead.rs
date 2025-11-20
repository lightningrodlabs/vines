use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::*;
use threads_integrity::*;
use crate::beads::*;
use crate::{GetAhInput, GetManyAhInput};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddAnyBeadInput {
    pub anyBead: AnyBead,
    pub creation_time: Timestamp,
    pub original_author: Option<AgentPubKey>,
}

/// Return bead ah, type, Global Time Anchor, bucket time
#[hdk_extern]
#[feature(zits_blocking)]
pub fn publish_any_bead(input: AddAnyBeadInput) -> ExternResult<(ActionHash, String, Timestamp)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("add_any_bead() {:?}", input);
    let ah = create_entry(ThreadsEntry::AnyBead(input.anyBead.clone()))?;
    //let bead_type = format!("__any::{}", input.type_info);
    let tp_pair = index_bead(input.anyBead.bead.clone(), ah.clone(), "AnyBead"/*&bead_type*/, input.creation_time)?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    /// Done
    Ok((ah, zome_path::path2anchor(&tp_pair.1.path).unwrap(), bucket_time))
}


///
#[hdk_extern]
pub fn fetch_any_bead(input: GetAhInput) -> ExternResult<Option<(Timestamp, AgentPubKey, AnyBead)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    return Ok(fetch_typed_bead::<AnyBead>(input.ah, input.strategy).ok());
}


///
#[hdk_extern]
pub fn fetch_many_any_beads(input: GetManyAhInput) -> ExternResult<Vec<(Timestamp, AgentPubKey, AnyBead)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    return input.ahs.into_iter().map(|ah| fetch_typed_bead::<AnyBead>(ah, input.strategy)).collect();
}

