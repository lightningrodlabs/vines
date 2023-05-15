use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use crate::participation_protocols::*;

/// Creates the SemanticTopic
#[hdk_extern]
pub fn create_pp_from_semantic_topic(pp: ParticipationProtocol) -> ExternResult<(ActionHash, Timestamp)> {
  if let SubjectType::SemanticTopic = pp.subject_type {
  } else {
    return zome_error!("create_pp_from_semantic_topic() error: ParticipationProtocol is not for a semantic topic. SubjectType is {:?}", pp.subject_type);
  }

  let dna_info = dna_info()?;

  let pair = create_pp(pp, dna_info.hash, SEMANTIC_TOPIC_TYPE_NAME, None)?;
  Ok(pair)
}

