use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::*;
use threads_integrity::*;
use crate::beads::*;

///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AddTextWithMentionsInput {
  texto: TextMessage,
  mentionees: Vec<AgentPubKey>,
}

#[hdk_extern]
pub fn add_text_message_with_mentions(input: AddTextWithMentionsInput) -> ExternResult<(ActionHash, String, Timestamp)> {
  let tuple = add_text_message(input.texto)?;
  //let me = agent_info()?.agent_latest_pubkey;
  for mentionee in input.mentionees {
    let _ = create_link(EntryHash::from(mentionee), tuple.0.clone(), ThreadsLinkType::Mention, LinkTag::from(()))?;
  }
  Ok(tuple)
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTextAndMentionsAtInput {
  pub texto: TextMessage,
  pub creation_time: Timestamp,
  mentionees: Vec<AgentPubKey>,
}


///
#[hdk_extern]
pub fn add_text_message_at_with_mentions(input: AddTextAndMentionsAtInput) -> ExternResult<(ActionHash, String)> {
  //let fn_start = sys_time()?;
  let ah = create_entry(ThreadsEntry::TextMessage(input.texto.clone()))?;
  let tp_pair = index_bead(input.texto.bead, ah.clone(), "TextMessage", input.creation_time)?;
  let _bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  //let fn_end = sys_time()?;
  //debug!("               ADD TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
  /// Add Mentions
  for mentionee in input.mentionees {
    let _ = create_link(EntryHash::from(mentionee), ah.clone(), ThreadsLinkType::Mention, LinkTag::from(()))?;
  }
  /// Done
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap()))
}


/// Returns vec of: LinkCreateActionHash, AuthorPubKey, TextMessageActionHash
#[hdk_extern]
pub fn probe_mentions(_ : ()) -> ExternResult<Vec<(ActionHash, AgentPubKey, ActionHash)>> {
  let me = agent_info()?.agent_latest_pubkey;
  let tuples = get_typed_from_actions_links::<TextMessage>(EntryHash::from(me), ThreadsLinkType::Mention, None)?;
  let mut res = Vec::new();
  for (link_ah, link_target, from, _texto) in tuples {
    //let _ = delete_link(link_ah);
    res.push((link_ah, from, ActionHash::from(link_target)));
  }
  Ok(res)
}


/// FIXME: Make sure its a mention link
#[hdk_extern]
pub fn delete_mention(link_ah : ActionHash) -> ExternResult<()> {
  let _ = delete_link(link_ah)?;
  Ok(())
}
