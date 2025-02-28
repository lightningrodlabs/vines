use hdi::prelude::*;
use crate::*;
use crate::{entries::ParticipationProtocol};


/// Taken from Holochain
fn in_scope_link_type<LT>(zome_index: ZomeIndex, link_type: LinkType) -> Result<LT, WasmError>
  where
    LT: LinkTypesHelper,
    WasmError: From<<LT as LinkTypesHelper>::Error>,
{
  match <LT as LinkTypesHelper>::from_type(*zome_index, *link_type)? {
    Some(link_type) => Ok(link_type),
    None => Err(wasm_error!(WasmErrorInner::Host(
        "Op called for zome it was not defined in. This is probably a Holochain bug".to_string()
    ))),
  }
}


///
pub fn validate_create_link(create_link: HoloHashed<CreateLink>) -> ExternResult<ValidateCallbackResult>  {
  let link_type = in_scope_link_type(create_link.zome_index, create_link.link_type)?;

  match link_type {
    ThreadsLinkType::Flagged => {
      let rules = get_moderation_rules(&create_link)?;
      /// Only moderators can flag content
      return is_moderator(&rules, &create_link.author);
    },
    ThreadsLinkType::Banned => {
      let rules = get_moderation_rules(&create_link)?;
      /// Only moderators can ban members
      let is_mod = is_moderator(&rules, &create_link.author)?;
      if let ValidateCallbackResult::Valid = is_mod {
        /// Must provide enough ah of flagged links for same pp
        return has_flagged_been_reached(&rules, &create_link);
      }
      return Ok(is_mod);
    },
    _ => Ok(ValidateCallbackResult::Valid)
  }
}


///
fn get_moderation_rules(create_link: &HoloHashed<CreateLink>) -> ExternResult<Moderation> {
  let ah = create_link.base_address.clone().into_action_hash().unwrap();
  let pp_record = must_get_valid_record(ah.clone())?;
  let pp: ParticipationProtocol = get_typed_from_record(pp_record)?;
  Ok(pp.moderation)
}



///
fn is_moderator(rules: &Moderation, candidat: &AgentPubKey) -> ExternResult<ValidateCallbackResult> {
  if !rules.moderators.contains(candidat) {
    return Ok(ValidateCallbackResult::Invalid("Agent is not a Moderator for this ParticipationProtocol".to_string()));
  }
  Ok(ValidateCallbackResult::Valid)
}


///
fn has_flagged_been_reached(rules: &Moderation, create_link: &HoloHashed<CreateLink>) -> ExternResult<ValidateCallbackResult> {
  let vilain = create_link.target_address.clone().into_agent_pub_key().unwrap();
  let tag_data = create_link.tag.clone().into_inner();
  let links: Vec<ActionHash> = decode(&tag_data)
    .map_err(|e|wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  /// Make sure all links are correct
  for link_ah in &links {
    let sah = must_get_action(link_ah.clone())?;
    let Action::CreateLink(create_flag_link) = sah.action() else {
      return Err(wasm_error!("{}", format!("LinkTag does not hold an CreateLinke ActionHash. {}", link_ah)));
    };
    /// Make sure link target entry is author is same as ban target
    let entry = must_get_valid_record(create_flag_link.target_address.clone().into_action_hash().unwrap())?;
    if entry.action().author() != &vilain || create_link.base_address != create_flag_link.base_address {
      return Ok(ValidateCallbackResult::Invalid("Provided links must be for the same ParticipationProtocol and author".to_string()));
    }
  }
  /// Must have enough links
  if links.len() < rules.allowed_flags as usize {
    return Ok(ValidateCallbackResult::Invalid("Flagged content amount has not been reached ".to_string()));
  }
  /// Done
  Ok(ValidateCallbackResult::Valid)
}


/// Get typed Entry from Record
pub fn get_typed_from_record<T: TryFrom<Entry>>(record: Record) -> ExternResult<T> {
  let RecordEntry::Present(entry) = record.entry() else {
    return Err(wasm_error!("{}", format!("Record does not hold an Entry. {}", record.action_address())));
  };
  let res = T::try_from(entry.clone());
  return res.map_err(|_e| {
    wasm_error!(format!("Converting Entry to type failed for entry: {:?}", entry))
  });
}
