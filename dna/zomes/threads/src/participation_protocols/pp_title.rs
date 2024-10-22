use hdk::prelude::*;
use zome_signals::emit_links_signal;
use threads_integrity::*;
use zome_utils::*;


///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn get_pp_title(pp_ah: ActionHash) -> ExternResult<String> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Make sur pp exists
  let (_eh, pp) = get_typed_from_ah::<ParticipationProtocol>(pp_ah.clone())?;
  /// Get previous title updates
  let title_links = get_links(link_input(pp_ah, ThreadsLinkType::TitleFix, None))?;
  emit_links_signal(title_links.clone())?;
  /// Done
  return match title_links.last() {
    None => Ok(pp.purpose),
    Some(link) => Ok(tag2str(&link.tag)?)
  }
}


///
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePpTitleInput {
  pub pp_ah: ActionHash,
  pub new_title: String,
}


///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn update_pp_title(input: UpdatePpTitleInput) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Make sur pp exists
  let record = get_record(input.pp_ah.clone().into())?;
  /// Make sure we are author
  if record.action().author() != &agent_info()?.agent_latest_pubkey {
    return error("Only PP author can update its title");
  }
  /// Get previous title updates
  let title_links = get_links(link_input(input.pp_ah.clone(), ThreadsLinkType::TitleFix, None))?;
  /// Delete previous title
  for link in title_links {
    delete_link(link.create_link_hash)?;
  }
  /// Set new title
  let ah = create_link(input.pp_ah.clone(), input.pp_ah, ThreadsLinkType::TitleFix, str2tag(&input.new_title))?;
  /// Done
  Ok(ah)
}
