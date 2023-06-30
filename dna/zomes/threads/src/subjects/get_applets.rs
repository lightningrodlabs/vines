use hdk::hash_path::path::Component;
use hdk::hdi::prelude::DnaHash;
use hdk::prelude::*;
use hdk::prelude::holo_hash::error::HoloHashError;
use threads_integrity::{ROOT_ANCHOR_SUBJECTS, ThreadsLinkType};
use path_utils::*;

use crate::participation_protocols::get_applet_tp;
use crate::path_explorer::*;
use crate::subjects::get_subjects_by_type::{get_subjects_by_type, GetProtocolsInput};
use crate::utils::comp2appletId;


/// Returns list of AppletIds that have at least one subject
#[hdk_extern]
pub fn get_applets(_:()) -> ExternResult<Vec<EntryHash>> {
  //debug!("get_applets()");
  let tp = Path::from(format!("{}", ROOT_ANCHOR_SUBJECTS))
    .typed(ThreadsLinkType::SubjectPath)?;
  let children = tp_children_paths(&tp)?;
  //debug!("children: {:?}", children);
  let leafs = children.into_iter()
    .map(|tp| {
      let comp = tp.leaf().unwrap();
      //debug!("comp: {:?}", comp);
      let maybe_eh = comp2appletId(comp);
      //debug!("maybe_eh: {:?}", maybe_eh);
      maybe_eh.unwrap()
    }
    )
    .collect();
  debug!("leafs: {:?}", leafs);
  Ok(leafs)
}
