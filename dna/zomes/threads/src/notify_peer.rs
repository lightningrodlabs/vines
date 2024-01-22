use hdk::prelude::*;
use hdk::prelude::holo_hash::AgentPubKeyB64;
use threads_integrity::{THREADS_DEFAULT_COORDINATOR_ZOME_NAME};
use crate::signals::WeaveSignal;


///
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(tag = "type", content = "content")]
enum NotifiableEvent {
    /// Another agent mentionned you in a textMessage ; Title is
    Mention((ActionHash, ActionHash)), // linkAh, beadAh
    Reply, // Another agent replied to one of your bead
    Fork, // Another agent created a thread off of some entry you own
    Dm, // Another agent sent you a private bead to your agentPubKey
}


/// Data sent by UI ONLY. That's why we use B64 here.
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WeaveNotification {
    event: NotifiableEvent,
    author: AgentPubKeyB64,
    timestamp: Timestamp,
    title: String,
    //context: Option<SerializedBytes>,
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
    let sig: WeaveSignal = signal.decode().unwrap();
    debug!("Received notification {:?}", sig);
    let _ = emit_signal(&sig)?;
    Ok(())
}
