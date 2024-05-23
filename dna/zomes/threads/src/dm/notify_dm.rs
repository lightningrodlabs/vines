use hdk::prelude::*;
use zome_utils::*;
use crate::notify_peer::{SendInboxItemInput, NotifiableEvent, send_inbox_item, WeaveNotification};


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotifyDmInput {
  pub bead_ah: ActionHash,
  pub other_agent: AgentPubKey,
}


#[hdk_extern]
pub fn notify_dm(input: NotifyDmInput) -> ExternResult<WeaveNotification> {
  let Some((_link_ah, notif)) = send_inbox_item(SendInboxItemInput { content: input.bead_ah.into(), who: input.other_agent, event: NotifiableEvent::Dm })? else {
    return error("Cannot DM self");
  };
  Ok(notif)
}
