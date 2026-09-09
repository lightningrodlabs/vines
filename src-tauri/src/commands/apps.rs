use holochain_types::prelude::*;
use holochain::prelude::{AppBundleSource, InstallAppPayload};
use tauri_plugin_holochain::HolochainExt;
use argon2::{
   password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
   Argon2,
};
use std::collections::HashMap;
use crate::utils::*;

/// Commands return `String` errors: the 0.7 plugin's `Error` enum has no app-level
/// variants (the old `ConductorApiError` / `OpenAppError` are gone), and it serializes
/// to its `to_string()` anyway, so the frontend sees the same shape either way.

#[tauri::command]
pub async fn select(app: tauri::AppHandle, name: String) -> Result<(u16, String), String> {
   println!("select app {}", name);
   let plugin = app.holochain().map_err(|e| e.to_string())?;
   let hc = plugin.try_runtime().map_err(|e| e.to_string())?;
   // Look for happ
   let installed_apps = hc.list_apps().await.map_err(|e| e.to_string())?;
   let maybe_app_info = installed_apps.iter().find(|app| app.installed_app_id == name);
   let Some(app_info) = maybe_app_info else {
      return Err("App not found".to_string());
   };
   // Make sure app is enabled
   if app_info.status != AppStatus::Enabled {
      hc.enable_app(app_info.installed_app_id.clone()).await.map_err(|e| e.to_string())?;
   }
   // NOTE: the 0.6 plugin's `update_app_if_necessary()` has no equivalent in the 0.7
   // runtime. Coordinator-zome hot-swapping on launch is dropped for now.
   // Return HappInfo
   let (app_port, token) = get_app_socket(app.clone(), &name).await?;
   println!("Selecting app ; app_port: {app_port}");
   Ok((app_port, token))
}


#[tauri::command]
pub async fn install(handle: tauri::AppHandle, name: String, seed: Option<String>) -> Result<(u16, String), String> {
   println!("install app {name} | seed: {:?}", seed);
   let network_seed = match seed {
      Some(seed) => seed,
      None => hash_string(&name)?,
   };

   let plugin = handle.holochain().map_err(|e| e.to_string())?;
   plugin
      .try_runtime()
      .map_err(|e| e.to_string())?
      .install_app(InstallAppPayload {
         source: AppBundleSource::Bytes(HAPP_BUNDLE_BYTES.to_vec().into()),
         agent_key: None,
         installed_app_id: Some(name.clone()),
         network_seed: Some(network_seed),
         roles_settings: Some(HashMap::new()),
         ignore_genesis_failure: false,
         restore_from_dht: false,
      })
      .await
      .map_err(|e| e.to_string())?;
   return select(handle, name).await;
}


///
async fn get_app_socket(app: tauri::AppHandle, name: &str) -> Result<(u16, String), String> {
   let plugin = app.holochain().map_err(|e| e.to_string())?;
   let hc = plugin.try_runtime().map_err(|e| e.to_string())?;
   let app_auth = hc
      .ensure_app_websocket(name.to_string())
      .await
      .map_err(|e| e.to_string())?;
   let token_vector: Vec<String> = app_auth
      .authentication
      .token
      .iter()
      .map(|n| n.to_string())
      .collect();
   let token = token_vector.join(",");
   Ok((app_auth.port, token))
}


/// Hash a string with random salt
fn hash_string(s: &str) -> Result<String, String> {
   let salt = SaltString::generate(&mut OsRng);
   let argon2 = Argon2::default();
   let pwd_hash = argon2
      .hash_password(s.as_bytes(), &salt)
      .map_err(|e| e.to_string())?;
   Ok(pwd_hash.hash.unwrap().to_string())
}
