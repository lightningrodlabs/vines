use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use crate::beads::*;
use crate::path_explorer::*;
use crate::time_indexing::convert_timepath_to_timestamp;


///
#[hdk_extern]
pub fn get_text_message(ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, String)> {
  let fn_start = sys_time()?;
  let res = match get(ah.clone(), GetOptions::content())? {
    Some(record) => {
      let action = record.action().clone();
      //let eh = action.entry_hash().expect("Converting ActionHash which does not have an Entry");
      let mut msg: String = "<unknown type>".to_string();
      if let Ok(typed) = get_typed_from_record::<TextMessage>(record) {
        msg = typed.value;
      }
      Ok((action.timestamp(), action.author().to_owned(), msg))
    }
    None => zome_error!("get_text_message(): Entry not found"),
  };
  let fn_end = sys_time()?;
  debug!("GET TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
  res
}


///
#[hdk_extern]
pub fn get_many_text_message(ahs: Vec<ActionHash>) -> ExternResult<Vec<(Timestamp, AgentPubKey, String)>> {
  return ahs.into_iter().map(|ah| get_text_message(ah)).collect();
}


/// Return ActionHash, Global Time Anchor, bucket time
#[hdk_extern]
pub fn add_text_message(texto: TextMessage) -> ExternResult<(ActionHash, String, Timestamp)> {
  let ah = create_entry(ThreadsEntry::TextMessage(texto.clone()))?;
  let ah_time = sys_time()?; // FIXME: use Action's timestamp
  let tp_pair = index_bead(texto.bead, ah.clone(), "TextMessage", ah_time)?;
  let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time))
}


////////////////////////////////////////////////////////////////////////////////////////////////////
/// DEBUG ONLY

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTextMessageAtInput {
  texto: TextMessage,
  time_us: Timestamp,
}

#[hdk_extern]
pub fn add_text_message_at(input: AddTextMessageAtInput) -> ExternResult<(ActionHash, String, Timestamp)> {
  let fn_start = sys_time()?;
  let ah = create_entry(ThreadsEntry::TextMessage(input.texto.clone()))?;
  let tp_pair = index_bead(input.texto.bead, ah.clone(), "TextMessage", input.time_us)?;
  let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  let fn_end = sys_time()?;
  debug!("               ADD TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time))
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddManyTextMessageAtInput {
  texto: TextMessage,
  interval_us: u32,
  count: usize,
}

#[hdk_extern]
pub fn add_many_text_message_at(input: AddManyTextMessageAtInput) -> ExternResult<Vec<(ActionHash, String, Timestamp)>> {
  let mut start = sys_time()?.0;
  let mut res = Vec::new();
  for i in 0..input.count {
    let text = format!("{}-{}", input.texto.value, i);
    let texto = TextMessage {
      value: text,
      bead: input.texto.bead.clone(),
    };
    let ah = create_entry(ThreadsEntry::TextMessage(texto))?;
    let tp_pair = index_bead(input.texto.bead.clone(), ah.clone(), "TextMessage", Timestamp::from_micros(start.clone()))?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    res.push((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time));
    start += i64::from(input.interval_us);
  }
  Ok(res)
}
