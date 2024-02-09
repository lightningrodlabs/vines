use hdk::hash_path::path::DELIMITER;
use hdk::prelude::*;
use hdk::prelude::holo_hash::{HashType, holo_hash_decode_unchecked, holo_hash_encode};
use zome_utils::*;
use originals_integrity::{OriginalsLinkType, ROOT_ANCHOR_ORIGNALS};


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOriginalLinkInput {
    pub target: AnyLinkableHash,
    pub target_type: String,
    pub original_author: AgentPubKey,
}


///
pub(crate) fn get_type_tp(target_type: String) -> ExternResult<TypedPath> {
    // conver to lowercase for path for ease of search
    let lower_title = target_type.to_lowercase();
    //
    Path::from(format!("{}{}{}", ROOT_ANCHOR_ORIGNALS, DELIMITER, lower_title.chars().next().unwrap()))
        .typed(OriginalsLinkType::OriginalPath)
}


/// TODO VALIDATION: only author of entry should be allowed to create an original link.
#[hdk_extern]
pub fn create_original_link(input: CreateOriginalLinkInput) -> ExternResult<ActionHash> {
    let me = agent_info()?.agent_latest_pubkey;
    if input.original_author == me {
        return error("Original author is already the author. No need to create a link");
    }
    let tp = get_type_tp(input.target_type)?;
    let tag = hash2tag(input.original_author);
    let ah = create_link(tp.path_entry_hash()?, input.target, OriginalsLinkType::Original, tag)?;
    Ok(ah)
}


///
#[hdk_extern]
pub fn create_original_link_from_app_entry(eh: EntryHash) -> ExternResult<ActionHash> {
    /// Grab Entry
    let maybe_maybe_record = get(eh.clone(), GetOptions::content());
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
    let target_type = get_entry_type_name(app_entry_def)?;
    /// Form input & create link
    let input = CreateOriginalLinkInput {
        target: eh.into(),
        target_type,
        original_author: record.action().author().to_owned(),
    };
    return create_original_link(input);
}

///
#[hdk_extern]
pub fn get_types(_: ()) -> ExternResult<Vec<String>> {
    let tp = Path::from(ROOT_ANCHOR_ORIGNALS)
        .typed(OriginalsLinkType::OriginalPath)?;
    let children_tps = tp_children_paths(&tp)?;
    let result = children_tps.into_iter().map(|tp| {
        let leaf = tp.leaf().unwrap();
        let str = String::try_from(leaf).unwrap();
        str
    }).collect();
    Ok(result)
}


#[hdk_extern]
pub fn get_all_originals(_: ()) -> ExternResult<Vec<(String, AnyLinkableHash, AgentPubKey)>> {
    let child_types = get_types(())?;
    let mut result = Vec::new();
    for child_type in child_types {
        let children = get_children_for_type(child_type.clone())?;
        for child in children {
            result.push((child_type.to_owned(), child.0, child.1))
        }
    }
    Ok(result)
}


///
#[hdk_extern]
pub fn get_children_for_type(target_type: String) -> ExternResult<Vec<(AnyLinkableHash, AgentPubKey)>> {
    let tp = get_type_tp(target_type)?;
    let targets = get_links(tp.path_entry_hash()?, OriginalsLinkType::Original, None)?;
    let result: Vec<(AnyLinkableHash, AgentPubKey)> = targets.into_iter().map(|link| {
        let agent = tag2hash(&link.tag).unwrap();
        (link.target, agent)
    }).collect();
    Ok(result)
}


//--------------------------------------------------------------------------------------------------

///
pub fn get_entry_type_name(app_entry_def: AppEntryDef) -> ExternResult<String> {
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
    Ok(name.0.to_string())
}


///
pub fn hash2tag<T: HashType>(hash: HoloHash<T>) -> LinkTag {
    let str = holo_hash_encode(hash.get_raw_39());
    return str2tag(&str);
}


///
pub fn tag2hash<T: HashType>(tag: &LinkTag) -> ExternResult<HoloHash<T>> {
    let hash_str = tag2str(&tag)?;
    let raw_hash = holo_hash_decode_unchecked(&hash_str)
        .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
    let hash = HoloHash::<T>::from_raw_39(raw_hash)
        .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
    Ok(hash)
}
