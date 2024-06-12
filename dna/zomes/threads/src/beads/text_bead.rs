use hdk::prelude::*;
//use zome_utils::*;
use crate::beads::*;
use threads_integrity::*;
use time_indexing::convert_timepath_to_timestamp;
use crate::notifications::*;

/// Return ActionHash, Global Time Anchor, bucket time
#[hdk_extern]
#[feature(zits_blocking)]
pub fn add_text_bead(texto: TextBead) -> ExternResult<(ActionHash, String, Timestamp)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let ah = create_entry(ThreadsEntry::TextBead(texto.clone()))?;
  //let ah_time = sys_time()?; // FIXME: use Action's timestamp
  let ah_time = get(ah.clone(), GetOptions::network())?.unwrap().action().timestamp();
  let tp_pair = index_bead(texto.bead, ah.clone(), "TextBead", ah_time)?;
  let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time))
}


///
#[hdk_extern]
pub fn get_text_bead_option(ah: ActionHash) -> ExternResult<Option<(Timestamp, AgentPubKey, TextBead)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  return Ok(get_typed_bead::<TextBead>(ah).ok());
}


///
#[hdk_extern]
pub fn get_text_bead(ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, TextBead)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  return get_typed_bead::<TextBead>(ah);
}


///
#[hdk_extern]
pub fn get_many_text_bead(ahs: Vec<ActionHash>) -> ExternResult<Vec<(Timestamp, AgentPubKey, TextBead)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  return ahs.into_iter().map(|ah| get_typed_bead::<TextBead>(ah)).collect();
}





////////////////////////////////////////////////////////////////////////////////////////////////////
/// DEBUG ONLY

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTextBeadAtInput {
  pub text_bead: TextBead,
  pub creation_time: Timestamp,
}

#[hdk_extern]
#[feature(zits_blocking)]
pub fn add_text_bead_at(input: AddTextBeadAtInput) -> ExternResult<(ActionHash, String)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  //let fn_start = sys_time()?;
  let ah = create_entry(ThreadsEntry::TextBead(input.text_bead.clone()))?;
  let tp_pair = index_bead(input.text_bead.bead, ah.clone(), "TextBead", input.creation_time)?;
  let _bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  //let fn_end = sys_time()?;
  //debug!("               ADD TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap()))
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddManyTextBeadAtInput {
  text_bead: TextBead,
  interval_us: u32,
  count: usize,
}

#[hdk_extern]
#[feature(zits_blocking)]
pub fn add_many_text_bead_at(input: AddManyTextBeadAtInput) -> ExternResult<Vec<(ActionHash, String, Timestamp)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let mut start = sys_time()?.0;
  let mut res = Vec::new();
  for i in 0..input.count {
    let text = format!("{}-{}", input.text_bead.value, i);
    let texto = TextBead {
      value: text,
      bead: input.text_bead.bead.clone(),
    };
    let ah = create_entry(ThreadsEntry::TextBead(texto))?;
    let tp_pair = index_bead(input.text_bead.bead.clone(), ah.clone(), "TextBead", Timestamp::from_micros(start.clone()))?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    res.push((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time));
    start += i64::from(input.interval_us);
  }
  Ok(res)
}



#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTextAtAndNotifyInput {
  pub text_bead: TextBead,
  pub creation_time: Timestamp,
  pub mentionees: Vec<AgentPubKey>,
  pub can_notify_reply: bool,
}


/// Notifications must be sent out at the same validation step as a Bead is committed
#[hdk_extern]
#[feature(zits_blocking)]
pub fn add_text_bead_at_and_notify(input: AddTextAtAndNotifyInput) -> ExternResult<(ActionHash, String)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  //let fn_start = sys_time()?;
  let ah = create_entry(ThreadsEntry::TextBead(input.text_bead.clone()))?;
  let tp_pair = index_bead(input.text_bead.bead.clone(), ah.clone(), "TextBead", input.creation_time)?;
  let _bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  //let fn_end = sys_time()?;
  //debug!("               ADD TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
  /// Notify Mentions
  for mentionee in input.mentionees {
    let _maybe = notify_peer(NotifyPeerInput {content: ah.clone().into(), who: mentionee.clone(), event: NotifiableEvent::Mention})?;
  }
  /// Reply
  if input.can_notify_reply {
    if input.text_bead.bead.pp_ah != input.text_bead.bead.prev_bead_ah.clone() {
      let reply_author = get_author(&input.text_bead.bead.prev_bead_ah.clone().into())?;
      let _maybe = notify_peer(NotifyPeerInput { content: ah.clone().into(), who: reply_author.clone(), event: NotifiableEvent::Reply})?;
    }
  }
  /// Done
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap()))
}
