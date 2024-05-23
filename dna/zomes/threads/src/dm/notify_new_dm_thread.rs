use hdk::prelude::*;
use zome_utils::*;
use crate::notify_peer::{SendInboxItemInput, NotifiableEvent, send_inbox_item, WeaveNotification};


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotifyNewDmThreadInput {
  pub pp_ah: ActionHash,
  pub other_agent: AgentPubKey,
}


#[hdk_extern]
pub fn notify_new_dm_thread(input: NotifyNewDmThreadInput) -> ExternResult<WeaveNotification> {
  let Some((_link_ah, notif)) = send_inbox_item(SendInboxItemInput { content: input.pp_ah.into(), who: input.other_agent, event: NotifiableEvent::NewDmThread })? else {
    return error("Cannot DM self");
  };
  Ok(notif)
}
