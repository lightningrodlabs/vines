use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use crate::beads::index_bead;
use crate::path_explorer::*;


///
#[hdk_extern]
pub fn get_text_message(ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, String)> {
  return match get(ah.clone(), GetOptions::content())? {
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
}


/// Return ActionHash and Global Time Anchor
#[hdk_extern]
pub fn add_text_message(texto: TextMessage) -> ExternResult<(ActionHash, String)> {
  let ah = create_entry(ThreadsEntry::TextMessage(texto.clone()))?;
  let tp_pair = index_bead(texto.bead, ah.clone(), "TextMessage")?;
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap()))
}

