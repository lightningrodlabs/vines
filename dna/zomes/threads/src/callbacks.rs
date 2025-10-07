use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use zome_signals::*;

#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
   debug!("genesis_self_check() CALLED");
   let _info = dna_info()?;
   let Ok(properties) = get_properties() else {
      return Ok(ValidateCallbackResult::Invalid("No properties".into()))
   };
   /// Emit init done tip
   let _ = emit_zome_signal(vec![ZomeSignalProtocol::Tip(TipProtocol::AppValue(("genesis_self_check".to_string(), "done".to_string())))]);
   ///
   return properties.validate();
}


#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
   debug!("init() CALLED");
   let mut fns = BTreeSet::new();
   fns.insert((zome_info()?.name, FunctionName("recv_remote_signal".into())));
   let cap_grant_entry: CapGrantEntry = CapGrantEntry::new(
      String::from("remote signals"), // A string by which to later query for saved grants.
      ().into(), // Unrestricted access means any external agent can call the extern
      GrantedFunctions::Listed(fns),
   );
   create_cap_grant(cap_grant_entry)?;
   /// Emit init done tip
   let _ = emit_zome_signal(vec![ZomeSignalProtocol::Tip(TipProtocol::AppValue(("init".to_string(), "done".to_string())))]);
   /// Done
   Ok(InitCallbackResult::Pass)
}


///
#[hdk_extern(infallible)]
fn post_commit(signed_actions: Vec<SignedActionHashed>) {
   debug!("THREADS post_commit() called for {} actions. ({})", signed_actions.len(), zome_info().unwrap().id);
   std::panic::set_hook(Box::new(zome_panic_hook));
   attest_post_commit::<ThreadsEntry, ThreadsLinkType>(signed_actions);
}

