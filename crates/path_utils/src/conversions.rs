use hdk::hash_path::path::{Component, DELIMITER};
use hdk::prelude::*;
use hdk::prelude::holo_hash::{HashType, holo_hash_decode_unchecked, holo_hash_encode};


/// Convert String to LinkTag
pub fn str2tag(tag_str: &str) -> LinkTag {
  return LinkTag::new(tag_str.as_bytes().to_vec());
}


/// Convert LinkTag to String
pub fn tag2str(tag: &LinkTag) -> ExternResult<String> {
  let vec = &tag.0;
  let Ok(str) = std::str::from_utf8(vec)
    else { return Err(wasm_error!(WasmErrorInner::Guest("Failed to parse utf8 string from link tag".to_string()))) };
  Ok(str.to_string())
}


///
pub fn comp2hash<T: HashType>(comp: &Component) -> ExternResult<HoloHash<T>> {
  let hash_str = String::try_from(comp)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  let raw_hash = holo_hash_decode_unchecked(&hash_str)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  let hash = HoloHash::<T>::from_raw_39(raw_hash)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  Ok(hash)
}


///
pub fn hash2comp<T: HashType>(hash: HoloHash<T>) -> Component {
  let str = holo_hash_encode(hash.get_raw_39());
  str.into()
}


/// Convert Path to Anchor
pub fn path2anchor(path: &Path) -> Result<String, SerializedBytesError> {
  let mut res = String::new();
  let comps: &Vec<Component> = path.as_ref();
  for comp in comps {
    res.push_str(String::try_from(comp)?.as_str());
    res.push_str(DELIMITER);
  }
  Ok(res)
}


/// Convert a Component stored in a LinkTag to a String
/// TODO: Check if same as get_component_from_link_tag()
pub fn compTag2str(tag: &LinkTag) -> Result<String, SerializedBytesError> {
  if tag.0.len() <= 2 {
    return Err(SerializedBytesError::Deserialize("LinkTag not a Component".to_string()));
  }
  let vec = tag.0[2..].to_vec();
  let comp = Component::from(vec);
  let res = String::try_from(&comp)?;
  Ok(res)
}


/// Convert a Component stored in a LinkTag to a Component
pub fn compTag2tag(tag: &LinkTag) -> Component {
  let tag2 = tag.0.clone().split_off(2);
  let comp: Component = tag2.clone().into();
  comp
}
