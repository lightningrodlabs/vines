use hdi::prelude::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum BaseBeadKind {
    AnyBead(AnyBead),
    EntryBead(EntryBead),
    TextBead(TextBead),
}
impl BaseBeadKind {

    pub fn from(entry: &Entry) -> Self {
        if let Ok(any) = AnyBead::try_from(entry.clone()) {
            return BaseBeadKind::AnyBead(any);
        }
        if let Ok(any) = TextBead::try_from(entry.clone()) {
            return BaseBeadKind::TextBead(any);
        }
        if let Ok(any) = EntryBead::try_from(entry.clone()) {
            return BaseBeadKind::EntryBead(any);
        }
        panic!("Entry not a bead");
    }

    pub fn bead(&self) -> Bead {
        match self {
            BaseBeadKind::AnyBead(a) => a.bead.clone(),
            BaseBeadKind::EntryBead(a) => a.bead.clone(),
            BaseBeadKind::TextBead(a) => a.bead.clone(),
        }
    }
}



/// First bead: prev_bead_ah == pp_ah
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Bead {
    pub pp_ah: ActionHash,
    pub prev_bead_ah: ActionHash,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EntryBead {
    pub bead: Bead,
    pub source_eh: EntryHash,
    pub source_type: String,
    pub source_zome: String,
    pub source_role: String,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TextBead {
    pub bead: Bead,
    pub value: String,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AnyBead {
    pub bead: Bead,
    pub value: String,
    pub type_info: String,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct EncryptedBead {
    pub for_other: XSalsa20Poly1305EncryptedData,
    pub for_self: XSalsa20Poly1305EncryptedData,
    pub bead_type: String,
}


///
#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct SemanticTopic {
    pub title: String,
}


///
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ParticipationProtocol {
    pub purpose: String,
    pub subject: Subject,
    pub moderation: Moderation,
    pub limitations: Limitations,
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subject {
    pub address: String, // HoloHashB64
    pub name: String,
    pub type_name: String,
    pub dna_hash_b64: String, // DnaHashB64
    pub applet_id: String, // EntryHashB64 of the Applet entry in the group dna (We)
}


#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct GlobalLastProbeLog {
    pub ts: Timestamp,
    pub maybe_last_known_pp_ah: Option<ActionHash>,
}


#[hdk_entry_helper]
#[derive(Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThreadLastProbeLog {
    pub ts: Timestamp,
    pub pp_ah: ActionHash,
    pub maybe_last_known_bead_ah: Option<ActionHash>,
}

///-------------------------------------------------------------------------------------------------


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Moderation {
    pub instructions: String,
    pub allowed_flags: u16,
    pub moderators: Vec<AgentPubKey>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Limitations {
    pub can_wal: bool,
    pub can_file: Option<FileLimits>,
    pub can_text: Option<TextLimits>,
    pub allowed_agents: Vec<AgentPubKey>,
    // pub maybe_shared_cap_per_day: Option<u16>, // Not implemented
    pub maybe_agent_rate_limiting: Option<(u16, Timestamp)>,
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextLimits {
    pub banned_words: Vec<String>,
    pub min_text_length: u32, // FIXME: must be < than MAX
    pub max_text_length: u32,
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileLimits {
    pub allowed_file_types: Vec<String>, /// Empty means no limitation
    pub min_file_size: u32, // FIXME: must be < than MAX
    pub max_file_size: u32, // Not possible to enforce currently because validation cant grab entry from a different zome
}


impl Default for Limitations {
    fn default() -> Self {
        Self {
            can_wal: true,
            can_file: Some(FileLimits::default()),
            can_text: Some(TextLimits::default()),
            allowed_agents: Vec::default(),
            //maybe_shared_cap_per_day: None,
            maybe_agent_rate_limiting: None,
        }
    }
}


impl Default for TextLimits {
    fn default() -> Self {
        Self {
            banned_words: Vec::default(),
            min_text_length: 0,
            max_text_length: 0,
        }
    }
}


impl Default for FileLimits {
    fn default() -> Self {
        Self {
            allowed_file_types: Vec::default(),
            min_file_size: 0,
            max_file_size: 0,
        }
    }
}
