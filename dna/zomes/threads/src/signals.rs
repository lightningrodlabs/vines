use hdk::prelude::*;
use holo_hash::{EntryHashB64, AgentPubKeyB64, ActionHashB64};
use zome_utils::zome_panic_hook;
use threads_integrity::ParticipationProtocol;
use crate::notify_peer::WeaveNotification;


/// Data sent by UI ONLY. That's why we use B64 here.
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(tag = "type")]
pub enum SignalPayload {
    DirectGossip {value: DirectGossip},
    Notification {
        notification: WeaveNotification,
        data: SerializedBytes,
    },
}

///
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ThreadsSignal {
    maybe_pp_hash: Option<ActionHashB64>, // used for filtering by PP if applicable
    from: AgentPubKeyB64, // if from self, than its not a DM,
    payload: SignalPayload,
}

// impl SignalPayload {
//     pub fn from_dm(maybe_pp_hash: Option<ActionHashB64>, from: AgentPubKeyB64, dm: DirectMessage) -> Self {
//         SignalPayload {
//             maybe_pp_hash,
//             from,
//             dm: Ok(dm),
//         }
//     }
//     pub fn from_notification(maybe_pp_hash: Option<ActionHashB64>, from: AgentPubKeyB64, notif: NotificationMessage) -> Self {
//         SignalPayload {
//             maybe_pp_hash,
//             from,
//             dm: Err(notif),
//         }
//     }
// }


///
/// Data sent by UI ONLY. That's why we use B64 here.
///
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(tag = "type")]
pub enum DirectGossip {
    Ping {from: AgentPubKeyB64},
    Pong {from: AgentPubKeyB64},

    UpdateSemanticTopic {old_topic_eh: EntryHashB64, new_topic_eh: EntryHashB64, title: String},
    NewSemanticTopic { topic_eh: EntryHashB64, title: String },
    NewPp { creation_ts: Timestamp, ah: ActionHashB64, pp: ParticipationProtocol },
    NewBead {creation_ts: Timestamp,  bead_ah: ActionHashB64, bead_type: String, pp_ah: ActionHashB64, data: SerializedBytes},
    EmojiReactionChange {bead_ah: ActionHashB64, author: AgentPubKeyB64, emoji: String, is_added: bool},
}


///
#[hdk_extern]
fn recv_remote_signal(signal: ExternIO) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let sig: ThreadsSignal = signal.decode().unwrap();
    debug!("Received signal {:?}", sig);
    Ok(emit_signal(&sig)?)
}


/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SignalPeersInput {
    pub signal: ThreadsSignal,
    pub peers: Vec<AgentPubKey>,
}

///
#[hdk_extern]
fn signal_peers(input: SignalPeersInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    // let mut peers: Vec<AgentPubKey> = vec![];
    // for a in input.peers.clone() {
    //     peers.push(a.into())
    // }
    debug!("Sending signal {:?} to {:?}", input.signal, input.peers);
    send_remote_signal(ExternIO::encode(input.signal).unwrap(), input.peers)?;
    Ok(())
}

