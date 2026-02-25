use std::collections::{BTreeMap};
use authorship_integrity::*;
use hdi::hash_path::path::DELIMITER;
use hdk::prelude::*;
use zome_utils::*;
use zome_path::*;
use zome_core::get_input_types::*;

///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AscribeTargetInput {
    pub target: AnyLinkableHash,
    pub target_type: String,
    pub original_creation_time: Timestamp,
    pub original_author: AgentPubKey,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
pub struct AuthorshipLog {
    pub original_creation_time: Timestamp,
    pub original_author: AgentPubKey,
    /* pub signature */
}

impl AuthorshipLog {
    pub fn new(ts: Timestamp, author: AgentPubKey) -> Self {
        Self {
            original_creation_time: ts,
            original_author: author,
        }
    }
}

/// TODO: VALIDATION: only author of target should be allowed to ascribe entry to self
/// We link the target's type to the target for indexing and the target to its original author (AgentPubKey)
#[hdk_extern]
#[feature(zits_blocking)]
pub fn ascribe_target(input: AscribeTargetInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    //let me = agent_info()?.agent_initial_pubkey;
    // if input.maybe_original_author == me {
    //     return error("Original author is already the author. No need to create a link");
    // }
    let tp = get_type_tp(input.target_type)?;
    //let mut author_target: AnyLinkableHash = Path::from(ROOT_ANCHOR_UNKNOWN_AUTHOR).typed(AuthorshipLinkType::AuthorshipPath)?.path_entry_hash()?.into();
    let log = AuthorshipLog::new(input.original_creation_time, input.original_author.clone());
    let tag = obj2Tag(log)?;
    let _ah = create_link(
        tp.path_entry_hash()?,
        input.target.clone(),
        AuthorshipLinkType::Target,
        tag,
    )?;
    let _ah2 = create_link(
       input.target,
       input.original_author,
       AuthorshipLinkType::Author,
       ts2Tag(input.original_creation_time),
    )?;
    // FIXME: attest the created links
    ///
    Ok(())
}

/// TODO: VALIDATION: only author of entry should be allowed to ascribe entry to self
/// Determine the type of an app entry and ascribe it to its current author
/// Returns creation_time, author and type
#[hdk_extern]
#[feature(zits_blocking)]
pub fn ascribe_app_entry(ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, String)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let record = get_record(AnyDhtHash::from(ah.clone()), GetStrategy::Local)?;
    let (target_type, _entry) = get_app_entry_name(ah.clone().into(), CallTargetCell::Local, GetStrategy::Local)?;
    /// Form input & create link
    let input = AscribeTargetInput {
        target: ah.into(),
        target_type: target_type.to_string(),
        original_creation_time: record.action().timestamp(),
        original_author: record.action().author().to_owned(),
    };
    let _ah = ascribe_target(input.clone());
    Ok((
       input.original_creation_time,
       input.original_author,
       input.target_type,
    ))
}

///
#[hdk_extern]
pub fn get_all_ascribed_types(strategy: GetStrategy) -> ExternResult<Vec<String>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let tp = Path::from(ROOT_ANCHOR_AUTHORSHIP).typed(AuthorshipLinkType::AuthorshipPath)?;
    let children_tps = tp_children_paths(&tp, strategy)?;
    let result = children_tps
        .into_iter()
        .map(|tp| {
            let leaf = tp.leaf().unwrap();
            let str = String::try_from(leaf).unwrap();
            str
        })
        .collect();
   // TODO: attest links
    Ok(result)
}

/// Returns an empty AgentPubKey if no author were provided when ascribing.
#[hdk_extern]
pub fn get_author(input: GetLhInput) -> ExternResult<Option<(Timestamp, AgentPubKey)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let authors = get_links(
        LinkQuery::new(
           input.lh,
            AuthorshipLinkType::Author.try_into_filter().unwrap(),
        ),
        input.strategy,
    )?;
    if authors.is_empty() {
        return Ok(None);
    }
    let link = authors.into_iter().next().unwrap();
    let ts = tag2Ts(link.tag);
    let op = link.target.into_agent_pub_key().unwrap();
    /// Done
    Ok(Some((ts, op)))
}


///
#[hdk_extern]
pub fn get_authors(input: GetManyLhInput) -> ExternResult<BTreeMap<AnyLinkableHash, (Timestamp, AgentPubKey)>> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let mut result = BTreeMap::new();
   for target in input.lhs.iter() {
      let authors = get_links(
         LinkQuery::new(
            target.clone(),
            AuthorshipLinkType::Author.try_into_filter().unwrap(),
         ),
         input.strategy,
      )?;
      if authors.len() == 0 {
         continue;
      }
      let link = authors.into_iter().next().unwrap();
      let ts = tag2Ts(link.tag);
      let author = link.target.into_agent_pub_key().unwrap();
      result.insert(target.clone(), (ts, author));
   }
   /// Done
   Ok(result)
}


/// WARNING: get_links() loop.
/// Returns an empty agentPubKey if no author were provided when ascribing.
#[hdk_extern]
pub fn get_all_ascribed_entries(_: ())
   -> ExternResult<Vec<(String, AnyLinkableHash, Timestamp, AgentPubKey)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let child_types = get_all_ascribed_types(GetStrategy::Local)?;
    let mut result = Vec::new();
    for child_type in child_types {
        let children = get_ascribed_type_children(child_type.clone())?;
        for child in children {
            result.push((child_type.to_owned(), child.0, child.1, child.2))
        }
    }
    Ok(result)
}

/// Returns an empty AgentPubKey if no author were provided when ascribing.
#[hdk_extern]
pub fn get_ascribed_type_children(
    target_type: String,
) -> ExternResult<Vec<(AnyLinkableHash, Timestamp, AgentPubKey)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let tp = get_type_tp(target_type)?;
    let targets = get_links(
        LinkQuery::new(
            tp.path_entry_hash()?,
            AuthorshipLinkType::Target.try_into_filter().unwrap(),
        ),
        GetStrategy::Local,
    )?;
    let result: Vec<(AnyLinkableHash, Timestamp, AgentPubKey)> = targets
        .into_iter()
        .map(|link| {
            let log: AuthorshipLog = decode(&link.tag.into_inner()).unwrap();
            (link.target, log.original_creation_time, log.original_author)
        })
        .collect();
    Ok(result)
}


///
pub(crate) fn get_type_tp(target_type: String) -> ExternResult<TypedPath> {
    // convert to lowercase for path for ease of search
    let lower_title = target_type.to_lowercase();
    //
    Path::from(format!(
        "{}{}{}",
        ROOT_ANCHOR_AUTHORSHIP,
        DELIMITER,
        lower_title.chars().next().unwrap()
    ))
    .typed(AuthorshipLinkType::AuthorshipPath)
}
