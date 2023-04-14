
mod path_get_all;
mod path_typed_path_ext;
mod path_typed_anchor;
mod path_leaf_link;

pub use path_get_all::*;
pub use path_typed_path_ext::*;
pub use path_typed_anchor::*;
pub use path_leaf_link::*;

use hdk::hash_path::path::{Component, DELIMITER};
use hdk::prelude::{Path, SerializedBytesError};


/// Convert Path to string
pub fn path2str(path: Path) -> Result<String, SerializedBytesError> {
  let mut res = String::new();
  let comps: Vec<Component> = path.into();
  for comp in comps {
    res.push_str(String::try_from(&comp)?.as_str());
    res.push_str(DELIMITER);
  }
  Ok(res)
}
