use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use crate::notify_peer::{SendInboxItemInput, NotifiableEvent, send_inbox_item, WeaveNotification};


/// Create a Pp off of another Agent
#[hdk_extern]
#[feature(zits_blocking)]
pub fn create_dm_thread(other_agent: AgentPubKey) -> ExternResult<(ActionHash, WeaveNotification)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let me = agent_info()?.agent_latest_pubkey;
  /// Create PP
  let pp = ParticipationProtocol {
    purpose: "Private conversation".to_string(),
    rules: "privacy".to_string(),
    subject_name: other_agent.to_string(),
    subject: Subject {
      hash: me.clone().into(),
      type_name: "peer".to_string(),
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
  /// Notify other agent author
  let Some((_link_ah, notif)) = send_inbox_item(SendInboxItemInput { content: pp_ah.clone().into(), who: other_agent.clone(), event: NotifiableEvent::Dm })? else {
    return error("Cannot DM self");
  };
  /// Done
  Ok((pp_ah, notif))
}


/// Return ppAhs and timestamp of its index-time
#[hdk_extern]
pub fn get_dm_threads(_: ()) -> ExternResult<Vec<(AgentPubKey, ActionHash)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let links = get_links(link_input(agent_info()?.agent_latest_pubkey, ThreadsLinkType::Dm, None))?;
  let pairs = links
    .into_iter()
    .map(|l| {
      let other = tag2hash(&l.tag).unwrap();
      debug!("get_dm_threads() thread {}, other: {}", l.target, other);
      (other, ActionHash::try_from(l.target).unwrap())
    })
    .collect();
  Ok(pairs)
}
