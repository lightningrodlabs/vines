use hdk::prelude::*;
use zome_utils::zome_error;
//use zome_utils::*;
use crate::path_explorer::*;
use crate::utils::get_threads_zome_index;


/// Return any sub paths of an Anchor (an Anchor is Path of type String)
#[hdk_extern]
pub fn get_typed_children(parent_ta: TypedAnchor) -> ExternResult<Vec<TypedAnchor>> {
  let children = parent_ta.children()?;
  let children_tas = batch_convert_path_to_anchor(children)?;
  Ok(children_tas)
}

