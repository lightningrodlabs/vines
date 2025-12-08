use crate::utils::*;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// WARN: Keep in sync with TS
#[derive(Serialize, Deserialize)]
pub struct MyTauriConfig {
   is_dev: bool,
   dna: String,
   happ_sha256: String,
   arc: u32,
   //can_default: bool,
}

#[tauri::command]
pub async fn get_config() -> Result<MyTauriConfig, String> {
   println!("get_config() called");
   let bundle_dna_hash = get_dna_hash(happ_bundle(), "threads.dna").await.unwrap();
   println!("get_config() response: {}", bundle_dna_hash.clone());
   Ok(MyTauriConfig {
      is_dev: tauri::is_dev(),
      dna: bundle_dna_hash,
      happ_sha256: get_happ_hash(),
      //can_default,
      arc: TARGET_ARC,
   })
}



fn get_happ_hash() -> String {
   let mut hasher = Sha256::new();
   hasher.update(HAPP_BUNDLE_BYTES);
   let happ_hash = hex::encode(hasher.finalize());
   println!("get_happ_hash() {}", happ_hash.clone());
   return happ_hash;
}