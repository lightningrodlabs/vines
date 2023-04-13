use hdk::hash_path::path::{Component, DELIMITER, root_hash};
use hdk::prelude::*;
//use threads_integrity::*;
use zome_utils::*;
use crate::typed_path::tp_children_paths;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct TypedAnchor {
  pub anchor: String,
  pub link_index: u8,
}

impl TypedAnchor {
  fn new(index: u8, anchor: String) -> Self {
    TypedAnchor {link_index: index, anchor}
  }
}

pub fn ta2tp(ta: &TypedAnchor) -> TypedPath {
  TypedPath {
    link_type: ScopedZomeType {zome_index: zome_info().unwrap().id, zome_type: LinkType::from(ta.link_index)},
    path: Path::from(ta.anchor.clone()),
  }
}


/// Return all root Anchors, e.g. the children Path as String of the ROOT entry
#[hdk_extern]
pub fn get_all_root_anchors(_: ()) -> ExternResult<Vec<TypedAnchor>> {
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
        res.push(TypedAnchor::new(link.link_type.0, str));
      }
    }
  }
  debug!("get_all_root_anchors() done | found: {}\n\n", res.len());
  ///
  Ok(res)
}


/// Return all children paths of an Anchor (an Anchor is Path of String)
#[hdk_extern]
pub fn get_anchor_children(anchor: String) -> ExternResult<Vec<TypedAnchor>> {
  let root_path = Path::from(anchor.clone());
  let children_tp = get_path_children(root_path)?;
  let children_str_pair = convert_paths_to_str(children_tp)?;
  Ok(children_str_pair)
}


/// Return all sub paths of a Path
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
        continue;
      }
      debug!("get_children()  - for link '{:?}' ; found {} children", link_type, children.len());
      for child_path in children {
        res.push((link_type.0, child_path));
      }
    }
  }
  Ok(res)
}


///
pub fn convert_paths_to_str(children_tp: Vec<(u8, TypedPath)>) -> ExternResult<Vec<TypedAnchor>> {
  let mut res = Vec::new();
  for child_pair in children_tp {
    //let leaf = child_pair.1.leaf().unwrap();
    //let leaf_str = String::try_from(leaf).unwrap();
    //debug!("get_anchor_children()    - leaf: '{}' ; tag = {:?}", leaf_str, child_path.make_tag());
    let str = path2str(child_pair.1.path);
    res.push(TypedAnchor::new(child_pair.0, str));
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


/// Return all children entries from an Anchor
#[hdk_extern]
pub fn get_anchor_links(ta: TypedAnchor) -> ExternResult<Vec<LeafLink>>  {
  let tp = ta2tp(&ta);
  let lls = get_leaf_links(tp)?;
  Ok(lls)
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct LeafLink {
  pub index: u8,
  pub target: Vec<u8>,
  pub tag: Vec<u8>,
}


/// return links from a leaf Anchor for all link types
fn get_leaf_links(tp: TypedPath) -> ExternResult<Vec<LeafLink>> {
  let zome_link_types = zome_info()?.zome_types.links;
  debug!("get_leaf_links() Leaf-anchor: {:?}", tp);
  let mut res = Vec::new();
  for szt in zome_link_types.0 {
    for link_type in szt.1 {
      let links = get_links(
        tp.path_entry_hash()?,
        LinkTypeFilter::single_type(szt.0, link_type),
        None,
      )?;
      for link in links {
        debug!("get_leaf_links() LeafLink: {:?} ; tag = {:?}", link.target, link.tag);
        res.push(LeafLink {
          index: link_type.0,
          target: link.target.as_ref().to_vec(),
          tag: link.tag.as_ref().to_vec(),
        })
      }
    }
  }
  Ok(res)
}
