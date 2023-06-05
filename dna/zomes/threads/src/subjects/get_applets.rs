use hdk::hdi::prelude::DnaHash;
use hdk::prelude::*;
use hdk::prelude::holo_hash::{hash_type, HashType, holo_hash_decode, holo_hash_encode};
use threads_integrity::{ROOT_ANCHOR_SUBJECTS, ThreadsLinkType};
use crate::participation_protocols::get_applet_path;
use crate::path_explorer::*;
use crate::subjects::get_subjects_by_type::{get_subjects_by_type, GetProtocolsInput};


/// Returns list of AppletIds that have at least one subject
#[hdk_extern]
pub fn get_applets(_:()) -> ExternResult<Vec<EntryHash>> {
  debug!("get_applets()");
  let tp = Path::from(format!("{}", ROOT_ANCHOR_SUBJECTS))
    .typed(ThreadsLinkType::SubjectPath)?;
  let children = tp_children_paths(&tp)?;
  debug!("children: {:?}", children);
  let leafs = children.into_iter()
    .map(|tp| {
      let comp = tp.leaf().unwrap();
      //debug!("comp: {:?}", comp);
      let str = String::try_from(comp).unwrap();
      debug!("str: {} | len: {}", str, str.len());
      debug!("str_bytes: {:?}", str.as_bytes());
      //let maybe_raw_hash = holo_hash_decode(hash_type::Entry.get_prefix(),
      // &str);
      let maybe_raw_hash = base64::decode_config(&str[1..], base64::URL_SAFE_NO_PAD); //remove the starting 'u' char added during string::try_from()
      debug!("raw_hash: {:?}", maybe_raw_hash);
      //let eh = EntryHash::from_raw_39(maybe_raw_hash.unwrap()).unwrap();
      let eh = EntryHash::from_raw_39(maybe_raw_hash.unwrap()).unwrap();
      debug!("eh: {:?}", eh);
      eh
    }
    )
    .collect();
  debug!("leafs: {:?}", leafs);
  Ok(leafs)
}
