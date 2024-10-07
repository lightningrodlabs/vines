use hdk::prelude::*;
use crate::participation_protocols::*;
use zome_utils::{tp_children_paths, zome_panic_hook};


///
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FindSubjectsInput {
  pub applet_id: String,
  pub subject_type: String,
}


///
#[hdk_extern]
pub fn find_subjects_by_type(input: FindSubjectsInput) -> ExternResult<Vec<(String, String, String)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let tp = get_subject_type_tp(input.applet_id, &input.subject_type)?;
  let children = tp_children_paths(&tp)?;
  debug!("found {} children", children.len());
  let ahs = children
    .into_iter()
    .map(|child_tp| {
      let leaf = child_tp.leaf().unwrap();
      comp2subject(leaf).unwrap()
      // let leaf_str = String::try_from(leaf).unwrap();
      // let raw_39 = holo_hash_decode_unchecked(&leaf_str).unwrap();
      // AnyLinkableHash::from_raw_39(raw_39).unwrap()
    })
    .collect();
  Ok(ahs)
}
