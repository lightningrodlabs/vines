use hdk::info::dna_info;
use hdk::prelude::ZomeName;

pub(crate) fn get_threads_zome_index() -> u8 {
  let threads_name = ZomeName::from("threads_integrity");
  let zome_names = dna_info().unwrap().zome_names;
  let mut i = 0;
  for zome_name in zome_names.into_iter() {
    if zome_name == threads_name {
      return i;
    }
    i += 1;
  }
  /// Unreachable
  panic!("Threads zome_index not found in dna_info. Check integrity zome name.");
}
