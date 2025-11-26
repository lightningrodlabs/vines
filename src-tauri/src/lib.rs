use holochain_types::prelude::AppBundle;
use std::path::PathBuf;
use tauri_plugin_holochain::{HolochainPluginConfig, HolochainExt, NetworkConfig, vec_to_locked};
use url2::Url2;

const APP_ID: &'static str = "vines";

pub fn happ_bundle() -> AppBundle {
    let bytes = include_bytes!("../../artifacts/vines.happ");
    return AppBundle::unpack(bytes.as_slice())
       .expect("Failed to decode vines happ");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
                  0 => {
                     app.holochain()?
                        .main_window_builder(String::from("main"), true, None, Some("first_time.html".to_string())).await?
                        .build()?;
                  },
                  1 => {
                     handle.holochain()?.update_app_if_necessary(
                        String::from(APP_ID),
                        happ_bundle()
                     ).await?;
                  },
                  _ => {
                     app.holochain()?
                        .main_window_builder(String::from("main"), true, None, Some("select_happ.html".to_string())).await?
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
            name: APP_ID,
            author: std::env!("CARGO_PKG_AUTHORS"),
        },
    )
    .expect("Could not get app root")
    .join("holochain")
}
