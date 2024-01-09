use hdk::prelude::*;
use holo_hash::{EntryHashB64, AgentPubKeyB64, ActionHashB64};
use threads_integrity::ParticipationProtocol;

///
/// Data sent by UI ONLY. That's why we use B64 here.
///
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(tag = "type", content = "content")]
pub enum DirectMessage {
    Ping(AgentPubKeyB64),
    Pong(AgentPubKeyB64),

    NewSemanticTopic((EntryHashB64, String)), // topicEh, title
    NewPp((Timestamp, ActionHashB64, ParticipationProtocol)),
    NewBead((Timestamp, ActionHashB64, String, ActionHashB64, Vec<u8>)), // creation_time, beadAh, bead_type, ppAh, SerializedBytes specific to the bead_type
    EmojiReactionChange((ActionHashB64, AgentPubKeyB64, String, bool)), // beadAh, author, emoji, isAdded
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SignalPayload {
    maybe_pp_hash: Option<ActionHashB64>, // used for filtering by PP if applicable
    from: AgentPubKeyB64, // if from self, than its not a DM,
    dm: DirectMessage,
}

impl SignalPayload {
   pub fn new(maybe_pp_hash: Option<ActionHashB64>, from: AgentPubKeyB64, message: DirectMessage) -> Self {
        SignalPayload {
            maybe_pp_hash,
            from,
            dm: message,
        }
    }
}

#[hdk_extern]
fn recv_remote_signal(signal: ExternIO) -> ExternResult<()> {
    let sig: SignalPayload = signal.decode().unwrap();
    debug!("Received signal {:?}", sig);
    Ok(emit_signal(&sig)?)
}

/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotifyInput {
    pub signal: SignalPayload,
    pub peers: Vec<AgentPubKey>,
}

///
#[hdk_extern]
fn notify_peers(input: NotifyInput) -> ExternResult<()> {
    // let mut peers: Vec<AgentPubKey> = vec![];
    // for a in input.peers.clone() {
    //     peers.push(a.into())
    // }
    debug!("Sending signal {:?} to {:?}", input.signal, input.peers);
    remote_signal(ExternIO::encode(input.signal).unwrap(), input.peers)?;
    Ok(())
}
