use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use zome_signals::*;


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct NotifyPeerInput {
    pub content: AnyLinkableHash,
    pub who: AgentPubKey,
    pub event_index: u8,
}


/// Called Directly by other zfns
#[hdk_extern]
#[feature(zits_blocking)]
pub fn notify_peer(input: NotifyPeerInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("notify_peer(): {:?}", input);
    // Don't notify self
    if input.who == agent_info()?.agent_latest_pubkey {
        return Ok(());
    }
    let tag = LinkTag::from(vec![input.event_index]);
    let _link_ah = create_link(input.who, input.content.clone(), ThreadsLinkType::Inbox, tag)?;
    /// Done
    Ok(())
}


/// Returns vec of: LinkCreateActionHash, AuthorPubKey, TextMessageActionHash
#[hdk_extern]
pub fn probe_inbox(_ : ()) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let me = agent_info()?.agent_latest_pubkey;
    let links = get_links(link_input(me, ThreadsLinkType::Inbox, None))?;
    /// Emit Signal
    emit_links_signal(links)?;
    /// Done
    Ok(())
}


///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn unpublish_notification(link_ah : ActionHash) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    // TODO: Make sure its a Inbox link
    let _ = delete_link(link_ah)?;
    Ok(())
}
