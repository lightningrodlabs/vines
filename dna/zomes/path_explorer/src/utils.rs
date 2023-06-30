use hdk::prelude::*;

///
pub(crate) fn get_zome_index(zome_name: &str) -> u8 {
  let threads_name = ZomeName::from(zome_name);
  let zome_names = dna_info().unwrap().zome_names;
  let mut i = 0;
  for zome_name in zome_names.into_iter() {
    if zome_name == threads_name {
      return i;
    }
    i += 1;
  }
  /// Unreachable
  let err_msg = format!("No zome with name '{}' found in dna_info", zome_name);
  panic!("{}", err_msg);
}
