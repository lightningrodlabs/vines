use holochain_types::prelude::*;
use holochain_types::websocket::AllowedOrigins;
use tauri_plugin_holochain::NetworkConfig;
use std::collections::HashSet;
use url2::Url2;
use log::info;

//#[cfg(target_os = "android")]
//use android_logger;
use crate::android;

pub const HAPP_BUNDLE_BYTES: &'static [u8] = include_bytes!("../../artifacts/vines.happ");
pub const TARGET_ARC: u32 = 1; // 1 // 0

pub fn happ_bundle() -> AppBundle {
   return AppBundle::unpack(HAPP_BUNDLE_BYTES).expect("Failed to decode happ bundle");
}

pub async fn get_dna_hash(app_bundle: AppBundle, dna_name: &str) -> Result<String, String> {
   let Some(dna_bytes) = app_bundle.get_resource(&"threads.dna".to_string()) else {
      return Err(format!("'{}' not found in happ bundle", dna_name));
   };
   let dna_bundle: DnaBundle = DnaBundle::unpack(dna_bytes.as_ref()).unwrap();
   let (_dna_file, dna_hash) = dna_bundle.to_dna_file().await.unwrap();
   println!("dna hash of '{dna_name}': {}", dna_hash.to_string());
   //log::info!("dna hash of '{dna_name}': {}", dna_hash.to_string());
   Ok(dna_hash.to_string())
}


/// target_arc_factor:
///  - 0 = zero arc
///  - 1 = full arc
pub fn network_config(target_arc_factor: u32) -> NetworkConfig {
   let mut network_config = NetworkConfig::default();
   // Don't use the bootstrap service on tauri dev mode
   if tauri::is_dev() {
      let port = std::env::var("BOOT_PORT").unwrap_or_else(|_| "8888".to_string());
      network_config.bootstrap_url = Url2::parse(format!("http://127.0.0.1:{}", port));
      //network_config.bootstrap_url = Url2::parse("http://0.0.0.0:8888");
   }
   // // User-persisted config takes the highest priority
   // if let Some(user_config) = user_config {
   //    if let Some(bootstrap_url) = user_config.bootstrap_url {
   //       network_config.bootstrap_url = bootstrap_url;
   //    }
   //    if let Some(relay_url) = user_config.relay_url {
   //       network_config.relay_url = relay_url;
   //    }
   // }
   // Set custom arc on mobile
   if cfg!(mobile) {
      network_config.target_arc_factor = target_arc_factor;
   }
   println!("VINES 1 Holochain network config: {:?}", network_config);
   //#[cfg(target_os = "android")]
   //android::log(&format!("VINES 4 Holochain network config: {:?}", network_config));

   network_config
}


pub fn happ_origin(app_id: &str) -> String {
   if cfg!(any(target_os = "windows", target_os = "android")) {
      format!("http://happ.{app_id}")
   } else {
      format!("happ://{app_id}")
   }
}

pub fn main_window_origin() -> String {
   if cfg!(any(target_os = "windows", target_os = "android")) {
      "http://tauri.localhost".into()
   } else {
      "tauri://localhost".into()
   }
}


pub fn get_allowed_origins() -> AllowedOrigins {
   // Allow any when the app is build in debug mode to allow normal tauri development pointing to http://localhost:1420
   if tauri::is_dev() {
      AllowedOrigins::Any
   } else {
      let mut origins: HashSet<String> = HashSet::new();
      origins.insert(main_window_origin());
      AllowedOrigins::Origins(origins)
   }
}
