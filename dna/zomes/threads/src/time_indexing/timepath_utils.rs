use std::array::TryFromSliceError;
use chrono::{DateTime, Datelike, NaiveDateTime, Timelike, Utc};
use hdk::{
  hash_path::path::{Component, TypedPath},
  prelude::*,
};

///
pub fn get_component_from_link_tag(link: &Link) -> Result<Component, SerializedBytesError> {
  SerializedBytes::from(UnsafeBytes::from(link.tag.clone().into_inner())).try_into()
}


///
pub fn get_previous_hour_timestamp(time: Timestamp) -> Result<Timestamp, TimestampError> {
  time - std::time::Duration::from_secs(60 * 60)
}


///
pub fn get_timepath_leaf_value(path: &Path) -> ExternResult<i32> {
  let component = path.leaf().unwrap();
  return convert_component_to_i32(component);
}


// ///
// pub fn convert_component_to_i32(component: &Component) -> ExternResult<i32> {
//   let bytes: [u8; 4] = component
//     .as_ref()
//     .try_into()
//     .map_err(|e: TryFromSliceError| wasm_error!(e))
//     ?;
//   Ok(i32::from_be_bytes(bytes))
// }


///
pub fn convert_component_to_i32(component: &Component) -> ExternResult<i32> {
  let str = std::str::from_utf8(component.as_ref()).unwrap();
  Ok(str.parse::<i32>().unwrap())
}


///
pub fn append_timestamp_to_path(tp: TypedPath, time: Timestamp) -> ExternResult<TypedPath> {
  let (ms, ns) = time.as_seconds_and_nanos();
  let time = DateTime::<Utc>::from_utc(NaiveDateTime::from_timestamp(ms, ns), Utc);
  let mut components: Vec<_> = tp.path.into();

  components.push((time.year() as i32).to_string().into());
  components.push((time.month() as i32).to_string().into());
  components.push((time.day() as i32).to_string().into());
  components.push((time.hour() as i32).to_string().into());

  Ok(TypedPath::new(tp.link_type, components.into()))
}


// fn convert_i32_to_anchor_component(val: i32) -> Component {
//   let str= String::from(val).unwrap();
//   str.into()
// }
