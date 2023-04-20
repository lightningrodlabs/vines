use hdk::prelude::*;
use holo_hash::DnaHashB64;
use zome_utils::*;
use threads_integrity::*;
use crate::threads::prefix_threads_path;


/// TODO: should be AnyLinkableHash once hc-client-js has defined it
#[hdk_extern]
pub fn get_threads(lh: AnyDhtHash) -> ExternResult<Vec<ActionHash>> {
  let links = get_links(lh, ThreadsLinkType::Threads, None)?;
  let ahs = links
    .into_iter()
    .map(|l| { ActionHash::from(l.target) })
    .collect();
  Ok(ahs)
}


///
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetProtocolsInput {
  dna_hash: DnaHashB64,
  entry_name: String,
}


///
#[hdk_extern]
pub fn get_protocols_for_app_entry_type(input: GetProtocolsInput) -> ExternResult<Vec<ActionHash>> {
  let prefix_path = prefix_threads_path(input.dna_hash, Some(&input.entry_name))?;
  let links = get_links(prefix_path.path_entry_hash()?, ThreadsLinkType::Protocols, None)?;
  let ahs = links
    .into_iter()
    .map(|l| { ActionHash::from(l.target) })
    .collect();
  Ok(ahs)
}


///
#[hdk_extern]
pub fn get_protocols_for_app(dna_hash: DnaHashB64) -> ExternResult<Vec<ActionHash>> {
  let prefix_path = prefix_threads_path(dna_hash, None)?;
  let children = prefix_path.children_paths()?;
  debug!("get_protocols_for_app() found {} children", children.len());
  let mut res = Vec::new();
  for child_path in children {
    let links = get_links(child_path.path_entry_hash()?, ThreadsLinkType::Protocols, None)?;
    let mut ahs = links
      .into_iter()
      .map(|l| { ActionHash::from(l.target) })
      .collect();
    res.append(&mut ahs);
  }
  Ok(res)
}
