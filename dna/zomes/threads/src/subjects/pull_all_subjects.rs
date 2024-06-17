use hdi::hash_path::path::Component;
use hdk::prelude::*;
use threads_integrity::*;
//use zome_utils::*;
use path_explorer_types::*;
use zome_utils::zome_panic_hook;
use crate::participation_protocols::comp2subject;


/// Walk Subjects AnchorTree
/// Return Anchor, EntryHash of every threaded Subject.
#[hdk_extern]
pub fn pull_all_subjects(_: ()) -> ExternResult<Vec<Subject>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let root_path = Path::from(ROOT_ANCHOR_SUBJECTS).typed(ThreadsLinkType::SubjectPath)?;
  let root_anchor = TypedAnchor::try_from(&root_path).unwrap();
  debug!("{:?}", root_anchor);
  let leaf_anchors = root_anchor.walk()?;
  debug!("{} leaf_anchors found.", leaf_anchors.len());
  /// Seperate last component from rest of Path
  let mut all = Vec::new();
  for tp in leaf_anchors {
    let path = Path::from(tp.anchor.clone());
    let comps: Vec<Component> = path.into();
    if comps.len() == 1 {
      continue;
    }
    debug!("Parsing leaf_anchor: '{}' | {:?}", tp.anchor, comps);
    //let applet_hash = comp2hash(&comps[1])?;
    let applet_id = String::try_from(&comps[1])
        .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
    let subject_type_comp = comps[2].clone();
    //let subject_hash = comp2hash(&comps[3])?;
    let (dna_hash, subject_hash) = comp2subject(&comps[3])?;

    let subject = Subject {
      hash: subject_hash.clone(),
      //hash_type: AppletSubjectType::from(subject_hash),
      type_name: std::str::from_utf8(subject_type_comp.as_ref()).unwrap().to_string(), // FIXME
      dna_hash,
      applet_id,
    };
    all.push(subject);
  }
  ///
  debug!("all {:?}", all);
  Ok(all)
}
