use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use crate::signals::*;


#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
   let mut fns = BTreeSet::new();
   fns.insert((zome_info()?.name, FunctionName("recv_remote_signal".into())));
   let cap_grant_entry: CapGrantEntry = CapGrantEntry::new(
      String::from("remote signals & notification"), // A string by which to later query for saved grants.
      ().into(), // Unrestricted access means any external agent can call the extern
      GrantedFunctions::Listed(fns),
   );
   create_cap_grant(cap_grant_entry)?;

   Ok(InitCallbackResult::Pass)
}



///
#[hdk_extern]
fn recv_remote_signal(pulse: ExternIO) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let pulse: ThreadsSignalProtocol = pulse.decode()
     .map_err(|e| wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
   let caller = call_info()?.provenance;
   debug!("Received signal from {}:{:?}", caller,  pulse);
   let signal = ThreadsSignal {
      from: caller,
      pulses: vec![pulse],
   };
   Ok(emit_signal(&signal)?)
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
      //debug!(" - {}", sah.action());
      let ah = sah_to_ah(sah.clone());
      match sah.action() {
         ///
         Action::DeleteLink(delete_link) => {
            let Ok(Some(record)) = get(delete_link.link_add_address.clone(), GetOptions::local())
              else { error!("Failed to get CreateLink action"); continue };
            let Action::CreateLink(create_link) = record.action()
              else { error!("Record should be a CreateLink"); continue };
            let Ok(Some(link_type)) = ThreadsLinkType::from_type(create_link.zome_index, create_link.link_type)
              else { error!("CreateLink should have a LinkType"); continue };
            let res = emit_link_delete_signal(ah, link_type, delete_link, create_link, true);
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
            let res = emit_link_create_signal(ah, link_type, create_link, true);
            if let Err(e) = res {
               error!("Emitting CreateLink signal failed: {:?}", e);
            }
            //let _ = emit_system_signal(SystemSignalProtocol::PostCommitEnd { entry_type: link_type, succeeded: result.is_ok() });

         },
         ///
         Action::Create(_) | Action::Update(_) | Action::Delete(_) => {
            let EntryType::App(app_entry_def) = sah.action().entry_type().unwrap()
              else { continue };
            /// Emit System Signal
            let variant_name = format!("{:?}", entry_index_to_variant(app_entry_def.entry_index).unwrap());
            let _ = emit_system_signal(SystemSignalProtocol::PostCommitStart { entry_type: variant_name.clone() });
            /// handle post_commit
            let result = post_commit_app_entry(ah, &sah.action(), &app_entry_def);
            /// Emit System Signal
            let _ = emit_system_signal(SystemSignalProtocol::PostCommitEnd { entry_type: variant_name, succeeded: result.is_ok() });
            ///
            if let Err(e) = result {
               error!("<< post_commit() failed: {:?}", e);
            } else {
               debug!("<< post_commit() SUCCEEDED");
            }
         },
         // ///
         // Action::Delete(_delete) => {},
         // Action::Update(update) => {
         //    let EntryType::App(app_entry_def) = &update.entry_type
         //       else { continue };
         //    /// Emit System Signal
         //    let variant_name = format!("{:?}", entry_index_to_variant(app_entry_def.entry_index).unwrap());
         //    let _ = emit_system_signal(SystemSignalProtocol::PostCommitStart { entry_type: variant_name.clone() });
         //    /// handle post_commit_update()
         //    let result = post_commit_update_app_entry(&sah, &update, &app_entry_def);
         //    /// Emit System Signal
         //    let _ = emit_system_signal(SystemSignalProtocol::PostCommitEnd { entry_type: variant_name, succeeded: result.is_ok() });
         //    ///
         //    if let Err(e) = result {
         //       error!("<< post_commit() failed: {:?}", e);
         //    } else {
         //       debug!("<< post_commit() SUCCEEDED");
         //    }
         // },
         // ///
         // Action::Create(create) => {
         //    let EntryType::App(app_entry_def) = &create.entry_type
         //      else { continue };
         //    /// Emit System Signal
         //    let variant_name = format!("{:?}", entry_index_to_variant(app_entry_def.entry_index).unwrap());
         //    let _ = emit_system_signal(SystemSignalProtocol::PostCommitStart { entry_type: variant_name.clone() });
         //    /// handle post_commit_create()
         //    let result = post_commit_app_entry(&sah, &create, &app_entry_def);
         //    /// Emit System Signal
         //    let _ = emit_system_signal(SystemSignalProtocol::PostCommitEnd { entry_type: variant_name, succeeded: result.is_ok() });
         //    ///
         //    if let Err(e) = result {
         //       error!("<< post_commit() failed: {:?}", e);
         //    } else {
         //       debug!("<< post_commit() SUCCEEDED");
         //    }
         //},
         _ => (),
      }
   }
}


// ///
// fn post_commit_create_app_entry(_sah: &SignedActionHashed, create: &Create, app_entry_def: &AppEntryDef) -> ExternResult<()> {
//    debug!(">> post_commit_create_app_entry() called for a {:?}", app_entry_def);
//    let entry = must_get_entry(create.entry_hash.clone())?.content;
//    let typed: ThreadsEntry = into_typed(entry, app_entry_def)?;
//    /// Emit Signal
//    emit_entry_create_signal(create, true, typed)?;
//    Ok(())
// }


///
fn post_commit_app_entry(ah: ActionHash, action: &Action, app_entry_def: &AppEntryDef) -> ExternResult<()> {
   debug!(">> post_commit_app_entry() called for a {:?}", app_entry_def);
   let entry = must_get_entry(action.entry_hash().unwrap().clone())?.content;
   let typed: ThreadsEntry = into_typed(entry, app_entry_def)?;
   /// Emit Signal
   emit_entry_signal(ah, action, true, typed)?;
   Ok(())
}


// ///
// fn post_commit_create_app_link(_sah: &SignedActionHashed, create: &CreateLink, link_type: ThreadsLinkType) -> ExternResult<()> {
//    debug!(">> post_commit_create_app_link() called for a {:?}", link_type);
//    match link_type {
//       //ThreadsLinkType::EmojiReaction => gossip_public_parcel(create_link, sah.hashed.content.timestamp(), true),
//       _ => (),
//    }
//    /// Emit Signal
//    emit_link_signal(EntryStateChange::Create(true), create, link_type)?;
//    Ok(())
// }
