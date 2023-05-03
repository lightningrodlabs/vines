//use std::array::TryFromSliceError;
use chrono::{DateTime, Datelike, NaiveDateTime, Timelike, Utc, NaiveDate};
use hdk::{
  hash_path::path::{Component, TypedPath},
  prelude::*,
};
use zome_utils::zome_error;
use crate::path_explorer::*;


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
  //debug!("convert_component_to_i32() {:?}", component);
  let Ok(str) = String::try_from(component)
    else { return zome_error!("Failed to convert Component to string") };
  //let str = std::str::from_utf8(component.as_ref()).unwrap();
  let Ok(number) = str.parse::<i32>() else  {
    return zome_error!("Component is not i32")
  };
  Ok(number)
}


///
pub fn get_time_path(tp: TypedPath, time: Timestamp) -> ExternResult<TypedPath> {

  let (secs, ns) = time.as_seconds_and_nanos();
  let dtc = DateTime::<Utc>::from_utc(NaiveDateTime::from_timestamp_opt(secs, ns).unwrap(), Utc);
  let mut components: Vec<_> = tp.path.into();

  components.push((dtc.year() as i32).to_string().into());
  components.push((dtc.month() as i32).to_string().into());
  components.push((dtc.day() as i32).to_string().into());
  components.push((dtc.hour() as i32).to_string().into());

  let tp = TypedPath::new(tp.link_type, components.into());

  // let ts2 = convert_time_path_to_timestamp(tp.path.clone())?;
  // debug!("get_time_path() {} -> {} == {} ? | ", ts.as_seconds_and_nanos().0, time.as_seconds_and_nanos().0, ts2.as_seconds_and_nanos().0);

  Ok(tp)
}


///
pub fn timepath2anchor(tp: &TypedPath) -> String {
  let maybe_time_path = trim_to_timepath(&tp.path);
  if let Ok(time_path) = maybe_time_path {
    //debug!("timepath2str() FAILED for {:?}: {:?}", path2anchor(tp), maybe_time_path.err().unwrap());
    return path2anchor(&time_path).unwrap();
  };
  return path2anchor(&tp.path).unwrap();
}


/// Possible input:
///  - 2023
///  - 2023.4.13.12
///  - all.global.2023.4.13.12
///  - all.global.2023.4
pub fn trim_to_timepath(path: &Path) -> ExternResult<Path> {
  let components = path.as_ref();

  let mut time_comps: Vec<Component> = Vec::new();
  for comp in components {
    if let Ok(_) = convert_component_to_i32(comp) {
      time_comps.push(comp.clone());
    }
  }
  if time_comps.len() > 4 {
    return zome_error!("Not a valid timepath. Too many number components found");
  }
  if time_comps.is_empty() {
    return zome_error!("Not a valid timepath. No time component found");
  }
  Ok(Path::from(time_comps))
}


///
pub fn convert_timepath_to_timestamp(path: Path) -> ExternResult<Timestamp> {
  //debug!("convert_timepath_to_timestamp() {}", path2anchor(&path).unwrap_or("<failed>".to_string()));
  let time_comps: Vec<_> = trim_to_timepath(&path)?.into();

  let len = time_comps.len();

  let year = convert_component_to_i32(&time_comps[0])?;
  let month = if len > 1 { convert_component_to_i32(&time_comps[1])? } else { 1 };
  let day = if len > 2 { convert_component_to_i32(&time_comps[2])? } else { 1 };
  let hour = if len > 3 { convert_component_to_i32(&time_comps[3])? } else { 0 };

  //debug!("convert_timepath_to_timestamp() {}-{}-{} {}", year, month, day, hour);

  let naive = NaiveDate::from_ymd_opt(year, month as u32, day as u32)
    .unwrap()
    .and_hms_opt(hour as u32, 0,0)
    .unwrap();

  let dtc: DateTime<Utc> = DateTime::<Utc>::from_utc(naive, Utc);

  let ts = Timestamp::from_micros(dtc.timestamp_micros());
  Ok(ts)
}
