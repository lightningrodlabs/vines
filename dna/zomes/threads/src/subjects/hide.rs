use hdk::prelude::*;
use threads_integrity::ThreadsLinkType;
use zome_signals::*;
use zome_utils::*;

///
#[hdk_extern]
fn find_hide_link(subjectHash: AnyLinkableHash) -> ExternResult<Option<ActionHash>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let links = get_links(
        LinkQuery::new(
            agent_info()?.agent_initial_pubkey,
            ThreadsLinkType::Hide.try_into_filter().unwrap(),
        ),
        GetStrategy::Local, // All Hide links should be local
    )?;
    for link in links.iter() {
        if link.target.clone() == subjectHash {
            return Ok(Some(link.create_link_hash.clone()));
        }
    }
    Ok(None)
}

///
#[hdk_extern]
#[feature(zits_blocking)]
fn hide_subject(subjectHash: AnyLinkableHash) -> ExternResult<ActionHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    return create_link(
        agent_info()?.agent_initial_pubkey,
        subjectHash,
        ThreadsLinkType::Hide,
        LinkTag::from(()),
    );
}

///
#[hdk_extern]
#[feature(zits_blocking)]
fn unhide_subject(subjectHash: AnyLinkableHash) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let Some(create_link_hash) = find_hide_link(subjectHash)? else {
        return Ok(());
    };
    let _hash = delete_link(create_link_hash, GetOptions::local())?; // All Hide links should be local
    Ok(())
}

///
#[hdk_extern]
fn probe_all_hiddens(strategy: GetStrategy) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let links = get_links(
        LinkQuery::new(
            agent_info()?.agent_initial_pubkey,
            ThreadsLinkType::Hide.try_into_filter().unwrap(),
        ),
        strategy,
    )?;
    /// Emit Signal
    attest_links(links)?;
    ///
    Ok(())
}
