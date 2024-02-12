use hdk::prelude::*;
use zome_utils::*;


///
pub fn get_original_author(ah: ActionHash)  -> ExternResult<Option<(Timestamp, AgentPubKey)>> {
    let maybe_response = call(CallTargetCell::Local, "authorship_coordinator", "get_author".into(), None, ah);
    let Ok(response) = maybe_response else {
        return Ok(None);
    };
    let result: Option<(Timestamp, AgentPubKey)> = decode_response(response)?;
    Ok(result)
}
