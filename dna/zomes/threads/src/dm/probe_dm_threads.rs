use hdk::prelude::*;
use threads_integrity::*;
use zome_signals::*;
use zome_utils::*;

/// Return ppAhs and timestamp of its index-time
#[hdk_extern]
pub fn probe_dm_threads(strategy: GetStrategy) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let links = get_links(
        LinkQuery::new(
            agent_info()?.agent_initial_pubkey,
            ThreadsLinkType::Dm.try_into_filter().unwrap(),
        ),
        strategy,
    )?;
    /// Emit signal
    attest_links(links, ValidatedBy::Network)?;
    ///
    Ok(())
}
