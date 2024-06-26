use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use zome_signals::*;


/// Return ppAhs and timestamp of its index-time
#[hdk_extern]
pub fn probe_dm_threads(_: ()) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let links = get_links(link_input(agent_info()?.agent_latest_pubkey, ThreadsLinkType::Dm, None))?;
  /// Emit signal
  emit_links_signal(links)?;
  ///
  Ok(())
}
