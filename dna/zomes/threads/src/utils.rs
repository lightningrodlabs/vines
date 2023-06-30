use hdk::hash_path::path::Component;
use hdk::info::dna_info;
use hdk::prelude::{EntryHash, ExternResult, wasm_error, WasmError, ZomeName, SerializedBytesError};


///
pub(crate) fn get_Threads_zome_index() -> u8 {
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


/// For some unknown reason we get a Bad Checksum error with appletIds when using comp2hash(),
/// so we are doing the decoding manually without the checksum check here.
pub fn comp2appletId(comp: &Component) -> ExternResult<EntryHash> {
  let hash_str = String::try_from(comp)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  let str = &hash_str[1..]; //remove the starting 'u' char added during string::try_from()
  let raw_hash = base64::decode_config(str, base64::URL_SAFE_NO_PAD)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  let eh = EntryHash::from_raw_39(raw_hash)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  Ok(eh)
}

