use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::*;
use threads_integrity::*;
use crate::beads::*;
use crate::notify_peer::{SendInboxItemInput, NotifiableEvent, send_inbox_item, WeaveNotification};


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTextAndMentionsAtInput {
  pub texto: TextBead,
  pub creation_time: Timestamp,
  mentionees: Vec<AgentPubKey>,
}


///
#[hdk_extern]
pub fn add_text_bead_at_with_mentions(input: AddTextAndMentionsAtInput) -> ExternResult<(ActionHash, String, Vec<(AgentPubKey, WeaveNotification)>)> {
  //let fn_start = sys_time()?;
  let ah = create_entry(ThreadsEntry::TextBead(input.texto.clone()))?;
  let tp_pair = index_bead(input.texto.bead.clone(), ah.clone(), "TextBead", input.creation_time)?;
  let _bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  //let fn_end = sys_time()?;
  //debug!("               ADD TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
  /// Add Mentions
  let mut notifs = Vec::new();
  for mentionee in input.mentionees {
    let maybe = send_inbox_item(SendInboxItemInput {content: ah.clone().into(), who: mentionee.clone(), event: NotifiableEvent::Mention})?;
    if let Some((_link_ah, notif)) = maybe {
      notifs.push((mentionee, notif));
    }
  }
  /// Reply
  if let Some(reply_ah) = input.texto.bead.prev_known_bead_ah.clone() {
    let reply_author = get_author(&reply_ah.clone().into())?;
    let maybe= send_inbox_item(SendInboxItemInput {content: ah.clone().into(), who: reply_author.clone(), event: NotifiableEvent::Reply})?;
    if let Some((_link_ah, notif)) = maybe {
      notifs.push((reply_author, notif));
    }
  }
  /// Done
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), notifs))
}
