use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::{BaseBeadKind, ThreadsLinkType};
use zome_signals::*;



///
#[hdk_extern]
#[feature(zits_blocking)]
fn flag_bead(bead_ah: ActionHash) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let record = get_record(AnyDhtHash::from(bead_ah.clone()))?;
  let RecordEntry::Present(entry) = record.entry() else {
    return zome_error!("{}", format!("Record does not hold an Entry. {}", record.action_address()));
  };
  let bead = BaseBeadKind::from(entry).bead();
  return create_link(bead.pp_ah, bead_ah, ThreadsLinkType::Flagged, LinkTag::from(()));
}


// /// TODO: Can't delete once it has been used for banning an agent (must be reflected in deleteLink validation)
// #[hdk_extern]
// #[feature(zits_blocking)]
// fn unflag_bead(subjectHash: AnyLinkableHash) -> ExternResult<ActionHash> {
// std::panic::set_hook(Box::new(zome_panic_hook));
// let Some(create_link_hash) = find_hide_link(subjectHash)?
// else { return Ok(()) };
// let _hash = delete_link(create_link_hash)?;
// Ok(())
// }


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct BanAgentInput {
  vilain: AgentPubKey,
  pp_ah: ActionHash,
  infringements: Vec<ActionHash>, // link ah of flagged beads
}
///
#[hdk_extern]
#[feature(zits_blocking)]
fn ban_agent(input: BanAgentInput) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let tag = obj2Tag(input.infringements)?;
  return create_link(input.pp_ah, input.vilain, ThreadsLinkType::Banned, tag);
}


///
#[hdk_extern]
fn probe_all_flagged(pp_ah: ActionHash) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let links = get_links(link_input(pp_ah, ThreadsLinkType::Flagged, None))?;
  /// Emit Signal
  emit_links_signal(links)?;
  ///
  Ok(())
}

///
#[hdk_extern]
fn probe_all_banned(pp_ah: ActionHash) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let links = get_links(link_input(pp_ah, ThreadsLinkType::Banned, None))?;
  /// Emit Signal
  emit_links_signal(links)?;
  ///
  Ok(())
}
