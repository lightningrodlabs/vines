use hdk::prelude::*;
use threads_integrity::{ROOT_ANCHOR_SUBJECTS, ThreadsLinkType};
use zome_utils::*;

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
