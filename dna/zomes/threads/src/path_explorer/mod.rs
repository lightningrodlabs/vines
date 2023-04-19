
mod fns;
mod path_typed_path_ext;
mod path_typed_anchor;
mod path_leaf_link;

pub use path_typed_path_ext::*;
pub use path_typed_anchor::*;
pub use path_leaf_link::*;

use hdk::hash_path::path::{Component, DELIMITER};
use hdk::prelude::{LinkTag, Path, SerializedBytesError};


/// Convert Path to string
pub fn path2str(path: &Path) -> Result<String, SerializedBytesError> {
  let mut res = String::new();
  let comps: &Vec<Component> = path.as_ref();
  for comp in comps {
    res.push_str(String::try_from(comp)?.as_str());
    res.push_str(DELIMITER);
  }
  Ok(res)
}


/// Convert Tag to string
pub fn tag2str(tag: &LinkTag) -> Result<String, SerializedBytesError> {
  let vec = tag.0[2..].to_vec();
  let comp = Component::from(vec);
  let res = String::try_from(&comp)?;
  Ok(res)
}
