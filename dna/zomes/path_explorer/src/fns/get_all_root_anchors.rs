use hdk::hash_path::path::{root_hash};
use hdk::prelude::*;
use path_utils::*;
use crate::path_explorer::*;
use crate::utils::get_threads_zome_index;


/// Return any root Anchors from all Zomes
/// A RootAnchor is the the sub Anchors of the ROOT entry
#[hdk_extern]
pub fn get_all_root_anchors(_: ()) -> ExternResult<Vec<TypedAnchor>> {
  /// Check for children for each link type
  let links = get_links(
    root_hash()?,
    LinkTypeFilter::Dependencies(dna_zomes()),
    // LinkTypeFilter::single_type(zome_index, link_type)
    None, //Some(self.make_tag()?),
  )?;
  let mut res = Vec::new();
  for link in links {
    let str = compTag2str(&link.tag).unwrap();
    debug!("get_all_root_anchors() {:?} | {}", link.link_type, str);
    res.push(TypedAnchor::new(str, get_threads_zome_index(), link.link_type.0));
  }
  debug!("get_all_root_anchors() done | found: {}\n\n", res.len());
  ///
  Ok(res)
}
