use hdk::prelude::*;
use holo_hash::{EntryHashB64, AgentPubKeyB64, ActionHashB64};
//use zome_utils::*;
use threads_integrity::ParticipationProtocol;
use crate::notifications::WeaveNotification;


///
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ThreadsSignal {
    //maybe_pp_hash: Option<ActionHashB64>, // used for filtering by PP if applicable
    pub from: AgentPubKey, // if from self, than its not a DM,
    pub signal: Vec<ThreadsSignalProtocol>,
}


/// Data sent by UI ONLY. That's why we use B64 here.
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(tag = "type")]
pub enum ThreadsSignalProtocol {
    System(SystemSignalProtocol), /// From System
    DirectGossip(DirectGossip), /// From Other peer
    Notification(ThreadsNotification), // From self
}


#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct SystemSignal {
    pub System: SystemSignalProtocol,
}
#[derive(Debug, Serialize, Deserialize, SerializedBytes)]
pub struct GossipSignal {
    pub DirectGossip: DirectGossip,
}


/// Protocol for notifying the ViewModel (UI) of system level events
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
#[serde(tag = "type")]
pub enum SystemSignalProtocol {
    PostCommitStart {entry_type: String},
    PostCommitEnd {entry_type: String, succeeded: bool},
    SelfCallStart {zome_name: String, fn_name: String},
    SelfCallEnd {zome_name: String, fn_name: String, succeeded: bool},
}


///
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct ThreadsNotification {
    notification: WeaveNotification,
    data: SerializedBytes,
}


///
/// Data sent by UI ONLY. That's why we use B64 here.
///
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
#[serde(tag = "type")]
pub enum DirectGossip {
    Ping {from: AgentPubKeyB64},
    Pong {from: AgentPubKeyB64},
    ///
    UpdateSemanticTopic {old_topic_eh: EntryHashB64, new_topic_eh: EntryHashB64, title: String},
    NewSemanticTopic { topic_eh: EntryHashB64, title: String },
    NewPp { creation_ts: Timestamp, ah: ActionHashB64, pp: ParticipationProtocol },
    NewBead {creation_ts: Timestamp,  bead_ah: ActionHashB64, bead_type: String, pp_ah: ActionHashB64, data: SerializedBytes},
    EmojiReactionChange {bead_ah: ActionHashB64, author: AgentPubKeyB64, emoji: String, is_added: bool},
}


