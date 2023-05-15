use hdk::hdi::prelude::DnaHash;
use hdk::prelude::*;
use crate::participation_protocols::get_dna_path;
use crate::path_explorer::*;
use crate::subjects::get_subjects_by_type::{get_subjects_by_type, GetProtocolsInput};


///
#[hdk_extern]
pub fn get_subjects_for_dna(dna_hash: DnaHash) -> ExternResult<Vec<AnyLinkableHash>> {
  let (tp, _b64) = get_dna_path(dna_hash.clone())?;
  let children = tp_children_paths(&tp)?;
  debug!("get_subjects_for_dna() found {} children", children.len());
  let mut input = GetProtocolsInput { dna_hash, subject_type_name: "".to_string() };
  let mut res = Vec::new();
  for child_tp in children {
    input.subject_type_name = String::try_from(child_tp.leaf().unwrap()).unwrap();
    let mut ahs = get_subjects_by_type(input.clone()).unwrap();
    res.append(&mut ahs);
  }
  Ok(res)
}
