use crate::utils::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct MyTauriConfig {
   dna: String,
   arc: u32,
   //can_default: bool,
   is_dev: bool,
}

#[tauri::command]
pub async fn get_config() -> Result<MyTauriConfig, String> {
   println!("get_config() called");
   let bundle_dna_hash = get_dna_hash(happ_bundle(), "threads.dna").await.unwrap();
   println!("get_config() response: {}", bundle_dna_hash.clone());
   Ok(MyTauriConfig {
      is_dev: tauri::is_dev(),
      dna: bundle_dna_hash,
      //can_default,
      arc: TARGET_ARC,
   })
}