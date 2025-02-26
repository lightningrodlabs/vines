use hdi::prelude::*;
use crate::*;


/// Call trait ZomeEntry::validate()
pub(crate) fn validate_app_entry(creation_action: EntryCreationAction, entry_index: EntryDefIndex, entry: Entry)
  -> ExternResult<ValidateCallbackResult>
{
  let variant = entry_index_to_variant(entry_index)?;
  return match variant {
    ThreadsEntryTypes::AnyBead => {let ab = AnyBead::try_from(entry)?; return validate_bead(creation_action, BaseBeadKind::AnyBead(ab))},
    ThreadsEntryTypes::EntryBead => {let ab = EntryBead::try_from(entry)?; return validate_bead(creation_action, BaseBeadKind::EntryBead(ab))},
    ThreadsEntryTypes::TextBead => {let ab = TextBead::try_from(entry)?; return validate_bead(creation_action, BaseBeadKind::TextBead(ab))},
    // ThreadsEntryTypes::EncryptedBead,
    // ThreadsEntryTypes::ParticipationProtocol,
    ThreadsEntryTypes::SemanticTopic => Ok(ValidateCallbackResult::Valid),
    ThreadsEntryTypes::GlobalLastProbeLog => Ok(ValidateCallbackResult::Valid),
    ThreadsEntryTypes::ThreadLastProbeLog => Ok(ValidateCallbackResult::Valid),
    _ => Ok(ValidateCallbackResult::Valid),
  }
}


///
fn validate_bead(creation_action: EntryCreationAction, base: BaseBeadKind) -> ExternResult<ValidateCallbackResult> {
  let bead = base.bead();
  let author = creation_action.author();
  /// Grab Rules
  let sah = must_get_action(bead.pp_ah)?;
  let Action::Create(pp_create) = sah.action() else {
    return Err(wasm_error!("ppAh in bead should be a create action".to_string()));
  };
  let pp_entry = must_get_entry(pp_create.entry_hash.to_owned())?;
  let pp = ParticipationProtocol::try_from(pp_entry.content)?;
  /// Fail if manual rules and author has been banned
  /// FIXME
  /// Ok if not Auto Rules
  let Rules::Auto(rules) = pp.rules else {
    return Ok(ValidateCallbackResult::Valid);
  };
  /// Check if author is allowed
  if !rules.allowed_agents.is_empty() && !rules.allowed_agents.contains(author) {
    return Ok(ValidateCallbackResult::Invalid("Author not allowed".to_string()));
  }
  /// Check shared cap
  /// FIXME
  /// Check agent cap
  check_agent_cap(creation_action.prev_action(), author, &rules, sah.action_address())?;
  /// Check bead type
  match base {
    BaseBeadKind::AnyBead(_ab) => {
      if !rules.can_wal {
        return Ok(ValidateCallbackResult::Invalid("WAL type not allowed".to_string()));
      }
    },
    BaseBeadKind::EntryBead(eb) => {
      let Some(fileRules) = rules.can_file else {
        return Ok(ValidateCallbackResult::Invalid("File type not allowed".to_string()));
      };
      return validate_entry_bead(fileRules, eb)
    },
    BaseBeadKind::TextBead(tb) => {
      let Some(textRules) = rules.can_text else {
        return Ok(ValidateCallbackResult::Invalid("Text type not allowed".to_string()));
      };
      return validate_text_bead(textRules, tb)
    },
  }
  /// Done
  Ok(ValidateCallbackResult::Valid)
}


///
pub fn check_agent_cap(prev_ah: &ActionHash, author: &AgentPubKey, rules: &AutoRules, pp_ah: &ActionHash) -> ExternResult<ValidateCallbackResult> {
  let Some(agent_limit) = rules.maybe_agent_cap_per_day else {
    return Ok(ValidateCallbackResult::Valid);
  };
  /// Get all agent beads on this thread
  let mut hash_set = HashSet::new();
  hash_set.insert(pp_ah.to_owned());
  let filter: ChainFilter<ActionHash> = ChainFilter {
    chain_top: prev_ah.to_owned(),
    include_cached_entries: true,
    filters: ChainFilters::Until(hash_set),
  };
  /// Get all authors create bead entries since thread was created
  let chain = must_get_agent_activity(author.to_owned(), filter)?;
  let create_beads: Vec<Create> = chain.iter()
    .filter_map(|activity| match &activity.action.hashed.content {
      Action::Create(create) => Some(create.clone()),
      _ => None,
    })
    .filter(|create| {
      create.entry_type == EntryType::App(ThreadsEntryTypes::EntryBead.try_into().unwrap())
        || create.entry_type == EntryType::App(ThreadsEntryTypes::AnyBead.try_into().unwrap())
        || create.entry_type == EntryType::App(ThreadsEntryTypes::TextBead.try_into().unwrap())
    })
    .collect();
  if create_beads.len() < agent_limit as usize {
    return Ok(ValidateCallbackResult::Valid);
  }
  /// Filter beads for this thread only
  /// Get all entries
  let mut bead_count = 0;
  for create in create_beads.iter() {
    let entry = must_get_entry(create.entry_hash.to_owned())?;
    if let Ok(ab) = AnyBead::try_from(entry.content.to_owned()) {
       if &ab.bead.pp_ah == pp_ah {
         bead_count += 1;
       }
      continue;
    }
    if let Ok(base) = TextBead::try_from(entry.content.to_owned()) {
      if &base.bead.pp_ah == pp_ah {
        bead_count += 1;
      }
      continue;
    }
    if let Ok(base) = EntryBead::try_from(entry.content.to_owned()) {
      if &base.bead.pp_ah == pp_ah {
        bead_count += 1;
      }
      continue;
    }
  }
  ///
  if bead_count > agent_limit {
    let msg = format!("Message cap reached by agent");
    return Ok(ValidateCallbackResult::Invalid(msg));
  }
  /// Done
  Ok(ValidateCallbackResult::Valid)
}


///
pub fn validate_entry_bead(rules: FileRules, eb: EntryBead) -> ExternResult<ValidateCallbackResult> {
  /// Check type
  if !rules.allowed_file_types.is_empty() && !rules.allowed_file_types.contains(&eb.source_type) {
    let msg = format!("File type '{}' is not allowed", eb.source_type);
    return Ok(ValidateCallbackResult::Invalid(msg));
  }
  /// FIXME: Check size limit
  // let response = call(
  //   CallTargetCell::OtherRole(input.role_name.clone()),
  //   ZomeName::from(input.zome_name.clone()),
  //   "get_any_record".into(),
  //   None,
  //   input.eh.clone())?;
  /// Done
  Ok(ValidateCallbackResult::Valid)
}


///
pub fn validate_text_bead(rules: TextRules, tb: TextBead) -> ExternResult<ValidateCallbackResult> {
  /// Check length limit
  if tb.value.len() < rules.min_text_length as usize {
    let msg = format!("Text message is too short: {}", tb.value.len());
    return Ok(ValidateCallbackResult::Invalid(msg));
  }
  if rules.max_text_length > 0 && tb.value.len() > rules.max_text_length as usize {
    let msg = format!("Text message is too long: {}", tb.value.len());
    return Ok(ValidateCallbackResult::Invalid(msg));
  }
  /// Check banned words
  let banned_word_set: HashSet<String> = rules.banned_words.iter().map(|w| w.to_lowercase()).collect();
  let binding = tb.value.to_lowercase();
  let words: Vec<&str> = binding.split_whitespace().collect();
  for word in words {
    if banned_word_set.contains(word) {
      let msg = format!("Text contains forbidden word: {}", word);
      return Ok(ValidateCallbackResult::Invalid(msg));
    }
  }
  /// Done
  Ok(ValidateCallbackResult::Valid)
}
