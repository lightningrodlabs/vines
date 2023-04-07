use hdk::prelude::*;
use holo_hash::DnaHashB64;
use zome_utils::*;
use threads_integrity::*;

/// Creates the SemanticTopic
#[hdk_extern]
pub fn create_participation_protocol_from_semantic_topic(pp: ParticipationProtocol) -> ExternResult<ActionHash> {
  if let TopicType::SemanticTopic = pp.topic_type {
    return zome_error!("create_participation_protocol_from_semantic_topic() error: ParticipationProtocol is not for a semantic topic. TopicType is {:?}", pp.topic_type);
  }
  let dna_info = dna_info()?;
  let dna_hash: DnaHashB64 = dna_info.hash.into();

  let ah = create_entry(ThreadsEntry::ParticipationProtocol(pp.clone()))?;

  let path = prefix_pp_path(dna_hash, Some("semantic_topic"))?;
  path.ensure()?;

  /// Global Threads Index
  create_link(
    path.path_entry_hash()?,
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
fn prefix_pp_path(dna_hash: DnaHashB64, maybe_entry_name: Option<&str>) -> ExternResult<TypedPath> {
  if Some(entry_name) = maybe_entry_name {
    return Path::from(format!("all_threads.{}.{}", dna_hash.to_string(), entry_name)).typed(ThreadsLinkType::ProtocolsPrefixPath);
  }
  Path::from(format!("all_threads.{}", dna_hash.to_string())).typed(ThreadsLinkType::ProtocolsPrefixPath)
}


#[hdk_extern]
pub fn get_threads(lh: AnyLinkableHash) -> ExternResult<Vec<ActionHash>> {
  let links = get_links(lh, ThreadsLinkType::Threads, None)?;
  let ahs = links
    .into_iter()
    .map(|l| { ActionHash::from(l.target) })
    .collect();
  Ok(ahs)
}


///
pub struct GetProtocolsInput {
  dna_hash: DnaHashB64,
  entry_name: String,
}


///
#[hdk_extern]
pub fn get_protocols_for_app_entry_type(input: GetProtocolsInput) -> ExternResult<Vec<ActionHash>> {
  let prefix_path = prefix_pp_path(input.dna_hash, Some(&input.entry_name))?;
  let links = get_links(prefix_path.path_entry_hash()?, ThreadsLinkType::Protocols, None)?;
  let ahs = links
    .into_iter()
    .map(|l| { ActionHash::from(l.target) })
    .collect();
  Ok(ahs)
}


///
#[hdk_extern]
pub fn get_protocols_for_app(dnaHash: DnaHashB64) -> ExternResult<Vec<ActionHash>> {
  let prefix_path = prefix_pp_path(input.dna_hash, None)?;
  let links = get_links(prefix_path.path_entry_hash()?, ThreadsLinkType::ProtocolsPrefixPath, None)?;
  let ahs = links
    .into_iter()
    .map(|l| { ActionHash::from(l.target) })
    .collect();
  Ok(ahs)
}
