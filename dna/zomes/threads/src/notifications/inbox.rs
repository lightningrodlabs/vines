use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use crate::*;
use crate::notifications::*;
//use crate::signals::*;


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct NotifyPeerInput {
    pub content: AnyLinkableHash,
    pub who: AgentPubKey,
    pub event: NotifiableEvent,
}


/// Called Directly by other zfns
//#[hdk_extern]
//#[feature(zits_blocking)]
pub fn notify_peer(input: NotifyPeerInput) -> ExternResult<Option<ActionHash>> {
    //std::panic::set_hook(Box::new(zome_panic_hook));
    // Don't notify self
    if input.who == agent_info()?.agent_latest_pubkey {
        return Ok(None);
    }

    let repr: u8 = input.event.into();


    let link_ah = create_link(input.who, input.content.clone(), ThreadsLinkType::Inbox, LinkTag::from(vec![repr]))?;

    // let notif = WeaveNotification {
    //     event: NotifiableEvent::from_repr(repr).unwrap(),
    //     author: agent_info()?.agent_latest_pubkey,
    //     timestamp: sys_time()?,
    //     link_ah: link_ah.clone(),
    //     content: input.content.clone(),
    // };

    Ok(Some(link_ah))
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
    // FIXME: Make sure its a Inbox link
    let _ = delete_link(link_ah)?;
    Ok(())
}
