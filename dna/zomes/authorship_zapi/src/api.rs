use std::collections::BTreeMap;
use hdk::prelude::*;
use zome_utils::*;

pub use zome_core::get_input_types::*;
use crate::call_authorship_zome;

///
#[hdk_extern]
pub fn get_original_author(input: GetLhInput) -> ExternResult<Option<(Timestamp, AgentPubKey)>> {
    let maybe_response = call_authorship_zome("get_author".into(), input);
    let Ok(response) = maybe_response else {
        debug!("get_original_author() fail response: {:?}", maybe_response);
        return Ok(None);
    };
    let result: Option<(Timestamp, AgentPubKey)> = decode_response(response)?;
    debug!("get_original_author() success response: {:?}", result);
    Ok(result)
}



///
#[hdk_extern]
pub fn get_original_authors(input: GetManyLhInput) -> ExternResult<BTreeMap<ActionHash, (Timestamp, AgentPubKey)>> {
   let maybe_response = call_authorship_zome("get_authors".into(), input);
   let Ok(response) = maybe_response else {
      debug!("get_original_authors() fail response: {:?}", maybe_response);
      return Ok(BTreeMap::new());
   };
   let result: BTreeMap<ActionHash, (Timestamp, AgentPubKey)> = decode_response(response)?;
   debug!("get_original_authors() success response: {:?}", result);
   Ok(result)
}
