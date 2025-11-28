use holochain_types::websocket::AllowedOrigins;
use tauri_plugin_holochain::NetworkConfig;
use std::collections::HashSet;
use url2::Url2;

pub fn network_config() -> NetworkConfig {
   let mut network_config = NetworkConfig::default();
   // Don't use the bootstrap service on tauri dev mode
   if tauri::is_dev() {
      network_config.bootstrap_url = Url2::parse("http://0.0.0.0:8888");
   }
   // Don't hold any slice of the DHT in mobile
   if cfg!(mobile) {
      network_config.target_arc_factor = 0;
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