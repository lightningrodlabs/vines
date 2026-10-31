use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use zome_path::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishDmThreadInput {
  pub other_agent: AgentPubKey,
  pub applet_id: String, // EntryHashB64 of the Applet entry in the group dna (We)
}



/// Largest file a DM may carry, in bytes. The integrity zome rejects anything above
/// `max_file_size`, and `FileLimits::default()` is 0, so the value has to be explicit.
pub const DM_MAX_FILE_SIZE: u32 = 16 * 1024 * 1024;


/// Publish a Pp off of another Agent
#[hdk_extern]
#[feature(zits_blocking)]
pub fn publish_dm_thread(input: PublishDmThreadInput) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let me = agent_info()?.agent_initial_pubkey;
  if me == input.other_agent {
    return zome_error!("Cannot DM self");
  }

  /// Files travel the files module's private path (committed on the sender's chain, delivered
  /// to the other party), so they are allowed. An asset link (WAL) is only a reference, and a
  /// DM bead of any kind is encrypted to the other party, so assets are allowed too.
  let limitations = Limitations {
    can_wal: true,
    can_file: Some(FileLimits {
      allowed_file_types: Vec::new(),
      min_file_size: 0,
      max_file_size: DM_MAX_FILE_SIZE,
    }),
    ..Limitations::default()
  };

  /// Create PP
  let pp = ParticipationProtocol {
    purpose: "Private conversation".to_string(),
    limitations,
    moderation: Moderation::default(),
    //subject_name: "agent".to_string(),
    subject: Subject {
      address: holo_hash_encode(input.other_agent.get_raw_39()),
      name: "agent".to_string(),
      type_name: DM_SUBJECT_TYPE_NAME.to_string(),
      dna_hash_b64: holo_hash_encode(dna_info()?.hash.get_raw_39()),
      applet_id: input.applet_id,
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
    hash2tag(input.other_agent.clone()), // str2tag(&subject_hash_str), // Store Subject Hash in Tag
  )?;
  create_link(
    input.other_agent.clone(),
    pp_ah.clone(),
    ThreadsLinkType::Dm,
    hash2tag(me),
  )?;
  /// Done
  Ok(pp_ah)
}
