use hdk::hash_path::path::DELIMITER;
use hdk::prelude::*;
use zome_utils::*;
use authorship_integrity::*;


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AscribeTargetInput {
    pub target: AnyLinkableHash,
    pub target_type: String,
    pub maybe_original_author: Option<AgentPubKey>,
    pub creation_time: Timestamp,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
pub struct AuthorshipLog {
    pub original_author: AgentPubKey,
    pub creation_time: Timestamp,
}

impl AuthorshipLog {
    pub fn new(author: AgentPubKey, ts: Timestamp) -> Self { Self {original_author: author, creation_time: ts }}
}

/// TODO VALIDATION: only author of target should be allowed to ascribe entry to self
#[hdk_extern]
pub fn ascribe_target(input: AscribeTargetInput) -> ExternResult<()> {
    //let me = agent_info()?.agent_latest_pubkey;
    // if input.maybe_original_author == me {
    //     return error("Original author is already the author. No need to create a link");
    // }
    let tp = get_type_tp(input.target_type)?;
    //let mut author_target: AnyLinkableHash = Path::from(ROOT_ANCHOR_UNKNOWN_AUTHOR).typed(AuthorshipLinkType::AuthorshipPath)?.path_entry_hash()?.into();
    let original_author = input.maybe_original_author.unwrap_or(AgentPubKey::from_raw_36(vec![0; 36]));
    let log = AuthorshipLog::new(original_author.clone(), input.creation_time);
    let tag = obj2Tag(log)?;
    let _ah = create_link(tp.path_entry_hash()?, input.target.clone(), AuthorshipLinkType::Target, tag)?;
    let _ah2 = create_link(input.target, original_author, AuthorshipLinkType::Author, ts2Tag(input.creation_time))?;
    Ok(())
}


/// TODO VALIDATION: only author of entry should be allowed to ascribe entry to self
/// Return type and author
#[hdk_extern]
pub fn ascribe_app_entry(ah: ActionHash) -> ExternResult<(String, AgentPubKey)> {
    let (target_type, record) = get_app_entry_name(ah.clone().into())?;
    /// Form input & create link
    let input = AscribeTargetInput {
        target: ah.into(),
        target_type: target_type.to_string(),
        maybe_original_author: Some(record.action().author().to_owned()),
        creation_time: record.action().timestamp(),
    };
    let _ah = ascribe_target(input.clone());
    Ok((input.target_type, input.maybe_original_author.unwrap()))
}


///
#[hdk_extern]
pub fn get_all_ascribed_types(_: ()) -> ExternResult<Vec<String>> {
    let tp = Path::from(ROOT_ANCHOR_AUTHORSHIP)
        .typed(AuthorshipLinkType::AuthorshipPath)?;
    let children_tps = tp_children_paths(&tp)?;
    let result = children_tps.into_iter().map(|tp| {
        let leaf = tp.leaf().unwrap();
        let str = String::try_from(leaf).unwrap();
        str
    }).collect();
    Ok(result)
}


/// Return empty agentPubKey if no author was provides when ascribing
#[hdk_extern]
pub fn get_author(target: AnyLinkableHash) -> ExternResult<Option<(AgentPubKey, Timestamp)>> {
    //let tp = get_type_tp(target_type)?;
    let authors = get_links(target, AuthorshipLinkType::Author, None)?;
    if authors.len() == 0 {
        return Ok(None);
    }
    let link = authors.into_iter().next().unwrap();
    let ts = tag2Ts(link.tag);
    let op = link.target.into_agent_pub_key().unwrap();
    /// Done
    Ok(Some((op, ts)))
}


/// Return empty agentPubKey if no author was provides when ascribing
#[hdk_extern]
pub fn get_all_ascribed_entries(_: ()) -> ExternResult<Vec<(String, AnyLinkableHash, AgentPubKey, Timestamp)>> {
    let child_types = get_all_ascribed_types(())?;
    let mut result = Vec::new();
    for child_type in child_types {
        let children = get_ascribed_type_children(child_type.clone())?;
        for child in children {
            result.push((child_type.to_owned(), child.0, child.1, child.2))
        }
    }
    Ok(result)
}


/// Return empty agentPubKey if no author was provides when ascribing
#[hdk_extern]
pub fn get_ascribed_type_children(target_type: String) -> ExternResult<Vec<(AnyLinkableHash, AgentPubKey, Timestamp)>> {
    let tp = get_type_tp(target_type)?;
    let targets = get_links(tp.path_entry_hash()?, AuthorshipLinkType::Target, None)?;
    let result: Vec<(AnyLinkableHash, AgentPubKey, Timestamp)> = targets.into_iter().map(|link| {
        let log: AuthorshipLog = decode(&link.tag.into_inner()).unwrap();
        (link.target, log.original_author, log.creation_time)
    }).collect();
    Ok(result)
}


///
pub(crate) fn get_type_tp(target_type: String) -> ExternResult<TypedPath> {
    // conver to lowercase for path for ease of search
    let lower_title = target_type.to_lowercase();
    //
    Path::from(format!("{}{}{}", ROOT_ANCHOR_AUTHORSHIP, DELIMITER, lower_title.chars().next().unwrap()))
        .typed(AuthorshipLinkType::AuthorshipPath)
}


//--------------------------------------------------------------------------------------------------

///
pub fn get_app_entry_name(dh: AnyDhtHash) -> ExternResult<(AppEntryName, Record)> {
    /// Grab Entry
    let maybe_maybe_record = get(dh.clone(), GetOptions::content());
    if let Err(err) = maybe_maybe_record {
        warn!("Failed getting Record: {}", err);
        return Err(err);
    }
    let Some(record) = maybe_maybe_record.unwrap() else {
        return error("no Record found at address");
    };
    let RecordEntry::Present(entry) = record.entry() else {
        return error("no Entry found at address");
    };
    /// Grab Type
    let entry_type = get_entry_type(entry)?;
    let EntryType::App(app_entry_def) = entry_type else {
        return error("no AppEntry found at address");
    };
    let aen = get_app_entry_name_from_def(app_entry_def)?;

    Ok((aen, record))
}


///
pub fn get_app_entry_name_from_def(app_entry_def: AppEntryDef) -> ExternResult<AppEntryName> {
    /// Grab zome
    let dna = dna_info()?;
    let this_zome_info = zome_info()?;
    let mut entry_defs: EntryDefs = this_zome_info.entry_defs;
    /// Grab entry_def from different zome
    if this_zome_info.id != app_entry_def.zome_index {
        let zome_name = dna.zome_names[app_entry_def.zome_index.0 as usize].clone();
        let response = call(CallTargetCell::Local, zome_name, "entry_defs".into(), None, ())?;
        entry_defs  = decode_response(response)?;
    }
    /// Grab entry_def
    let entry_def: EntryDef = entry_defs.0[app_entry_def.entry_index.0 as usize].clone();
    let EntryDefId::App(name) = entry_def.id else {
        return error("Not an AppEntry");
    };
    /// Done
    Ok(name)
}
