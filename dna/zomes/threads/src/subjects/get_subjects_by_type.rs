use hdk::hdi::prelude::DnaHash;
use hdk::prelude::*;
use hdk::prelude::holo_hash::{holo_hash_decode_unchecked};
//use zome_utils::*;
use crate::participation_protocols::*;
use crate::path_explorer::tp_children_paths;


///
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetProtocolsInput {
  pub applet_id: EntryHash,
  pub subject_type: String,
}


///
#[hdk_extern]
pub fn get_subjects_by_type(input: GetProtocolsInput) -> ExternResult<Vec<AnyLinkableHash>> {
  let (tp, _b64) = get_subject_type_path(input.applet_id, &input.subject_type)?;
  let children = tp_children_paths(&tp)?;
  debug!("found {} children", children.len());
  let ahs = children
    .into_iter()
    .map(|child_tp| {
      let leaf = child_tp.leaf().unwrap();
      let leaf_str = String::try_from(leaf).unwrap();
      let raw_39 = holo_hash_decode_unchecked(&leaf_str).unwrap();
      AnyLinkableHash::from_raw_39(raw_39).unwrap()
    })
    .collect();
  Ok(ahs)
}
