use hdk::prelude::*;
use strum_macros::FromRepr;
use threads_integrity::{THREADS_DEFAULT_COORDINATOR_ZOME_NAME, ThreadsLinkType};
use crate::signals::WeaveSignal;
use zome_utils::*;

///
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone, PartialEq, FromRepr)]
#[repr(u8)]
pub enum NotifiableEvent {
    NewBead, // Another agent added a Bead to a PP you "follow"
    Mention, // Another agent mentionned you in a textMessage ; Title is
    Reply, // Another agent replied to one of your bead
    Fork, // Another agent created a thread off of some entry you own
    Dm, // Another agent sent you a private bead to your agentPubKey
}
impl From<NotifiableEvent> for u8 {
    fn from(m: NotifiableEvent) -> u8 {
        m as u8
    }
}

///
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
pub struct WeaveNotification {
    event: NotifiableEvent,
    author: AgentPubKey,
    timestamp: Timestamp,
    //title: String,
    link_ah: ActionHash,
    content: AnyLinkableHash,
}
impl WeaveNotification {
    fn from(link: &Link) -> Self {
        let repr: u8 = link.tag.clone().into_inner()[0];
        WeaveNotification {
            event: NotifiableEvent::from_repr(repr).unwrap(),
            author: link.author.clone(),
            timestamp: link.timestamp,
            link_ah: link.create_link_hash.clone(),
            content: link.target.clone(),
        }
    }
}

/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotifyPeerInput {
    pub payload: WeaveSignal,
    pub peer: AgentPubKey,
}


///
#[hdk_extern]
fn notify_peer(input: NotifyPeerInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    debug!("Notifying {:?} to {}", input.payload, input.peer);
    call_remote(
        input.peer,
        THREADS_DEFAULT_COORDINATOR_ZOME_NAME,
        "recv_notification".into(),
        None,
        ExternIO::encode(input.payload).unwrap(),
    )?;
    Ok(())
}


///
#[ignore(zits)]
#[hdk_extern]
fn recv_notification(signal: ExternIO) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let sig: WeaveSignal = signal.decode().unwrap();
    debug!("Received notification {:?}", sig);
    let _ = emit_signal(&sig)?;
    Ok(())
}


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SendInboxItemInput {
    pub content: AnyLinkableHash,
    pub who: AgentPubKey,
    pub event: NotifiableEvent,
}


///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn send_inbox_item(input: SendInboxItemInput) -> ExternResult<Option<(ActionHash, WeaveNotification)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    // Don't notify self
    if input.who == agent_info()?.agent_latest_pubkey {
        return Ok(None);
    }
    let repr: u8 = input.event.into();
    let link_ah = create_link(input.who, input.content.clone(), ThreadsLinkType::Inbox, LinkTag::from(vec![repr]))?;
    let notif = WeaveNotification {
        event: NotifiableEvent::from_repr(repr).unwrap(),
        author: agent_info()?.agent_latest_pubkey,
        timestamp: sys_time()?,
        link_ah: link_ah.clone(),
        content: input.content.clone(),
    };
    Ok(Some((link_ah, notif)))
}


/// Returns vec of: LinkCreateActionHash, AuthorPubKey, TextMessageActionHash
#[hdk_extern]
pub fn probe_inbox(_ : ()) -> ExternResult<Vec<WeaveNotification>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let me = agent_info()?.agent_latest_pubkey;
    let links = get_links(link_input(me, ThreadsLinkType::Inbox, None))?;
    let notifs = links.into_iter().map(|link| { WeaveNotification::from(&link)}).collect();
    Ok(notifs)
}


/// FIXME: Make sure its a mention link
#[hdk_extern]
#[feature(zits_blocking)]
pub fn delete_inbox_item(link_ah : ActionHash) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let _ = delete_link(link_ah)?;
    Ok(())
}
