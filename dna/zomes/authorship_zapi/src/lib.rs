#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]


mod api;
pub use api::*;

use std::fmt::Debug;
use hdk::prelude::*;

/// Helper function for calling the zome via inter-zome call
pub fn call_authorship_zome<I: Serialize + Debug>(fn_name: &str, payload: I) -> ExternResult<ZomeCallResponse> {
   return call(
      CallTargetCell::Local,
      "zAuthorship",
      fn_name.to_string().into(),
      None,
      payload,
   );
}


/// Helper function for calling the zome via inter-zome call.
/// Use when 'call' is not allowed. ex: during a post_commit()
pub fn call_remote_authorship_zome<I: Serialize + Debug>(fn_name: &str, payload: I) -> ExternResult<ZomeCallResponse> {
   return call_remote(
      agent_info()?.agent_latest_pubkey,
      "zAuthorship",
      fn_name.to_string().into(),
      None,
      payload,
   );
}


// ////
// pub fn call_authorship_post_commit(signedActionList: Vec<SignedActionHashed>) -> ExternResult<()> {
//    let zome_names = dna_info()?.zome_names;
//    /// Process each Action and look for an AppEntry from delivery_zome
//    for signedAction in signedActionList {
//       let action = signedAction.action();
//       if action.entry_type().is_none() {
//          continue;
//       }
//       let (_eh, entry_type) = action.entry_data().unwrap();
//       if let EntryType::App(app_entry_def) = entry_type {
//          let zome_index: usize = app_entry_def.zome_index.0.into();
//          let zome_name: &str = &zome_names[zome_index].0;
//          //debug!(" >> post_commit() called for a {}", zome_name);
//          if zome_name == DELIVERY_INTERGRITY_ZOME_NAME {
//             //debug!("its for zome_delivery_integrity {:?}", app_entry_def.entry_index);
//             let response = call_remote_delivery_zome(
//                "post_commit",
//                vec![signedAction],
//             )?;
//             //debug!("post_commit() response: {:?}", response);
//             decode_response::<()>(response)?;
//          }
//       }
//    }
//    Ok(())
// }
