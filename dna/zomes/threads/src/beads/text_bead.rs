use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use time_indexing::convert_timepath_to_timestamp;
use crate::beads::*;

/// Get all TextBead in local source-chain
/// WARN Will return actual action creation time and not devtest_timestamp
#[hdk_extern]
pub fn query_text_beads(_: ()) -> ExternResult<Vec<(Timestamp, ActionHash, TextBead)>> {
  let entry_type = EntryType::App(ThreadsEntryTypes::TextBead.try_into().unwrap());
  let tuples = get_all_typed_local::<TextBead>(entry_type)?;
  let res = tuples.into_iter().map(|(ah, create_action, typed)| {
    (create_action.timestamp, ah, typed)
  }).collect();
  Ok(res)
}


/// WARN Will return actual action creation time and not devtest_timestamp
#[hdk_extern]
pub fn get_text_bead(ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, TextBead)> {
  //let fn_start = sys_time()?;
  let res = match get(ah.clone(), GetOptions::content())? {
    Some(record) => {
      let action = record.action().clone();
      //let eh = action.entry_hash().expect("Converting ActionHash which does not have an Entry");
      //let mut msg: String = "<unknown type>".to_string();
      let Ok(typed) = get_typed_from_record::<TextBead>(record)
        else { return error("get_text_bead(): Entry not a TextBead") };
      Ok((action.timestamp(), action.author().to_owned(), typed))
    }
    None => error("get_text_bead(): Entry not found"),
  };
  //let fn_end = sys_time()?;
  //debug!("GET TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
  res
}


///
#[hdk_extern]
pub fn get_many_text_bead(ahs: Vec<ActionHash>) -> ExternResult<Vec<(Timestamp, AgentPubKey, TextBead)>> {
  return ahs.into_iter().map(|ah| get_text_bead(ah)).collect();
}


/// Return ActionHash, Global Time Anchor, bucket time
#[hdk_extern]
pub fn add_text_bead(texto: TextBead) -> ExternResult<(ActionHash, String, Timestamp)> {
  let ah = create_entry(ThreadsEntry::TextBead(texto.clone()))?;
  //let ah_time = sys_time()?; // FIXME: use Action's timestamp
  let ah_time = get(ah.clone(), GetOptions::content())?.unwrap().action().timestamp();
  let tp_pair = index_bead(texto.bead, ah.clone(), "TextBead", ah_time)?;
  let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time))
}


////////////////////////////////////////////////////////////////////////////////////////////////////
/// DEBUG ONLY

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddTextBeadAtInput {
  pub texto: TextBead,
  pub creation_time: Timestamp,
}

#[hdk_extern]
pub fn add_text_bead_at(input: AddTextBeadAtInput) -> ExternResult<(ActionHash, String)> {
  //let fn_start = sys_time()?;
  let ah = create_entry(ThreadsEntry::TextBead(input.texto.clone()))?;
  let tp_pair = index_bead(input.texto.bead, ah.clone(), "TextBead", input.creation_time)?;
  let _bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  //let fn_end = sys_time()?;
  //debug!("               ADD TIME: {:?} ms", (fn_end.0 - fn_start.0) / 1000);
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap()))
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddManyTextBeadAtInput {
  texto: TextBead,
  interval_us: u32,
  count: usize,
}

#[hdk_extern]
pub fn add_many_text_bead_at(input: AddManyTextBeadAtInput) -> ExternResult<Vec<(ActionHash, String, Timestamp)>> {
  let mut start = sys_time()?.0;
  let mut res = Vec::new();
  for i in 0..input.count {
    let text = format!("{}-{}", input.texto.value, i);
    let texto = TextBead {
      value: text,
      bead: input.texto.bead.clone(),
    };
    let ah = create_entry(ThreadsEntry::TextBead(texto))?;
    let tp_pair = index_bead(input.texto.bead.clone(), ah.clone(), "TextBead", Timestamp::from_micros(start.clone()))?;
    let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
    res.push((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time));
    start += i64::from(input.interval_us);
  }
  Ok(res)
}
