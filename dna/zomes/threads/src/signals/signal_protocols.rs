use hdk::prelude::*;
use zome_utils::*;


///
#[derive(Serialize, Deserialize, Debug)]
pub struct ZomeSignal {
    pub from: AgentPubKey,
    pub pulses: Vec<ZomeSignalProtocol>,
}


///
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub enum ZomeSignalProtocol {
    System(SystemSignalProtocol), // From "System"
    Tip(TipProtocol), // From Other peer
    Entry(EntryPulse), // From self
    Link(LinkPulse), // From self
}


/// Protocol for notifying the ViewModel (UI) of system level events
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
#[serde(tag = "type")]
pub enum SystemSignalProtocol {
    PostCommitNewStart {app_entry_type: String},
    PostCommitNewEnd {app_entry_type: String, succeeded: bool},
    PostCommitDeleteStart {app_entry_type: String},
    PostCommitDeleteEnd {app_entry_type: String, succeeded: bool},
    SelfCallStart {zome_name: String, fn_name: String},
    SelfCallEnd {zome_name: String, fn_name: String, succeeded: bool},
}


/// Used by UI ONLY. That's why we use B64 here.
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub enum TipProtocol {
    Ping(AgentPubKey),
    Pong(AgentPubKey),
    Entry(EntryPulse),
    Link(LinkPulse),
    App(SerializedBytes),
}


/// Bool: True if state change just happened (real-time)
#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub enum StateChange {
    Create(bool),
    Update(bool),
    Delete(bool),
}


#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct LinkPulse {
    pub link: Link,
    pub state: StateChange,
}


#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct EntryPulse {
    ah: ActionHash,
    state: StateChange,
    ts: Timestamp,
    author: AgentPubKey,
    eh: EntryHash,
    def: AppEntryDef,
    bytes: AppEntryBytes,
}

impl EntryPulse {
    ///
    pub fn try_from_new_record(record: Record, is_new: bool) -> ExternResult<Self> {
        let state = match record.action() {
            Action::Create(_) => StateChange::Create(is_new),
            Action::Update(_) => StateChange::Update(is_new),
            _ => return zome_error!("Unhandled Action type"),
        };
        let RecordEntry::Present(Entry::App(bytes)) = record.entry().to_owned()
          else { return zome_error!("Record has no entry data") };
        let Some(EntryType::App(def)) = record.action().entry_type()
          else { return zome_error!("Record has no entry def") };

        Ok(Self {
            ah: record.action_address().to_owned(),
            eh: record.action().entry_hash().unwrap().clone(),
            ts: record.action().timestamp(),
            author: record.action().author().clone(),
            state,
            def: def.to_owned(),
            bytes,
        })
    }


    /// Input must be the NewEntryAction that is deleted
    pub fn try_from_delete_record(ha: ActionHashed, entry: Entry, is_new: bool) -> ExternResult<Self> {
        let action = ha.content;
        match action {
            Action::Create(_) => StateChange::Create(is_new),
            Action::Update(_) => StateChange::Update(is_new),
            _ => return zome_error!("Unhandled Action type"),
        };
        let Entry::App(bytes) = entry
          else { return zome_error!("Entry is not an App") };
        let Some(EntryType::App(def)) = action.entry_type()
          else { return zome_error!("Entry has no entry def") };

        Ok(Self {
            ah: ha.hash.to_owned(),
            eh: action.entry_hash().unwrap().clone(),
            ts: action.timestamp(),
            author: action.author().clone(),
            state: StateChange::Delete(is_new),
            def: def.to_owned(),
            bytes,
        })
    }
}
