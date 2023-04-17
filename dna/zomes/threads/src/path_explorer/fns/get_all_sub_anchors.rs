use hdk::prelude::*;
use zome_utils::zome_error;
//use zome_utils::*;
use crate::path_explorer::*;
use crate::utils::get_threads_zome_index;


// /// Return all sub paths of an Anchor (an Anchor is Path of type String)
// #[hdk_extern]
// pub fn get_typed_sub_anchors(anchor: String) -> ExternResult<Vec<TypedAnchor>> {
//   let starting_path = Path::from(anchor.clone());
//   let parent_path
//   let children_str_pair = batch_convert_path_to_anchor(children)?;
//   Ok(children_str_pair)
// }
//
//


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
  debug!("get_children() root_path: {}", path2str(&root_path).unwrap());
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
        debug!("get_children()  - child_path '{}'", path2str(&child_path.path).unwrap());
        if child_path.path != root_path {
          res.push(child_path);
        }
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
    let Ok(str) = path2str(&tp.path)
      else { return zome_error!("Failed to convert Path to Anchor") };
    res.push(TypedAnchor::new(str, get_threads_zome_index(), tp.link_type.zome_type.0));
  }
  Ok(res)
}

