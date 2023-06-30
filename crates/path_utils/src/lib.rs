#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]


///! Library adding helpers for manipulating links, paths & anchors

/// Copy of typed path from Holochain but with removed internal calls to `ensure()`
mod typed_path_ext;
/// Functions doing conversions between tags, components and anchors
mod conversions;

pub use typed_path_ext::*;
pub use conversions::*;
