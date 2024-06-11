use hdk::prelude::*;
use holo_hash::{EntryHashB64, AgentPubKeyB64, ActionHashB64};
//use zome_utils::*;
use threads_integrity::*;
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
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub enum ThreadsSignalProtocol {
    System(SystemSignalProtocol), /// From "System"
    Gossip(DirectGossipProtocol), /// From Other peer
    Notification(ThreadsNotification), // From self?
    Entry((EntryInfo, ThreadsEntryKind)), // From self
}


#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct SystemSignal {
    pub System: SystemSignalProtocol,
}
#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct GossipSignal {
    pub DirectGossip: DirectGossipProtocol,
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
    pp_ah: ActionHash,
    notification: WeaveNotification,
    data: SerializedBytes,
}


///
/// Data sent by UI ONLY. That's why we use B64 here.
///
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
#[serde(tag = "type")]
pub enum DirectGossipProtocol {
    Ping {from: AgentPubKeyB64},
    Pong {from: AgentPubKeyB64},
    ///
    UpdateSemanticTopic {old_topic_eh: EntryHashB64, new_topic_eh: EntryHashB64, title: String},
    ///
    NewSemanticTopic { topic_eh: EntryHashB64, title: String },
    NewPp { creation_ts: Timestamp, ah: ActionHashB64, pp: ParticipationProtocol },
    NewBead {creation_ts: Timestamp,  bead_ah: ActionHashB64, bead_type: String, pp_ah: ActionHashB64, data: SerializedBytes},
    EmojiReactionChange {bead_ah: ActionHashB64, author: AgentPubKeyB64, emoji: String, is_added: bool},
}


/// Bool: True if state change just happened (real-time)
#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub enum EntryStateChange {
    Create(bool),
    Update(bool),
    Delete(bool),
}

#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct EntryInfo {
    pub hash: AnyDhtHash,
    pub ts: Timestamp,
    pub author: AgentPubKey,
    pub state: EntryStateChange,
}

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub enum ThreadsEntryKind {
    AnyBead(AnyBead),
    EntryBead(EntryBead),
    TextBead(TextBead),
    EncryptedBead(EncryptedBead),
    SemanticTopic(SemanticTopic),
    ParticipationProtocol(ParticipationProtocol),
    GlobalLastProbeLog(GlobalLastProbeLog),
    ThreadLastProbeLog(ThreadLastProbeLog),
}
