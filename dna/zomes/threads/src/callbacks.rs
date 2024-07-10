use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use zome_signals::*;


#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
   let mut fns = BTreeSet::new();
   fns.insert((zome_info()?.name, FunctionName("recv_remote_signal".into())));
   let cap_grant_entry: CapGrantEntry = CapGrantEntry::new(
      String::from("remote signals"), // A string by which to later query for saved grants.
      ().into(), // Unrestricted access means any external agent can call the extern
      GrantedFunctions::Listed(fns),
   );
   create_cap_grant(cap_grant_entry)?;
   /// Done
   Ok(InitCallbackResult::Pass)
}


///-------------------------------------------------------------------------------------------------
/// post-commit
///-------------------------------------------------------------------------------------------------

///
#[hdk_extern(infallible)]
fn post_commit(signedActionList: Vec<SignedActionHashed>) {
   debug!("THREADS post_commit() called for {} actions. ({})", signedActionList.len(), zome_info().unwrap().id);
   std::panic::set_hook(Box::new(zome_panic_hook));
   /// Process each Action
   for sah in signedActionList {
      // debug!(" - {}", sah.action());
      let ah = sah.action_address().to_owned();
      match sah.action() {
         ///
         Action::DeleteLink(delete_link) => {
            let Ok(Some(record)) = get(delete_link.link_add_address.clone(), GetOptions::local())
              else { error!("Failed to get CreateLink action"); continue };
            let Action::CreateLink(create_link) = record.action()
              else { error!("Record should be a CreateLink"); continue };
            let res = emit_link_delete_signal(delete_link, create_link, true);
            if let Err(e) = res {
               error!("Emitting DeleteLink signal failed: {:?}", e);
            }
         },
         ///
         Action::CreateLink(create_link) => {
            let Ok(Some(link_type)) = ThreadsLinkType::from_type(create_link.zome_index, create_link.link_type)
              else { error!("CreateLink should have a LinkType. Could be a Link from a different zome: {} ({})", create_link.link_type.0, create_link.zome_index); continue };
            //let _ = emit_system_signal(SystemSignalProtocol::PostCommitStart { entry_type: link_type.clone() });
            debug!("CreateLink: {:?} ({}, {:?})", link_type, create_link.zome_index, create_link.link_type);
            let res = emit_link_create_signal(ah, create_link, true);
            if let Err(e) = res {
               error!("Emitting CreateLink signal failed: {:?}", e);
            }
            //let _ = emit_system_signal(SystemSignalProtocol::PostCommitEnd { entry_type: link_type, succeeded: result.is_ok() });

         },
         /// NewEntryAction
         Action::Update(_) |
         Action::Create(_) => {
            let EntryType::App(app_entry_def) = sah.action().entry_type().unwrap()
              else { continue };
            let type_variant = entry_index_to_variant(app_entry_def.entry_index).unwrap();
            /// Emit System Signal
            let variant_name = format!("{:?}", type_variant);
            let _ = emit_system_signal(SystemSignalProtocol::PostCommitNewStart { app_entry_type: variant_name.clone() });
            /// Emit Entry Signal
            let result = emit_new_entry(sah.clone());
            /// Emit System Signal
            let _ = emit_system_signal(SystemSignalProtocol::PostCommitNewEnd { app_entry_type: variant_name, succeeded: result.is_ok() });
            ///
            if let Err(e) = result {
               error!("<< post_commit() failed: {:?}", e);
            } else {
               debug!("<< post_commit() SUCCEEDED");
            }
         },
         /// DeleteAction
         Action::Delete(delete) => {
            let Ok(new_sah) = must_get_action(delete.deletes_address.clone())
              else { error!("Deleted action not found."); continue; };
            let Ok(he) = must_get_entry(delete.deletes_entry_address.clone())
              else { error!("Deleted entry not found."); continue; };
            let Some(EntryType::App(app_entry_def)) = new_sah.action().entry_type()
              else { error!("Deleted action should have entry_type."); continue; };
            let type_variant = entry_index_to_variant(app_entry_def.entry_index).unwrap();
            /// Emit System Signal
            let variant_name = format!("{:?}", type_variant);
            let _ = emit_system_signal(SystemSignalProtocol::PostCommitDeleteStart { app_entry_type: variant_name.clone() });
            /// Emit Entry Signal
            let result = emit_delete_entry_signal(new_sah.hashed, he.content, true);
            /// Emit System Signal
            let _ = emit_system_signal(SystemSignalProtocol::PostCommitDeleteEnd { app_entry_type: variant_name, succeeded: result.is_ok() });
            ///
            if let Err(e) = result {
               error!("<< post_commit() failed: {:?}", e);
            } else {
               debug!("<< post_commit() SUCCEEDED");
            }
         },
         ///
         _ => (),
      }
   }
}


///
fn emit_new_entry(sah: SignedActionHashed) -> ExternResult<()> {
   let Some(eh) = sah.action().entry_hash() else {
      return zome_error!("Action has no Entry");
   };
   let entry = must_get_entry(eh.to_owned())?.content;
   let record = Record::new(sah, Some(entry));
   /// Emit Signal
   emit_new_entry_signal(record, true)?;
   Ok(())
}
