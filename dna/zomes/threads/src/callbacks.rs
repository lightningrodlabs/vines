use hdk::prelude::*;
use threads_integrity::*;
use zome_signals::*;
use zome_utils::*;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!("{} init() CALLED", THREADS_DEFAULT_COORDINATOR_ZOME_NAME);
    let mut fns = HashSet::new();
    fns.insert((zome_info()?.name, FunctionName("recv_remote_signal".into())));
    let cap_grant_entry: CapGrantEntry = CapGrantEntry::new(
        String::from("remote signals"), // A string by which to later query for saved grants.
        ().into(), // Unrestricted access means any external agent can call the extern
        GrantedFunctions::Listed(fns),
    );
    create_cap_grant(cap_grant_entry)?;
    /// Emit init done tip
    let _ = emit_zome_signal(vec![ZomeSignalProtocol::Tip(TipProtocol::AppValue((
        "init".to_string(),
        "done".to_string(),
    )))]);
    /// Done
    Ok(InitCallbackResult::Pass)
}


///
#[hdk_extern(infallible)]
fn post_commit(signed_actions: Vec<SignedActionHashed>) {
   std::panic::set_hook(Box::new(zome_panic_hook));
   debug!(
        "{} post_commit() called for {} actions. ({})",
        THREADS_DEFAULT_COORDINATOR_ZOME_NAME,
        signed_actions.len(),
        zome_info().unwrap().id
   );
   attest_post_commit::<ThreadsEntry, ThreadsLinkType>(signed_actions);
}
