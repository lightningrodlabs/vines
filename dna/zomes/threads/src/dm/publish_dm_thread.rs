use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;


/// Publish a Pp off of another Agent
#[hdk_extern]
#[feature(zits_blocking)]
pub fn publish_dm_thread(other_agent: AgentPubKey) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let me = agent_info()?.agent_latest_pubkey;
  if me == other_agent {
    return error("Cannot DM self");
  }
  /// Create PP
  let pp = ParticipationProtocol {
    purpose: "Private conversation".to_string(),
    rules: "privacy".to_string(),
    subject_name: "agent".to_string(),
    subject: Subject {
      hash: other_agent.clone().into(),
      type_name: DM_SUBJECT_TYPE_NAME.to_string(),
      dna_hash: dna_info()?.hash,
      applet_id: "".to_string(),
    }
  };
  let pp_entry = ThreadsEntry::ParticipationProtocol(pp.clone());
  let pp_ah = create_entry(pp_entry)?;
  //let pp_eh = hash_entry(pp_entry)?;
  /// Link Agents to PP
  create_link(
    me.clone(),
    pp_ah.clone(),
    ThreadsLinkType::Dm,
    hash2tag(other_agent.clone()), // str2tag(&subject_hash_str), // Store Subject Hash in Tag
  )?;
  create_link(
    other_agent.clone(),
    pp_ah.clone(),
    ThreadsLinkType::Dm,
    hash2tag(me),
  )?;
  /// Done
  Ok(pp_ah)
}
