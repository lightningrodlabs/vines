
mod fns;
mod typed_path_ext;
mod typed_anchor;
mod item_link;
mod conversions;

pub use typed_path_ext::*;
pub use typed_anchor::*;
pub use item_link::*;
pub use conversions::*;


use hdk::prelude::*;


/// Only gives values for integrity zomes of current zome.
/// Hopefully Holo will fix this and give all links types for all zomes in the dna.
pub fn dna_link_types() -> Vec<(ZomeIndex, Vec<LinkType>)> {
  debug!("dna_link_types() {:?}", dna_info().unwrap().zome_names);
  return zome_info()
    .expect("zome_info() should never fail")
    .zome_types
    .links.0;
}


/// Only gives integrity zomes for current zome.
/// Hopefully Holo will fix this and give all integrity zomes in the dna.
pub fn dna_zomes() -> Vec<ZomeIndex> {
  return dna_link_types().into_iter().map(|(zt, _lts)| zt).collect();
}
