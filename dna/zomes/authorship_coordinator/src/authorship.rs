use hdi::hash_path::path::DELIMITER;
use hdk::prelude::*;
use zome_utils::*;
use authorship_integrity::*;


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AscribeTargetInput {
    pub target: AnyLinkableHash,
    pub target_type: String,
    pub creation_time: Timestamp,
    pub maybe_original_author: Option<AgentPubKey>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
pub struct AuthorshipLog {
    pub creation_time: Timestamp,
    pub original_author: AgentPubKey,
    /* pub signature */
}

impl AuthorshipLog {
    pub fn new(ts: Timestamp, author: AgentPubKey) -> Self { Self {creation_time: ts, original_author: author}}
}

/// TODO VALIDATION: only author of target should be allowed to ascribe entry to self
#[hdk_extern]
#[feature(zits_blocking)]
pub fn ascribe_target(input: AscribeTargetInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    //let me = agent_info()?.agent_latest_pubkey;
    // if input.maybe_original_author == me {
    //     return error("Original author is already the author. No need to create a link");
    // }
    let tp = get_type_tp(input.target_type)?;
    //let mut author_target: AnyLinkableHash = Path::from(ROOT_ANCHOR_UNKNOWN_AUTHOR).typed(AuthorshipLinkType::AuthorshipPath)?.path_entry_hash()?.into();
    let original_author = input.maybe_original_author.unwrap_or(AgentPubKey::from_raw_36(vec![0; 36]));
    let log = AuthorshipLog::new(input.creation_time, original_author.clone());
    let tag = obj2Tag(log)?;
    let _ah = create_link(tp.path_entry_hash()?, input.target.clone(), AuthorshipLinkType::Target, tag)?;
    let _ah2 = create_link(input.target, original_author, AuthorshipLinkType::Author, ts2Tag(input.creation_time))?;
    Ok(())
}


/// TODO VALIDATION: only author of entry should be allowed to ascribe entry to self
/// Return creation_time, author and type
#[hdk_extern]
#[feature(zits_blocking)]
pub fn ascribe_app_entry(ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, String)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let record = get_record(AnyDhtHash::from(ah.clone()))?;
    let (target_type, _entry) = get_app_entry_name(ah.clone().into(), CallTargetCell::Local)?;
    /// Form input & create link
    let input = AscribeTargetInput {
        target: ah.into(),
        target_type: target_type.to_string(),
        creation_time: record.action().timestamp(),
        maybe_original_author: Some(record.action().author().to_owned()),
    };
    let _ah = ascribe_target(input.clone());
    Ok((input.creation_time, input.maybe_original_author.unwrap(), input.target_type))
}


///
#[hdk_extern]
pub fn get_all_ascribed_types(_: ()) -> ExternResult<Vec<String>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
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
pub fn get_author(target: AnyLinkableHash) -> ExternResult<Option<(Timestamp, AgentPubKey)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    //let tp = get_type_tp(target_type)?;
    let authors = get_links(link_input(target, AuthorshipLinkType::Author, None))?;
    if authors.len() == 0 {
        return Ok(None);
    }
    let link = authors.into_iter().next().unwrap();
    let ts = tag2Ts(link.tag);
    let op = link.target.into_agent_pub_key().unwrap();
    /// Done
    Ok(Some((ts, op)))
}


/// Return empty agentPubKey if no author was provides when ascribing
#[hdk_extern]
pub fn get_all_ascribed_entries(_: ()) -> ExternResult<Vec<(String, AnyLinkableHash, Timestamp, AgentPubKey)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
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
pub fn get_ascribed_type_children(target_type: String) -> ExternResult<Vec<(AnyLinkableHash, Timestamp, AgentPubKey)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let tp = get_type_tp(target_type)?;
    let targets = get_links(link_input(tp.path_entry_hash()?, AuthorshipLinkType::Target, None))?;
    let result: Vec<(AnyLinkableHash, Timestamp, AgentPubKey)> = targets.into_iter().map(|link| {
        let log: AuthorshipLog = decode(&link.tag.into_inner()).unwrap();
        (link.target, log.creation_time, log.original_author)
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
