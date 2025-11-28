use holochain_types::prelude::*;
use std::path::PathBuf;
use tauri_plugin_holochain::{HolochainPluginConfig, HolochainExt, vec_to_locked, Error};
use tauri::{Manager, Url, WebviewUrl};
use argon2::{
   password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
   Argon2,
};

pub mod utils;
use utils::*;

pub const HAPP_BUNDLE_BYTES: &'static [u8] = include_bytes!("../../artifacts/vines.happ");

pub fn happ_bundle() -> AppBundle {
   return AppBundle::unpack(HAPP_BUNDLE_BYTES).expect("Failed to decode happ bundle");
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

#[tauri::command]
async fn gotoadmin(app: tauri::AppHandle) -> Result<(), String> {
   let webview = app.get_webview_window("main").unwrap();
   let url = WebviewUrl::App("admin.html".into());
   println!("CURRENT URL: {} | {}", webview.url().unwrap(), url.to_string());

   //webview.eval(globals_script(app.clone(), "", true).await).unwrap();

   // let mut capability_builder =
   //    CapabilityBuilder::new("sign-zome-call").permission("holochain:allow-sign-zome-call");
   // capability_builder = capability_builder.window(name.clone());
   // app.add_capability(capability_builder).unwrap();

   let res = webview.navigate(Url::parse("http://localhost:1420/admin.html").unwrap())
      .map_err(|e| e.to_string());

   //webview.eval(globals_script(app.clone(), "", true).await).unwrap();
   res
}


#[tauri::command]
async fn select(app: tauri::AppHandle, name: String) -> Result<String, Error> {
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
async fn install(handle: tauri::AppHandle, name: String) -> Result<String, Error> {
   println!("install app {}", name);
   let hashed_name = hash_string(&name)
      .map_err(|err| Error::OpenAppError(err))?;
   handle
      .holochain()?
      .install_app(
         name.clone(),
         happ_bundle(),
         None,
         None,
         Some(hashed_name.clone()),
      )
      .await?;
   return select(handle, name).await;
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
                     // Make sure app is enabled
                     let main_app = installed_apps.into_iter().next().unwrap();
                     println!("Only one app installed, loading it directly: {}", main_app.installed_app_id);
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
                     app.holochain()?
                        .main_window_builder(String::from("main"), true, Some(main_app.installed_app_id), /*Some(url)*/ None).await?
                        .inner_size(400.,700.)
                        .build()?;
                  },
                  _ => {
                     {
                        app.holochain()?
                           .main_window_builder(String::from("main"), true, None, Some("admin.html".to_string())).await?
                           .inner_size(400.,700.)
                           .build()?;
                     }
                     // single app mode
                     // {
                     //    handle
                     //       .holochain()?
                     //       .install_app(
                     //          "vines".to_string(),
                     //          happ_bundle(),
                     //          None,
                     //          None,
                     //          None,
                     //       )
                     //       .await?;
                     //    app.holochain()?
                     //       .main_window_builder(String::from("main"), true, Some("vines".to_string()), None).await?
                     //       .build()?;
                     // }
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


pub fn holochain_dir() -> PathBuf {
    let app_data_type = if tauri::is_dev() {
        app_dirs2::AppDataType::UserCache
    } else {
        app_dirs2::AppDataType::UserData
    };
    app_dirs2::app_root(
        app_data_type,
        &app_dirs2::AppInfo {
            name: "vines", // FIXME: append version number
            author: std::env!("CARGO_PKG_AUTHORS"),
        },
    )
    .expect("Could not get app root")
    .join("holochain")
}
