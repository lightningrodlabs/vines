#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]
#![allow(ill_formed_attribute_input)]

mod semantic_topic;
pub(crate) mod utils;
pub mod beads;
mod participation_protocols;
mod subjects;
mod signals;
mod last_probe_log;
mod get_latest_items;
mod callbacks;
mod notify_peer;
mod notify_setting;
mod favorite;

use hdk::hdi::prelude::DnaHash;
use hdk::prelude::*;



#[hdk_extern]
fn get_zome_info(_:()) -> ExternResult<ZomeInfo> {
  return zome_info();
}


#[hdk_extern]
fn get_dna_info(_:()) -> ExternResult<DnaInfo> {
  return dna_info();
}


// #[hdk_extern]
// fn get_data_type(hash: AnyLinkableHash) -> ExternResult<String> {
//   let data_type_name = zome_utils::get_data_type(hash.clone())?;
//   if data_type_name == "App" {
//     let (name, record) = zome_utils::get_app_entry_name(hash.into_any_dht_hash().unwrap())?;
//     return Ok(name.0.into());
//   }
//   Ok(data_type_name)
// }


#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
pub struct GetDataTypeInput {
  hash: AnyLinkableHash,
  role: Option<String>,
  dna: Option<DnaHash>,
}


#[hdk_extern]
fn get_data_type(input: GetDataTypeInput) -> ExternResult<String> {
  let data_type_name = zome_utils::get_data_type(input.hash.clone())?;
  if data_type_name == "App" {
    let target = if let Some(role) = input.role {
      CallTargetCell::OtherRole(role)
    } else {
      if let Some(dna) = input.dna {
        let cell_id = CellId::new(dna, agent_info()?.agent_latest_pubkey);
        CallTargetCell::OtherCell(cell_id)
      } else {
        CallTargetCell::Local
      }
    };
    let (name, _record) = zome_utils::get_app_entry_name(input.hash.into_any_dht_hash().unwrap(), target)?;
    return Ok(name.0.into());
  }
  Ok(data_type_name)
}
