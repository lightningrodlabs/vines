use holochain_types::prelude::*;
use std::path::PathBuf;
use tauri_plugin_holochain::{HolochainExt, Error};
use tauri::{Manager, Url, WebviewUrl};
use argon2::{
   password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
   Argon2,
};
use crate::utils::*;


#[tauri::command]
pub async fn toggle_app(app: tauri::AppHandle, enable: bool, name: String) -> Result<(), Error> {
   println!("toggle app: {} -> {}", name, enable);
   // Look for happ
   let hc = &app.holochain()?.holochain_runtime;
   let admin_ws = hc.admin_websocket().await?;
   let installed_apps = admin_ws
      .list_apps(None)
      .await
      .map_err(|err| Error::ConductorApiError(err))?;
   let maybe_app_info = installed_apps.iter().find(|app| app.installed_app_id == name);
   let Some(app_info) = maybe_app_info else {
      return Err(Error::OpenAppError("App not found".to_string()));
   };
   // Enable
   if enable && app_info.status != AppStatus::Enabled {
      hc.enable_app(app_info.installed_app_id.clone()).await
         .map_err(|_err| Error::OpenAppError("Failed to enable app".to_string()))?;
      return Ok(());
   }
   // Disable
   if !enable && app_info.status == AppStatus::Enabled {
      hc.disable_app(app_info.installed_app_id.clone()).await
         .map_err(|_err| Error::OpenAppError("Failed to disable app".to_string()))?;
      return Ok(());
   }
   Ok(())
}


#[tauri::command]
pub async fn goto_admin(app: tauri::AppHandle) -> Result<(), String> {
   let webview = app.get_webview_window("main").unwrap();
   let url = WebviewUrl::App("admin.html".into());
   println!("CURRENT URL: {} | {}", webview.url().unwrap(), url.to_string());

   //webview.eval(globals_script(app.clone(), "", true).await).unwrap();

   // let mut capability_builder =
   //    CapabilityBuilder::new("sign-zome-call").permission("holochain:allow-sign-zome-call");
   // capability_builder = capability_builder.window(name.clone());
   // app.add_capability(capability_builder).unwrap();

   let res = webview.navigate(Url::parse("http://localhost:1420/admin.html").unwrap()) // FIXME
      .map_err(|e| e.to_string());

   //webview.eval(globals_script(app.clone(), "", true).await).unwrap();
   res
}


#[tauri::command]
pub async fn select(app: tauri::AppHandle, name: String) -> Result<String, Error> {
   println!("select app {}", name);
   // Look for happ
   let hc = &app.holochain()?.holochain_runtime;
   let admin_ws = hc.admin_websocket().await?;
   let installed_apps = admin_ws
      .list_apps(None)
      .await
      .map_err(|err| Error::ConductorApiError(err))?;
   let maybe_app_info = installed_apps.iter().find(|app| app.installed_app_id == name);
   let Some(app_info) = maybe_app_info else {
      return Err(Error::OpenAppError("App not found".to_string()));
   };
   // Make sure app is enabled
   if app_info.status != AppStatus::Enabled {
      hc.enable_app(app_info.installed_app_id.clone()).await?;
   }
   // Update conductor if necessary
   hc.update_app_if_necessary(name.clone(), happ_bundle()).await?;
   // Load window with params
   let (app_port, token) = get_app_socket(app.clone(), &name).await;
   let url = Url::parse(&format!("http://localhost:1420/index.html?appId={name}&appPort={app_port}&token={token}")).unwrap();
   let webview = app.get_webview_window("main").unwrap();

   // webview.eval(globals_script(app.clone(), &name, false).await).unwrap();
   // let mut capability_builder =
   //    CapabilityBuilder::new("sign-zome-call").permission("holochain:allow-sign-zome-call");
   // capability_builder = capability_builder.window(name.clone());
   // app.add_capability(capability_builder)?;

   let _ = webview.navigate(url.into())
      .map_err(|e| Error::OpenAppError(e.to_string()))?;
   Ok(name)
}


#[tauri::command]
pub async fn install(handle: tauri::AppHandle, name: String, seed: Option<String>) -> Result<String, Error> {
   println!("install app {name} | seed: {:?}", seed);
   let network_seed = match seed {
      Some(seed) => seed,
      None => hash_string(&name).map_err(|err| Error::OpenAppError(err))?,
   };

   handle
      .holochain()?
      .install_app(
         name.clone(),
         happ_bundle(),
         None,
         None,
         Some(network_seed),
      )
      .await?;
   return select(handle, name).await;
}


///
async fn get_app_socket(app: tauri::AppHandle, name: &str) -> (u16, String) {
   let hc = &app.holochain()
      .expect("Should have been able to get holochain runtime")
      .holochain_runtime;
   let app_websocket_auth = hc
      .get_app_websocket_auth(&name.to_string(), get_allowed_origins())
      .await
      .expect("Should have been able to get websocket auth for app");
   let token_vector: Vec<String> = app_websocket_auth
      .token
      .iter()
      .map(|n| n.to_string())
      .collect();
   let token = token_vector.join(",");
   (app_websocket_auth.app_websocket_port, token)
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
