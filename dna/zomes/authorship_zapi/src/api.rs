use hdk::prelude::*;
use zome_utils::*;


///
pub fn get_original_author(ah: ActionHash)  -> ExternResult<Option<(Timestamp, AgentPubKey)>> {
    let maybe_response = call(CallTargetCell::Local, "zAuthorship", "get_author".into(), None, ah);
    let Ok(response) = maybe_response else {
        debug!("get_original_author() reponse fail: {:?}", maybe_response);
        return Ok(None);
    };
    let result: Option<(Timestamp, AgentPubKey)> = decode_response(response)?;
    debug!("get_original_author() reponse success: {:?}", result);
    Ok(result)
}
