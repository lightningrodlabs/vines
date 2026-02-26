use hdk::prelude::*;
use zome_utils::*;
use zome_path::*;
use crate::participation_protocols::get_applet_tp;
use crate::subjects::find_subjects_by_type::*;


///
#[hdk_extern]
pub fn find_subjects_for_applet(applet_id: String) -> ExternResult<Vec<(String, String, String)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  if applet_id.is_empty() {
    return error("Empty applet_id");
  }
  let tp = get_applet_tp(applet_id.clone())?;
  let children = tp_children_paths(&tp, GetStrategy::Local)?;
  debug!("find_subjects_for_applet() found {} children", children.len());
  let mut input = FindSubjectsInput { applet_id, subject_type: "".to_string(), strategy: GetStrategy::Local };
  let mut res = Vec::new();
  for child_tp in children {
    input.subject_type = String::try_from(child_tp.leaf().unwrap()).unwrap();
    let mut ahs = find_subjects_by_type(input.clone()).unwrap();
    res.append(&mut ahs);
  }
  debug!("find_subjects_for_applet() res: {:?}", res);
  Ok(res)
}


/// Returns a list of SubjectTypes and their PathEntryHash
#[hdk_extern]
pub fn pull_subject_types_for_applet(pair: (String, GetStrategy)) -> ExternResult<Vec<(String, EntryHash)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  if pair.0.is_empty() {
    return error("Empty applet_id");
  }
  let tp = get_applet_tp(pair.0.clone())?;
  let children = tp_children_paths(&tp, pair.1)?;
  debug!("get_subject_types_for_dna() found {} children", children.len());
  let leafs = children.into_iter()
    .map(|tp| (tp.leaf().unwrap().try_into().unwrap(), tp.path.path_entry_hash().unwrap()))
    .collect();
  Ok(leafs)
}

