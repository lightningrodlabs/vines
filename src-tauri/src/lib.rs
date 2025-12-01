use holochain_types::prelude::*;
use std::path::PathBuf;
use tauri_plugin_holochain::{HolochainPluginConfig, HolochainExt, vec_to_locked, Error};
use tauri::{Manager, Url, WebviewUrl};

pub mod commands;
pub mod utils;
use utils::*;
use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![install, select, gotoadmin, toggleapp])
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

               // Check bundle validity
               let _bundle_dna_hash = hash_dna(happ_bundle(), "threads.dna").await.unwrap();

               let installed_apps = admin_ws
                  .list_apps(None)
                  .await
                  .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err))?;

               if installed_apps.len() == 1 && installed_apps[0].status == AppStatus::Enabled {
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
                  } else {
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
