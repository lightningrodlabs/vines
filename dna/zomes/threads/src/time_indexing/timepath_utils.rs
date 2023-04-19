use std::array::TryFromSliceError;
use chrono::{DateTime, Datelike, NaiveDateTime, Timelike, Utc, NaiveDate};
use hdk::{
  hash_path::path::{Component, TypedPath},
  prelude::*,
};
use zome_utils::zome_error;

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
  Ok(str.parse::<i32>().unwrap())
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


// fn convert_i32_to_anchor_component(val: i32) -> Component {
//   let str= String::from(val).unwrap();
//   str.into()
// }


///
pub fn convert_time_path_to_timestamp(path: Path) -> ExternResult<Timestamp> {

  //debug!("convert_time_path_to_timestamp() {:?}", path);

  let components: Vec<_> = path.into();
  let len = components.len();
  if len < 4 {
    return zome_error!("Not a valid timepath");
  }
  let time_comps = &components[(len-4)..];

  //debug!("convert_time_path_to_timestamp() time_comps {:?}", time_comps);

  let year = convert_component_to_i32(&time_comps[0])?;
  let month = convert_component_to_i32(&time_comps[1])?;
  let day = convert_component_to_i32(&time_comps[2])?;
  let hour = convert_component_to_i32(&time_comps[3])?;

  debug!("convert_time_path_to_timestamp() {}-{}-{} {}", year, month, day, hour);

  let naive = NaiveDate::from_ymd_opt(year, month as u32, day as u32)
    .unwrap()
    .and_hms_opt(hour as u32, 0,0)
    .unwrap();

  let dtc: DateTime<Utc> = DateTime::<Utc>::from_utc(naive, Utc);

  let ts = Timestamp::from_micros(dtc.timestamp_micros());
  Ok(ts)
}
