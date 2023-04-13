use hdk::hash_path::path::{Component, DELIMITER, root_hash};
use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use crate::typed_path::tp_children_paths;

/// return all root anchors, e.g. the children of ROOT entry
#[hdk_extern]
pub fn get_all_root_anchors(_: ()) -> ExternResult<Vec<(u8, String)>> {
  let zome_link_types = zome_info()?.zome_types.links;
  let mut res = Vec::new();
  /// Check for children for each link type
  for szt in zome_link_types.0 {
    //debug!("get_all_root_anchors() {:?} | {:?}", szt.0, szt.1);
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
        res.push((link.link_type.0, str));
      }
    }
  }
  debug!("get_all_root_anchors() done | found: {}\n\n", res.len());
  ///
  Ok(res)
}


#[hdk_extern]
pub fn get_anchor_children(root_anchor: String) -> ExternResult<Vec<(u8, String)>> {
  let root_path = Path::from(root_anchor.clone());
  let children_tp = get_path_children(root_path)?;
  let children_str_pair = get_leaf_str(children_tp)?;
  Ok(children_str_pair)
}


pub fn get_leaf_str(children_tp: Vec<(u8, TypedPath)>) -> ExternResult<Vec<(u8, String)>> {
  let mut res = Vec::new();
  for child_pair in children_tp {
    //let leaf = child_pair.1.leaf().unwrap();
    //let leaf_str = String::try_from(leaf).unwrap();
    //debug!("get_anchor_children()    - leaf: '{}' ; tag = {:?}", leaf_str, child_path.make_tag());
    let str = path2str(child_pair.1.path);
    res.push((child_pair.0, str));
  }
  Ok(res)
}


/// Convert Path to string
pub fn path2str(path: Path) -> String {
  let mut res = String::new();
  let comps: Vec<Component> = path.into();
  for comp in comps {
    res.push_str(String::try_from(&comp).unwrap().as_str());
    res.push_str(DELIMITER);
  }
  res
}



/// return all sub paths of a path
pub fn get_path_children(root_path: Path) -> ExternResult<Vec<(u8, TypedPath)>> {
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
        //let mut typed_leafs = get_typed_from_leaf(root_path, scoped_link, root_path.make_tag()?)?;
        //res.append(&mut typed_leafs);
        continue;
      }
      debug!("get_children()  - for link '{:?}' ; found {} children", link_type, children.len());
      for child_path in children {
        // let leaf = child_path.leaf().unwrap();
        // let leaf_str = String::try_from(leaf).unwrap();
        // debug!("get_children()    - leaf: '{}' ; tag = {:?}", leaf_str, child_path.make_tag());
        // res.push((link_type.0, leaf_str));
        res.push((link_type.0, child_path));
      }
    }
  }
  Ok(res)
}


/// return sub paths of a root anchor of a specific link type
fn get_typed_from_leaf(child_path: TypedPath, scoped_link: ScopedZomeType<LinkType>, tag: LinkTag) -> ExternResult<Vec<(u8, Vec<u8>)>> {
  //debug!("get_leaf_children() leaf: {:?}", child_path);
  let mut res = Vec::new();
  let links = get_links(
    child_path.path_entry_hash()?,
    LinkTypeFilter::single_type(scoped_link.zome_index, scoped_link.zome_type),
    //LinkTypeFilter::Dependencies(vec![scoped_link.zome_index]),
    None, //Some(tag),
  )?;
  for link in links {
    debug!("get_leaf_children() typed_leaf: {:?} ; tag = {:?}", link.target, link.tag);
    res.push((scoped_link.zome_type.0, link.target.as_ref().to_vec()))
  }
  Ok(res)
}


/// return sub paths of a root anchor for all link types
fn get_leaf_children(child_path: TypedPath) -> ExternResult<Vec<(u8, Vec<u8>)>> {
  let zome_link_types = zome_info()?.zome_types.links;
  debug!("get_leaf_children() leaf: {:?}", child_path);
  let mut res = Vec::new();
  for szt in zome_link_types.0 {
    for link_type in szt.1 {
      let links = get_links(
        child_path.path_entry_hash()?,
        LinkTypeFilter::single_type(szt.0, link_type),
        None,
      )?;
      for link in links {
        debug!("get_leaf_children() typed_leaf: {:?} ; tag = {:?}", link.target, link.tag);
        res.push((link_type.0, link.target.as_ref().to_vec()))
      }
    }
  }
  Ok(res)
}
