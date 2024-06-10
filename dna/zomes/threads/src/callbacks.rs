use hdk::prelude::*;
use zome_utils::*;
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
fn recv_remote_signal(signal: ExternIO) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let sig: ThreadsSignal = signal.decode().unwrap();
   debug!("Received signal {:?}", sig);
   Ok(emit_signal(&sig)?)
}
