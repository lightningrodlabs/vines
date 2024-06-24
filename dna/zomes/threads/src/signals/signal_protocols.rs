use hdk::prelude::*;



///
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ThreadsSignal {
    pub from: AgentPubKey, // if from self, than its not a DM,
    pub pulses: Vec<ThreadsSignalProtocol>,
}


/// Data sent by UI ONLY. That's why we use B64 here.
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
//#[serde(tag = "type")]
pub enum ThreadsSignalProtocol {
    System(SystemSignalProtocol), /// From "System"
    Tip(TipProtocol), /// From Other peer
    Entry(EntryPulse), // From self
    Link(LinkPulse), // From self
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

#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone)]
pub struct LinkPulse {
    pub link: Link,
    pub state: StateChange,
}



#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct SystemSignal {
    pub System: SystemSignalProtocol,
}
#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct TipSignal {
    pub Tip: TipProtocol,
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
//#[serde(tag = "type")]
pub enum TipProtocol {
    Ping(AgentPubKey),
    Pong(AgentPubKey),
    Entry(EntryPulse),
    Link(LinkPulse),
    ///
    Notification(SerializedBytes),
}


/// Bool: True if state change just happened (real-time)
#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub enum StateChange {
    Create(bool),
    Update(bool),
    Delete(bool),
}


impl EntryPulse {
    pub fn from_NewEntry_record(record: Record, is_new: bool) -> Self {
        let state = match record.action() {
            Action::Create(_) => StateChange::Create(is_new),
            Action::Update(_) => StateChange::Update(is_new),
            _ => panic!("Action should be a NewEntryAction"),
        };
        let RecordEntry::Present(Entry::App(bytes)) = record.entry().to_owned()
          else { panic!("Record has no entry data") };
        let Some(EntryType::App(def)) = record.action().entry_type()
          else { panic!("Record has no entry def") };
        //let type_variant = entry_index_to_variant(app_entry_def.entry_index).unwrap();

        Self {
            ah: record.action_address().to_owned(),
            eh: record.action().entry_hash().unwrap().clone(),
            ts: record.action().timestamp(),
            author: record.action().author().clone(),
            state,
            def: def.to_owned(),
            bytes,
        }
    }
    // pub fn from_delete_record(delete: &Delete) -> Self {
    //     Self {
    //         eh: AnyDhtHash::from(delete.deletes_entry_address.clone()),
    //         ts: delete.timestamp,
    //         author: delete.author.clone(),
    //     }
    // }
}
