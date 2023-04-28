use hdk::prelude::*;
use hdk::prelude::holo_hash::{holo_hash_decode_unchecked};
//use zome_utils::*;
use crate::participation_protocols::*;
use crate::path_explorer::tp_children_paths;


///
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetProtocolsInput {
  pub dna_hash: DnaHash,
  pub entry_type_name: String,
}


///
#[hdk_extern]
pub fn get_subjects_for_entry_type(input: GetProtocolsInput) -> ExternResult<Vec<AnyDhtHash>> {
  let (tp, _b64) = get_entry_type_path(input.dna_hash, &input.entry_type_name)?;
  let children = tp_children_paths(&tp)?;
  debug!("get_subjects_for_entry_type() found {} children", children.len());
  let ahs = children
    .into_iter()
    .map(|child_tp| {
      let leaf = child_tp.leaf().unwrap();
      let leaf_str = String::try_from(leaf).unwrap();
      let raw_39 = holo_hash_decode_unchecked(&leaf_str).unwrap();
      AnyDhtHash::from_raw_39(raw_39).unwrap()
    })
    .collect();
  Ok(ahs)
}


///
#[hdk_extern]
pub fn get_subjects_for_dna(dna_hash: DnaHash) -> ExternResult<Vec<AnyDhtHash>> {
  let (tp, _b64) = get_dna_path(dna_hash.clone())?;
  let children = tp_children_paths(&tp)?;
  debug!("get_subjects_for_dna() found {} children", children.len());
  let mut input = GetProtocolsInput{ dna_hash, entry_type_name: "".to_string() };
  let mut res = Vec::new();
  for child_tp in children {
    input.entry_type_name = String::try_from(child_tp.leaf().unwrap()).unwrap();
    let mut ahs = get_subjects_for_entry_type(input.clone()).unwrap();
    res.append(&mut ahs);
  }
  Ok(res)
}
