use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use crate::*;
use crate::last_probe_log::*;

#[hdk_extern]
pub fn query_all(_: ()) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   query_semantic_topics(())?;
   query_global_log(())?;
   query_pps(())?;
   query_thread_logs(())?;
   query_any_beads(())?;
   query_entry_beads(())?;
   query_text_beads(())?;
   query_enc_beads(())?;
   Ok(())
}


///
#[hdk_extern]
pub fn query_pps(_: ()) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let tuples = get_all_local(ThreadsEntryTypes::ParticipationProtocol.try_into().unwrap())?;
   /// Emit Self Signal
   let pulses = tuples.into_iter()
     .map(|(ah, create, entry)| {
        let typed = ThreadsEntry::ParticipationProtocol(ParticipationProtocol::try_from(entry).unwrap());
        return entry_signal_ah(StateChange::Create(false), &create, typed, ah);
     })
     .collect();
   emit_self_signal(pulses)?;
   Ok(())
}


///
#[hdk_extern]
pub fn query_semantic_topics(_: ()) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   query_all_typed::<SemanticTopic>(ThreadsEntryTypes::SemanticTopic.try_into().unwrap())?;
   /// Done
   Ok(())
}


/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_any_beads(_: ()) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let tuples = get_all_local(ThreadsEntryTypes::AnyBead.try_into().unwrap())?;
   /// Emit Self Signal
   let pulses = tuples.into_iter()
     .map(|(ah, create, entry)| {
        let typed = ThreadsEntry::AnyBead(AnyBead::try_from(entry).unwrap());
        return entry_signal_ah(StateChange::Create(false), &create, typed, ah);
     })
     .collect();
   emit_self_signal(pulses)?;
   Ok(())
}

/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_entry_beads(_: ()) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let tuples = get_all_local(ThreadsEntryTypes::EntryBead.try_into().unwrap())?;
   /// Emit Self Signal
   let pulses = tuples.into_iter()
     .map(|(ah, create, entry)| {
        let typed = ThreadsEntry::EntryBead(EntryBead::try_from(entry).unwrap());
        entry_signal_ah(StateChange::Create(false), &create, typed, ah)
     })
     .collect();
   emit_self_signal(pulses)?;
   Ok(())
}

/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_text_beads(_: ()) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let tuples = get_all_local(ThreadsEntryTypes::TextBead.try_into().unwrap())?;
   /// Emit Self Signal
   let pulses = tuples.into_iter()
     .map(|(ah, create, entry)| {
        let typed = ThreadsEntry::TextBead(TextBead::try_from(entry).unwrap());
        return entry_signal_ah(StateChange::Create(false), &create, typed, ah);
     })
     .collect();
   emit_self_signal(pulses)?;
   Ok(())
}


/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_enc_beads(_: ()) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let tuples = get_all_local(ThreadsEntryTypes::EncryptedBead.try_into().unwrap())?;
   /// Emit Self Signal
   let pulses = tuples.into_iter()
     .map(|(ah, create, entry)| {
        let typed = ThreadsEntry::EncryptedBead(EncryptedBead::try_from(entry).unwrap());
        return entry_signal_ah(StateChange::Create(false), &create, typed, ah);
     })
     .collect();
   emit_self_signal(pulses)?;
   Ok(())
}


// ///
// #[hdk_extern]
// pub fn query_global_logs(_: ()) -> ExternResult<()> {
//    std::panic::set_hook(Box::new(zome_panic_hook));
//    query_all_typed::<GlobalLastProbeLog>(ThreadsEntryTypes::GlobalLastProbeLog.try_into().unwrap())?;
//    /// Done
//    Ok(())
// }


///
fn query_all_typed<R: TryFrom<Entry>>(entry_type: EntryType) -> ExternResult<()> {
   let EntryType::App(app_entry_def) = entry_type.clone()
     else { return error("Must be an App Entry type") };
   let tuples = get_all_local(entry_type)?;
  /// Emit System Signal
   let pulses = tuples.into_iter()
     .map(|(_ah, create, entry)| {
        let typed = into_typed(entry, &app_entry_def).unwrap();
        return ThreadsSignalProtocol::Entry((EntryInfo::from_action(&Action::Create(create), false),  typed));
     })
     .collect();
   emit_self_signal(pulses)?;
   Ok(())
}


/// Return vec of typed entries of given entry type found in local source chain
fn get_all_local(entry_type: EntryType) -> ExternResult<Vec<(ActionHash, Create, Entry)>> {
   /// Query type
   let query_args = ChainQueryFilter::default()
     .include_entries(true)
     .action_type(ActionType::Create)
     .entry_type(entry_type);
   let records = query(query_args)?;
   /// Get entries for all results
   let mut entries = Vec::new();
   for record in records {
      let RecordEntry::Present(entry) = record.entry() else {
         return zome_error!("Could not convert record");
      };
      let Action::Create(create) = record.action()
        else { panic!("Should be a create Action")};
      entries.push((record.action_address().to_owned(), create.clone(), entry.clone()))
   }
   /// Done
   Ok(entries)
}
