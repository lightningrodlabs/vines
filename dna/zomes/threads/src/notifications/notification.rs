use hdk::prelude::*;
use strum_macros::FromRepr;

///
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone, PartialEq, FromRepr)]
#[repr(u8)]
pub enum NotifiableEvent {
  NewBead, // Another agent added a Bead to a PP you "follow"
  Mention, // Another agent mentionned you in a textMessage ; Title is
  Reply,   // Another agent replied to one of your bead
  Fork,    // Another agent created a thread off of some entry you own
  NewDmThread, // Another agent created a DmThread with you
}
impl From<NotifiableEvent> for u8 {
  fn from(m: NotifiableEvent) -> u8 {
    m as u8
  }
}


///
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct WeaveNotification {
  pub event: NotifiableEvent,
  pub author: AgentPubKey,
  pub timestamp: Timestamp,
  // pubtitle: String,
  pub link_ah: ActionHash,
  pub content: AnyLinkableHash,
}
// impl WeaveNotification {
//   pub fn from_link(link: &Link) -> Self {
//     let repr: u8 = link.tag.clone().into_inner()[0];
//     WeaveNotification {
//       event: NotifiableEvent::from_repr(repr).unwrap(),
//       author: link.author.clone(),
//       timestamp: link.timestamp,
//       link_ah: link.create_link_hash.clone(),
//       content: link.target.clone(),
//     }
//   }
// }
