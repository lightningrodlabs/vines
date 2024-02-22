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

use hdk::prelude::*;


#[hdk_extern]
fn get_zome_info(_:()) -> ExternResult<ZomeInfo> {
  return zome_info();
}


#[hdk_extern]
fn get_dna_info(_:()) -> ExternResult<DnaInfo> {
  return dna_info();
}
