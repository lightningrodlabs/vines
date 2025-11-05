use crate::*;
use hdi::prelude::*;
use crate::debug::format_timestamp_micros;

/// Call trait ZomeEntry::validate()
pub(crate) fn validate_app_entry(
    creation_action: EntryCreationAction,
    entry_index: EntryDefIndex,
    entry: Entry,
) -> ExternResult<ValidateCallbackResult> {
    //debug!("*** ThreadsIntegrityZome.validate_app_entry() {:?}", entry_index);
    let variant = entry_index_to_variant(entry_index)?;
    return match variant {
        ThreadsEntryTypes::AnyBead => {
            let ab = AnyBead::try_from(entry)?;
            return validate_bead(creation_action, BaseBeadKind::AnyBead(ab));
        }
        ThreadsEntryTypes::EntryBead => {
            let ab = EntryBead::try_from(entry)?;
            return validate_bead(creation_action, BaseBeadKind::EntryBead(ab));
        }
        ThreadsEntryTypes::TextBead => {
            let ab = TextBead::try_from(entry)?;
            return validate_bead(creation_action, BaseBeadKind::TextBead(ab));
        }
        // ThreadsEntryTypes::EncryptedBead,
        ThreadsEntryTypes::ParticipationProtocol => {
            let pp = ParticipationProtocol::try_from(entry)?;
            return validate_pp(creation_action, pp);
        }
        ThreadsEntryTypes::SemanticTopic => Ok(ValidateCallbackResult::Valid),
        ThreadsEntryTypes::GlobalLastProbeLog => Ok(ValidateCallbackResult::Valid),
        ThreadsEntryTypes::ThreadLastProbeLog => Ok(ValidateCallbackResult::Valid),
        _ => Ok(ValidateCallbackResult::Valid),
    };
}

///
fn validate_pp(
    _creation_action: EntryCreationAction,
    pp: ParticipationProtocol,
) -> ExternResult<ValidateCallbackResult> {
    /// at least one moderator
    if pp.moderation.moderators.len() == 0
        && (pp.moderation.instructions.len() > 0 || pp.moderation.allowed_flags > 0)
    {
        return Ok(ValidateCallbackResult::Invalid(
            "Invalid Moderation Rules: Needs at least one moderator".to_string(),
        ));
    }
    /// rate limit must be > 0 if any
    if let Some(rate_limit) = pp.limitations.maybe_agent_rate_limiting {
        if rate_limit.0 == 0 || rate_limit.1 .0 == 0 {
            return Ok(ValidateCallbackResult::Invalid(
                "Invalid Rate limit: Must be > 0".to_string(),
            ));
        }
    }
    /// at least one message type
    if !pp.limitations.can_wal
        && pp.limitations.can_text.is_none()
        && pp.limitations.can_file.is_none()
    {
        return Ok(ValidateCallbackResult::Invalid(
            "Invalid Auto Rules: Needs at least one allowed message type".to_string(),
        ));
    }
    /// text
    if let Some(text_rules) = pp.limitations.can_text {
        if text_rules.max_text_length <= text_rules.min_text_length
            && text_rules.max_text_length > 0
        {
            return Ok(ValidateCallbackResult::Invalid(
                "Invalid Auto Rules: Max text length must be bigger than Min".to_string(),
            ));
        }
    }
    /// file
    if let Some(file_rules) = pp.limitations.can_file {
        if file_rules.max_file_size <= file_rules.min_file_size && file_rules.max_file_size > 0 {
            return Ok(ValidateCallbackResult::Invalid(
                "Invalid Auto Rules: Max file size must be bigger than Min".to_string(),
            ));
        }
    }

    Ok(ValidateCallbackResult::Valid)
}

///
fn validate_bead(
    creation_action: EntryCreationAction,
    base: BaseBeadKind,
) -> ExternResult<ValidateCallbackResult> {
    debug!("*** ThreadsIntegrityZome.validate_bead() {:?}", base);
    let bead = base.bead();
    let author = creation_action.author();
    /// Grab Rules
    let sah = must_get_action(bead.pp_ah)?;
    let Action::Create(pp_create) = sah.action() else {
        return Err(wasm_error!(
            "ppAh in bead should be a create action".to_string()
        ));
    };
    let pp_entry = must_get_entry(pp_create.entry_hash.to_owned())?;
    let pp = ParticipationProtocol::try_from(pp_entry.content)?;
    /// Fail if there is moderation and author has been banned
    /// FIXME
    /// Check if author is allowed
    if !pp.limitations.allowed_agents.is_empty() && !pp.limitations.allowed_agents.contains(author)
    {
        return Ok(ValidateCallbackResult::Invalid(
            "Author not allowed".to_string(),
        ));
    }
    /// Check shared cap
    /// FIXME
    /// Check agent cap
    let check = check_agent_cap(
        creation_action.timestamp(),
        creation_action.prev_action(),
        author,
        &pp.limitations,
        sah.action_address(),
    )?;
    if let ValidateCallbackResult::Valid = check {
        /// Check bead type
        match base {
            BaseBeadKind::AnyBead(_ab) => {
                if !pp.limitations.can_wal {
                    return Ok(ValidateCallbackResult::Invalid(
                        "WAL type not allowed".to_string(),
                    ));
                }
            }
            BaseBeadKind::EntryBead(eb) => {
                let Some(fileRules) = pp.limitations.can_file else {
                    return Ok(ValidateCallbackResult::Invalid(
                        "File type not allowed".to_string(),
                    ));
                };
                return validate_entry_bead(fileRules, eb);
            }
            BaseBeadKind::TextBead(tb) => {
                let Some(textRules) = pp.limitations.can_text else {
                    return Ok(ValidateCallbackResult::Invalid(
                        "Text type not allowed".to_string(),
                    ));
                };
                return validate_text_bead(textRules, tb);
            }
        }
    }
    /// Done
    Ok(check)
}

///
pub fn check_agent_cap(
   creation_ts: &Timestamp,
   prev_ah: &ActionHash,
   author: &AgentPubKey,
   rules: &Limitations,
   pp_ah: &ActionHash,
) -> ExternResult<ValidateCallbackResult> {
    let Some(rate_limit) = rules.maybe_agent_rate_limiting else {
        return Ok(ValidateCallbackResult::Valid);
    };
    debug!("check_agent_cap() limit: {:?}", rate_limit);
    let some_time_ago = creation_ts.0 -  rate_limit.1.0;
    debug!("check_agent_cap()\n - creation_ts: {} \n - rate_limit: {} \n - some_time_ago: {}"
      , format_timestamp_micros(creation_ts.0)
      , format_timestamp_micros(rate_limit.1.0)
      , format_timestamp_micros(some_time_ago));
    /// Get all agent's activity in current timebox.
    let filter: ChainFilter<ActionHash> = ChainFilter {
        chain_top: prev_ah.to_owned(),
        include_cached_entries: true,
        limit_conditions: LimitConditions::UntilTimestamp(Timestamp(some_time_ago)),
    };
    let chain = must_get_agent_activity(author.to_owned(), filter)?;
    debug!("check_agent_cap()  chain: {}", chain.len());
    /// Get all author's Create Bead Entries since thread was created
    let create_beads: Vec<Create> = chain
        .iter()
        // Only creates
        .filter_map(|activity| match &activity.action.hashed.content {
            Action::Create(create) => Some(create.clone()),
            _ => None,
        })
        // Only beads
        .filter(|create| {
            create.entry_type == EntryType::App(ThreadsEntryTypes::EntryBead.try_into().unwrap())
                || create.entry_type
                    == EntryType::App(ThreadsEntryTypes::AnyBead.try_into().unwrap())
                || create.entry_type
                    == EntryType::App(ThreadsEntryTypes::TextBead.try_into().unwrap())
        })
        .collect();
    debug!("check_agent_cap() create_beads: {}", create_beads.len());
    /// Leave early is already under the limit
    if create_beads.len() < rate_limit.0 as usize {
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
    debug!("check_agent_cap() bead_count: {}", bead_count);
    ///
    if bead_count >= rate_limit.0 {
        let msg = format!("Message cap reached by agent");
        return Ok(ValidateCallbackResult::Invalid(msg));
    }
    /// Done
    Ok(ValidateCallbackResult::Valid)
}

/// TODO: For validation to work, it would required holochain to allow to grab the Manifest from Files cell and check its values.
/// TODO: Other solution would be to add sub_type and size fields to EntryBead.
pub fn validate_entry_bead(
    rules: FileLimits,
    eb: EntryBead,
) -> ExternResult<ValidateCallbackResult> {
    /// FIXME: Not allowed in HDI
    // let response = call(
    //   CallTargetCell::OtherRole(eb.source_role.clone()),
    //   ZomeName::from(eb.source_zome.clone()),
    //   "get_any_record".into(),
    //   None,
    //   eb.source_eh.clone())?;

    // Check subtype
    if !rules.allowed_file_types.is_empty()
        && !rules.allowed_file_types.contains(&eb.source_sub_type)
    {
        let msg = format!(
            "File type '{}' is not allowed on this thread. Allowed types: {:?}",
            eb.source_sub_type, rules.allowed_file_types
        );
        return Ok(ValidateCallbackResult::Invalid(msg));
    }

    /// Check size limit
    if eb.source_size < rules.min_file_size || eb.source_size > rules.max_file_size {
        let msg = format!("File size of {} bytes is not allowed on this thread. Allowed size range: [{} ; {}] bytes", eb.source_size, rules.min_file_size, rules.max_file_size);
        return Ok(ValidateCallbackResult::Invalid(msg));
    }

    /// Done
    Ok(ValidateCallbackResult::Valid)
}

///
pub fn validate_text_bead(rules: TextLimits, tb: TextBead) -> ExternResult<ValidateCallbackResult> {
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
    let banned_word_set: HashSet<String> = rules
        .banned_words
        .iter()
        .map(|w| w.to_lowercase())
        .collect();
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
