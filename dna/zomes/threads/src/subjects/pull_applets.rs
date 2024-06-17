use hdk::prelude::*;
use threads_integrity::{ROOT_ANCHOR_SUBJECTS, ThreadsLinkType};
use zome_utils::*;


/// Returns list of AppletIds that have at least one subject
#[hdk_extern]
pub fn pull_applets(_:()) -> ExternResult<Vec<String>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  debug!("get_applets()");
  let tp = Path::from(format!("{}", ROOT_ANCHOR_SUBJECTS))
    .typed(ThreadsLinkType::SubjectPath)?;
  let children = tp_children_paths(&tp)?;
  debug!("children: {:?}", children);
  let mut appletIds = Vec::new();
  for tp in children {
    let comp = tp.leaf().unwrap();
    //debug!("comp: {:?}", comp);
    let appletId = String::try_from(comp)
          .map_err(|e| wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
    //let appletId = comp2appletHash(comp)?;
    debug!("appletId: {:?}", appletId);
    appletIds.push(appletId);
  };
  debug!("appletIds: {:?}", appletIds);
  Ok(appletIds)
}
