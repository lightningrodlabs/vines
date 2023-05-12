use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use crate::participation_protocols::*;

/// Creates the SemanticTopic
#[hdk_extern]
pub fn create_pp_from_semantic_topic(pp: ParticipationProtocol) -> ExternResult<(ActionHash, Timestamp)> {
  if let TopicType::SemanticTopic = pp.topic_type {
  } else {
    return zome_error!("create_pp_from_semantic_topic() error: ParticipationProtocol is not for a semantic topic. TopicType is {:?}", pp.topic_type);
  }

  let dna_info = dna_info()?;

  let ah = create_pp(pp, dna_info.hash, SEMANTIC_TOPIC_TYPE_NAME)?;
  Ok((ah, sys_time()?))
}

