use hdk::prelude::*;

use crate::*;

/// Return all children of same link-type as parent Anchor
#[hdk_extern]
pub fn get_typed_children(parent_ta: TypedAnchor) -> ExternResult<Vec<TypedAnchor>> {
  let children = parent_ta.children()?;
  let children_tas = batch_convert_path_to_anchor(children)?;
  Ok(children_tas)
}

