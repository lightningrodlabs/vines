use holochain_types::prelude::*;
use std::path::PathBuf;
use tauri_plugin_holochain::{HolochainPluginConfig, HolochainExt, vec_to_locked};
use tauri::{Listener, Manager, AppHandle, Runtime};
use tauri_plugin_log::{Target, TargetKind};

pub mod commands;
pub mod utils;

use utils::*;
use commands::*;

//#[cfg(target_os = "android")]
//use android_logger;
//
// #[cfg(target_os = "android")]
// mod android {
//    use std::ffi::CString;
//
//    extern "C" {
//       fn __android_log_write(prio: i32, tag: *const i8, text: *const i8) -> i32;
//    }
//
//    pub fn log(msg: &str) {
//       let tag = CString::new("VinesTauri").unwrap();
//       let msg = CString::new(msg).unwrap();
//       unsafe {
//          __android_log_write(4, tag.as_ptr() as *const i8, msg.as_ptr() as *const i8); // 4 = INFO
//       }
//    }
// }


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![install, select, decode_qr_code, get_config])
        .plugin(
            tauri_plugin_log::Builder::default()
                 .targets([
                    Target::new(TargetKind::Stdout),
                    //Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                 ])
                .level(log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_holochain::async_init(
            vec_to_locked(vec![]),
            HolochainPluginConfig::new(holochain_dir(), network_config(TARGET_ARC))
        ))
        .setup(|app| {
           let handle = app.handle().clone();
           let handle_fail = app.handle().clone();

           //#[cfg(target_os = "android")]
           //android::log("VINES Hello from Rust!");

           println!("Holochain plugin setup start");

           app.handle()
              .listen("holochain://setup-failed", move |event| {
                 println!("Holochain setup failed: {:?}", event);
                 handle_fail.exit(1);
              });
            app.handle()
               .listen("holochain://setup-completed", move |event| {
                 //println!("Holochain plugin setup completed: {:?}", event);
                 let handle = handle.clone();
                 tauri::async_runtime::spawn(async move {
                    let Ok(admin_ws) = handle.clone().holochain().expect("Holochain failed to initialize").admin_websocket().await else {
                       eprintln!("Failed to setup Holochain.");
                       return;
                    };
                    let Ok(installed_apps) = admin_ws
                       .list_apps(None)
                       .await
                       .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err)) else {
                       eprintln!("Failed to list installed apps.");
                       return;
                    };
                    println!("Installed Vines apps: {}", installed_apps.len());
                    let one_happ_mode = installed_apps.len() == 1 && installed_apps[0].status == AppStatus::Enabled;

                    let res = async {
                       let mut main_window = if one_happ_mode {
                              // Make sure app is enabled
                              let main_app = installed_apps.into_iter().next().unwrap();
                              println!("Only one app installed, loading it directly: {}", main_app.installed_app_id);
                              if main_app.status != AppStatus::Enabled {
                                 println!("Enabling app: {}", main_app.installed_app_id);
                                 handle.holochain()?.holochain_runtime.enable_app(main_app.installed_app_id.clone()).await?;
                              }
                              //
                              handle.clone().holochain()?.update_app_if_necessary(
                                 String::from(main_app.installed_app_id.clone()),
                                 happ_bundle()
                              ).await?;
                              // Load window
                              handle.holochain()?
                                 .main_window_builder(String::from("main"), true, Some(main_app.installed_app_id), /*Some(url)*/ None).await?
                                 //.inner_size(360.,800.)
                                 //.build()?;
                       } else {
                          {
                             handle.holochain()?
                                .main_window_builder(String::from("main"), true, None, None).await?
                               //.main_window_builder(String::from("main"), true, None, Some(admin_url(true).await)).await?
                               //.inner_size(360.,800.)
                               //.build()?;
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
                       };
                       #[cfg(desktop)]
                       {
                          main_window = main_window.title(String::from("Vines"));
                       }
                       main_window.build().map_err(|e| anyhow::anyhow!("{e:?}"))?;
                       Ok::<(), anyhow::Error>(())
                    }.await;

                    match res {
                       Ok(()) => {
                          // Tauri's builtin splashscreen handling is desktop only
                           #[cfg(desktop)]
                           {
                              if let Some(splashscreen) = handle.get_webview_window("splashscreen") {
                                 let _ = splashscreen.close();
                              }
                           }
                       }
                       Err(e) => {
                           eprintln!("Failed to open main window: {:?}", e);
                       }
                    }
                 }); // block_on
                 //Ok(())
              });
              Ok(())
           }) // setup done
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
