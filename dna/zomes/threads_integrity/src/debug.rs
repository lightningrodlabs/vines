use chrono::{DateTime};

pub fn format_timestamp_micros(micros: i64) -> String {
   // Convert microseconds to seconds and nanoseconds
   let secs = micros / 1_000_000;
   let nanos = ((micros % 1_000_000) * 1000) as u32;

   // Create DateTime from timestamp
   let dt = DateTime::from_timestamp(secs, nanos)
      .expect("Invalid timestamp");

   // Format it nicely
   dt.format("%Y-%m-%d %H:%M:%S%.6f UTC").to_string()
}