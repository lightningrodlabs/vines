use hdk::hash_path::path::{Component, root_hash};
use hdk::prelude::*;
//use zome_utils::*;
use crate::path_explorer::*;


/// Return all root Anchors from all Zomes
/// A RootAnchor is the the sub Anchors of the ROOT entry
#[hdk_extern]
pub fn get_all_root_anchors(_: ()) -> ExternResult<Vec<TypedAnchor>> {
  let zome_link_types = zome_info()?.zome_types.links;
  let mut res = Vec::new();
  /// Check for children for each link type
  for szt in zome_link_types.0 {
    debug!("get_all_root_anchors() {:?} | {:?}", szt.0, szt.1);
    for link_type in szt.1 {
      let links = get_links(
        root_hash()?,
        LinkTypeFilter::single_type(szt.0, link_type), // does not work: LinkTypeFilter::Dependencies(vec![zome_info()?.id]),
        None, //Some(self.make_tag()?),
      )?;
      for link in links {
        let mut tag = link.tag.0;
        let tag2 = tag.split_off(2);
        let comp: Component = tag2.clone().into();
        debug!("get_all_root_anchors() {:?} | comp: {:?} ; len = {}", link.link_type, comp, tag2.len());
        let str = String::try_from(&comp).unwrap();
        debug!("get_all_root_anchors() {:?} | {}", link.link_type, str);
        res.push(TypedAnchor::from(str, link.link_type.0));
      }
    }
  }
  debug!("get_all_root_anchors() done | found: {}\n\n", res.len());
  ///
  Ok(res)
}
