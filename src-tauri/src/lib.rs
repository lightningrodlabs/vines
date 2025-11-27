use holochain_types::prelude::*;
use std::path::PathBuf;
use tauri_plugin_holochain::{HolochainPluginConfig, HolochainExt, NetworkConfig, vec_to_locked, Error};
use url2::Url2;
use tauri::{Manager, Url};

use argon2::{
   password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
   Argon2,
};

pub const HAPP_BUNDLE_BYTES: &'static [u8] = include_bytes!("../../artifacts/vines.happ");

pub fn happ_bundle() -> AppBundle {
   return AppBundle::unpack(HAPP_BUNDLE_BYTES).expect("Failed to decode happ bundle");
}

// Hash a string with random salt
fn hash_string(s: &str) -> Result<String, String> {
   let salt = SaltString::generate(&mut OsRng);
   let argon2 = Argon2::default();
   let hash = argon2
      .hash_password(s.as_bytes(), &salt)
      .map_err(|e| e.to_string())?
      .to_string();
   Ok(hash)
}

#[tauri::command]
async fn gotoadmin(app: tauri::AppHandle) -> Result<(), String> {
   let webview = app.get_webview_window("main").unwrap();
   return webview.navigate(Url::parse("admin.html").unwrap())
      .map_err(|e| e.to_string());
}


#[tauri::command]
async fn select(app: tauri::AppHandle, name: String) -> Result<String, Error> {
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
   if app_info.status != AppStatus::Enabled {
      hc.enable_app(app_info.installed_app_id.clone()).await?;
   }
   hc.update_app_if_necessary(name.clone(), happ_bundle())
      .await?;
   let url = Url::parse(&format!("index.html?appId={}", name)).unwrap();
   let webview = app.get_webview_window("main").unwrap();
   webview.navigate(url.into())
      .map_err(|e| e.to_string());
   Ok(name)
}

#[tauri::command]
async fn install(handle: tauri::AppHandle, name: String) -> Result<String, Error> {
   let hashed_name = hash_string(&name)
      .map_err(|err| Error::OpenAppError(err))?;
   handle
      .holochain()?
      .install_app(
         name,
         happ_bundle(),
         None,
         None,
         Some(hashed_name.clone()),
      )
      .await?;
   Ok(hashed_name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![install, select, gotoadmin])
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_holochain::init(
            vec_to_locked(vec![]),
            HolochainPluginConfig::new(holochain_dir(), network_config())
        ))
        .setup(|app| {
            let handle = app.handle().clone();
            let result: anyhow::Result<()> = tauri::async_runtime::block_on(async move {
               let admin_ws = handle.holochain()?.admin_websocket().await?;

               let installed_apps = admin_ws
                  .list_apps(None)
                  .await
                  .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err))?;

               match installed_apps.len() {
                  1 => {
                     println!("Only one app installed, loading it directly");
                     // Make sure app is enabled
                     let main_app = installed_apps.into_iter().next().unwrap();
                     if main_app.status != AppStatus::Enabled {
                        println!("Enabling app {} !!!!!", main_app.installed_app_id);
                        app.holochain()?.holochain_runtime.enable_app(main_app.installed_app_id.clone()).await?;
                     }
                     //
                     handle.holochain()?.update_app_if_necessary(
                        String::from(main_app.installed_app_id.clone()),
                        happ_bundle()
                     ).await?;
                     // Load window
                     let url = format!("index.html?appId={}", main_app.installed_app_id).to_string();
                     app.holochain()?
                        .main_window_builder(String::from("main"), false, Some(main_app.installed_app_id), Some(url)).await?
                        .build()?;
                  },
                  _ => {
                     app.holochain()?
                        .main_window_builder(String::from("main"), true, None, Some("admin.html".to_string())).await?
                        .build()?;
                  },
               }
                Ok(())
            });

            result?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}



fn network_config() -> NetworkConfig {
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

fn holochain_dir() -> PathBuf {
    let app_data_type = if tauri::is_dev() {
        app_dirs2::AppDataType::UserCache
    } else {
        app_dirs2::AppDataType::UserData
    };

    app_dirs2::app_root(
        app_data_type,
        &app_dirs2::AppInfo {
            name: "vines",
            author: std::env!("CARGO_PKG_AUTHORS"),
        },
    )
    .expect("Could not get app root")
    .join("holochain")
}
