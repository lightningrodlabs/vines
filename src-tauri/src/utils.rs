use holochain_types::prelude::*;
use holochain_types::websocket::AllowedOrigins;
use tauri_plugin_holochain::NetworkConfig;
use std::collections::HashSet;
use url2::Url2;

pub const HAPP_BUNDLE_BYTES: &'static [u8] = include_bytes!("../../artifacts/vines.happ");
pub const TARGET_ARC: u32 = 0; // 1

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
   Ok(dna_hash.to_string())
}

pub async fn admin_url(can_default: bool) -> String {
   let bundle_dna_hash = get_dna_hash(happ_bundle(), "threads.dna").await.unwrap();
   return format!("admin.html?dev={}&dna={}&default={}&arc={}", tauri::is_dev(), bundle_dna_hash, can_default, TARGET_ARC);
}

/// target_arc_factor:
///  - 0 = zero arc
///  - 1 = full arc
pub fn network_config(target_arc_factor: u32) -> NetworkConfig {
   let mut network_config = NetworkConfig::default();
   // Don't use the bootstrap service on tauri dev mode
   if tauri::is_dev() {
      network_config.bootstrap_url = Url2::parse("http://0.0.0.0:8888");
   }
   // Don't hold any slice of the DHT in mobile
   if cfg!(mobile) {
      network_config.target_arc_factor = target_arc_factor;
   }
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
