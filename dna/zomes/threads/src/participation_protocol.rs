use hdk::hash_path::path::DELIMITER;
use hdk::prelude::*;
use holo_hash::DnaHashB64;
use zome_utils::*;
use threads_integrity::*;
use crate::path_explorer::path2str;

/// Creates the SemanticTopic
#[hdk_extern]
pub fn create_participation_protocol_from_semantic_topic(pp: ParticipationProtocol) -> ExternResult<ActionHash> {
  if let TopicType::SemanticTopic = pp.topic_type {
  } else {
    return zome_error!("create_participation_protocol_from_semantic_topic() error: ParticipationProtocol is not for a semantic topic. TopicType is {:?}", pp.topic_type);
  }
  let dna_info = dna_info()?;
  let dna_hash: DnaHashB64 = dna_info.hash.into();

  let ah = create_entry(ThreadsEntry::ParticipationProtocol(pp.clone()))?;

  let tp = prefix_threads_path(dna_hash, Some(COMPONENT_SEMANTIC_TOPIC_THREADS))?;
  tp.ensure()?;

  /// Global Threads Index
  debug!("create_participation_protocol_from_semantic_topic(): {} --> {}", path2str(&tp.path).unwrap(), ah);
  create_link(
    tp.path_entry_hash()?,
    ah.clone(),
    ThreadsLinkType::Protocols,
    LinkTag::new(vec![]),
  )?;

  /// Link from Entry/Topic to Protocol
  create_link(
    pp.topic_hash,
    ah.clone(),
    ThreadsLinkType::Threads,
    LinkTag::new(vec![]),
  )?;

  /// Global time-Index
  // FIXME

  /// Done
  Ok(ah)
}


///
fn prefix_threads_path(dna_hash: DnaHashB64, maybe_entry_name: Option<&str>) -> ExternResult<TypedPath> {
  if let Some(entry_name) = maybe_entry_name {
    return Path::from(format!("{}{}{}{}{}", ROOT_ANCHOR_THREADS, DELIMITER, dna_hash.to_string(), DELIMITER, entry_name))
      .typed(ThreadsLinkType::ProtocolsPrefixPath);
  }
  Path::from(format!("{}{}{}", ROOT_ANCHOR_THREADS, DELIMITER, dna_hash.to_string())).typed(ThreadsLinkType::ProtocolsPrefixPath)
}


/// TODO: should be AnyLinkableHash once hc-client-js has defined it
#[hdk_extern]
pub fn get_threads(lh: AnyDhtHash) -> ExternResult<Vec<ActionHash>> {
  let links = get_links(lh, ThreadsLinkType::Threads, None)?;
  let ahs = links
    .into_iter()
    .map(|l| { ActionHash::from(l.target) })
    .collect();
  Ok(ahs)
}


///
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetProtocolsInput {
  dna_hash: DnaHashB64,
  entry_name: String,
}


///
#[hdk_extern]
pub fn get_protocols_for_app_entry_type(input: GetProtocolsInput) -> ExternResult<Vec<ActionHash>> {
  let prefix_path = prefix_threads_path(input.dna_hash, Some(&input.entry_name))?;
  let links = get_links(prefix_path.path_entry_hash()?, ThreadsLinkType::Protocols, None)?;
  let ahs = links
    .into_iter()
    .map(|l| { ActionHash::from(l.target) })
    .collect();
  Ok(ahs)
}


///
#[hdk_extern]
pub fn get_protocols_for_app(dna_hash: DnaHashB64) -> ExternResult<Vec<ActionHash>> {
  let prefix_path = prefix_threads_path(dna_hash, None)?;
  let children = prefix_path.children_paths()?;
  debug!("get_protocols_for_app() found {} children", children.len());
  let mut res = Vec::new();
  for child_path in children {
    let links = get_links(child_path.path_entry_hash()?, ThreadsLinkType::Protocols, None)?;
    let mut ahs = links
      .into_iter()
      .map(|l| { ActionHash::from(l.target) })
      .collect();
    res.append(&mut ahs);
  }
  Ok(res)
}


#[hdk_extern]
pub fn get_protocol(ah: ActionHash) -> ExternResult<ParticipationProtocol> {
  let (_eh, pp) = get_typed_from_ah(ah)?;
  Ok(pp)
}
