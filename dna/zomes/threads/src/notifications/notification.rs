use hdk::prelude::*;
use strum_macros::FromRepr;

///
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone, PartialEq, FromRepr)]
//#[repr(u8)]
pub enum NotifiableEvent {
  NewBead,     // Another agent added a Bead to a PP
  Mention,     // Another agent mentionned you in a textMessage
  Reply,       // Another agent replied to one of your beads
  Fork,        // Another agent created a thread off of some entry you authored
  NewDmThread, // Another agent created a DmThread with you
}
// impl From<NotifiableEvent> for u8 {
//   fn from(m: NotifiableEvent) -> u8 {
//     m as u8
//   }
// }


///
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ThreadsNotificationTip {
  pub event: NotifiableEvent,
  pub author: AgentPubKey,
  pub timestamp: Timestamp,
  pub content: AnyLinkableHash,
  ///
  pub link_ah: ActionHash,
  pub pp_ah: ActionHash,
  pub data: SerializedBytes,
}
