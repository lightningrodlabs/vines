use hdk::hash_path::path::{Component, root_hash};
use hdk::prelude::*;
use zome_utils::zome_error;
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
        res.push(TypedAnchor::from(link.link_type.0, str));
      }
    }
  }
  debug!("get_all_root_anchors() done | found: {}\n\n", res.len());
  ///
  Ok(res)
}


/// Return all sub paths of an Anchor (an Anchor is Path of type String)
#[hdk_extern]
pub fn get_all_sub_anchors(anchor: String) -> ExternResult<Vec<TypedAnchor>> {
  let root_path = Path::from(anchor.clone());
  let children = get_all_sub_paths(root_path)?;
  let children_str_pair = batch_convert_path_to_anchor(children)?;
  Ok(children_str_pair)
}


/// Return all sub paths of a Path
pub fn get_all_sub_paths(root_path: Path) -> ExternResult<Vec<TypedPath>> {
  let zome_link_types = zome_info()?.zome_types.links;
  debug!("get_children() root_path: {:?}", root_path);
  let mut res = Vec::new();
  /// Check for children for each link type
  for szt in zome_link_types.0 {
    for link_type in szt.1 {
      let scoped_link = ScopedZomeType {
        zome_index: szt.0,
        zome_type: link_type,
      };
      let root_tp = root_path.clone().typed(scoped_link)?;
      let maybe_children = tp_children_paths(&root_tp);
      let Ok(children) = maybe_children
        else { continue };
      if children.is_empty() {
        continue;
      }
      debug!("get_children()  - for link '{:?}' ; found {} children", link_type, children.len());
      for child_path in children {
        res.push(child_path);
      }
    }
  }
  Ok(res)
}


///
pub fn batch_convert_path_to_anchor(tps: Vec<TypedPath>) -> ExternResult<Vec<TypedAnchor>> {
  let mut res = Vec::new();
  for tp in tps {
    //let leaf = child_pair.1.leaf().unwrap();
    //let leaf_str = String::try_from(leaf).unwrap();
    //debug!("get_anchor_children()    - leaf: '{}' ; tag = {:?}", leaf_str, child_path.make_tag());
    let Ok(str) = path2str(tp.path)
      else { return zome_error!("Failed to convert Path to Anchor") };
    res.push(TypedAnchor::from(tp.link_type.zome_type.0, str));
  }
  Ok(res)
}

