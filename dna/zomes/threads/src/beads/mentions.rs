use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::*;
use threads_integrity::*;
use crate::beads::*;
use crate::notify_peer::{AnnounceInput, NotifiableEvent, send_inbox_item, WeaveNotification};


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AddTextWithMentionsInput {
  texto: TextMessage,
  mentionees: Vec<AgentPubKey>,
}


// #[hdk_extern]
// pub fn add_text_message_with_mentions(input: AddTextWithMentionsInput) -> ExternResult<(ActionHash, String, Timestamp)> {
//   let tuple = add_text_message(input.texto)?;
//   /// Mentions
//   for mentionee in input.mentionees {
//     let _ =  send_inbox_item(AnnounceInput {content: tuple.0.clone().into(), who: mentionee, event: NotifiableEvent::Mention})?;
//   }
//   /// Reply
//   ///
//   /// Done
//   Ok(tuple)
// }

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTextAndMentionsAtInput {
  pub texto: TextMessage,
  pub creation_time: Timestamp,
  mentionees: Vec<AgentPubKey>,
}


///
#[hdk_extern]
pub fn add_text_message_at_with_mentions(input: AddTextAndMentionsAtInput) -> ExternResult<(ActionHash, String, Vec<WeaveNotification>)> {
  //let fn_start = sys_time()?;
  let ah = create_entry(ThreadsEntry::TextMessage(input.texto.clone()))?;
  let tp_pair = index_bead(input.texto.bead.clone(), ah.clone(), "TextMessage", input.creation_time)?;
  let _bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  //let fn_end = sys_time()?;
  //debug!("               ADD TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
  /// Add Mentions
  let mut notifs = Vec::new();
  for mentionee in input.mentionees {
    let maybe = send_inbox_item(AnnounceInput {content: ah.clone().into(), who: mentionee, event: NotifiableEvent::Mention})?;
    if let Some((_link_ah, notif)) = maybe {
      notifs.push(notif);
    }
  }
  /// Reply
  if let Some(reply_ah) = input.texto.bead.maybe_reply_of_ah.clone() {
    let reply_author = get_author(&reply_ah.clone().into())?;
    let maybe= send_inbox_item(AnnounceInput {content: ah.clone().into(), who: reply_author, event: NotifiableEvent::Reply})?;
    if let Some((_link_ah, notif)) = maybe {
      notifs.push(notif);
    }
  }
  /// Done
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), notifs))
}
