
mod participation_protocol;
mod create_participation_protocol_from_semantic_topic;


use hdk::hash_path::path::DELIMITER;
use hdk::prelude::*;
use holo_hash::DnaHashB64;
use zome_utils::*;
use threads_integrity::*;
use crate::path_explorer::path2str;



///
fn prefix_threads_path(dna_hash: DnaHashB64, maybe_entry_name: Option<&str>) -> ExternResult<TypedPath> {
  if let Some(entry_name) = maybe_entry_name {
    return Path::from(format!("{}{}{}{}{}", ROOT_ANCHOR_THREADS, DELIMITER, dna_hash.to_string(), DELIMITER, entry_name))
      .typed(ThreadsLinkType::ProtocolsPrefixPath);
  }
  Path::from(format!("{}{}{}", ROOT_ANCHOR_THREADS, DELIMITER, dna_hash.to_string())).typed(ThreadsLinkType::ProtocolsPrefixPath)
}

