use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
//use crate::notify_peer::{SendInboxItemInput, NotifiableEvent, send_inbox_item, WeaveNotification};


/// Create a Pp off of another Agent
#[hdk_extern]
#[feature(zits_blocking)]
pub fn create_dm_thread(other_agent: AgentPubKey) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let me = agent_info()?.agent_latest_pubkey;
  if me == other_agent {
    return error("Cannot DM self");
  }
  /// Create PP
  let pp = ParticipationProtocol {
    purpose: "Private conversation".to_string(),
    rules: "privacy".to_string(),
    subject_name: other_agent.to_string(),
    subject: Subject {
      hash: me.clone().into(),
      type_name: "AgentPubKey".to_string(),
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
    hash2tag(other_agent.clone()),
    // str2tag(&subject_hash_str), // Store Subject Hash in Tag
  )?;
  create_link(
    other_agent.clone(),
    pp_ah.clone(),
    ThreadsLinkType::Dm,
    hash2tag(me),
  )?;
  // /// Notify other agent author
  //let (_link_ah, notif) = send_inbox_item(SendInboxItemInput { content: pp_ah.clone().into(), who: other_agent.clone(), event: NotifiableEvent::Dm })?.unwrap();
  /// Done
  Ok(pp_ah)
}


// #[hdk_extern]
// #[feature(zits_blocking)]
// pub fn hide_dm_thread(other_agent: AgentPubKey) -> ExternResult<()> {
//   std::panic::set_hook(Box::new(zome_panic_hook));
//   let me = agent_info()?.agent_latest_pubkey;
//   let links = get_links(link_input(me, ThreadsLinkType::Dm, Some(hash2tag(other_agent))))?;
//   for link in links {
//     delete_link(link.create_link_hash)?;
//   }
//   Ok(())
// }
//
//
// #[hdk_extern]
// #[feature(zits_blocking)]
// pub fn unhide_dm_thread(other_agent: AgentPubKey) -> ExternResult<ActionHash> {
//   std::panic::set_hook(Box::new(zome_panic_hook));
//   let me = agent_info()?.agent_latest_pubkey;
//   create_link(
//     me.clone(),
//     pp_ah.clone(),
//     ThreadsLinkType::Dm,
//     hash2tag(other_agent.clone()),
//     // str2tag(&subject_hash_str), // Store Subject Hash in Tag
//   )?;
// }
