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
  query_all_typed::<ParticipationProtocol>(ThreadsEntryTypes::ParticipationProtocol.try_into().unwrap())?;
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
   query_all_typed::<AnyBead>(ThreadsEntryTypes::AnyBead.try_into().unwrap())?;
   Ok(())
}

/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_entry_beads(_: ()) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   query_all_typed::<EntryBead>(ThreadsEntryTypes::EntryBead.try_into().unwrap())?;
   Ok(())
}

/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_text_beads(_: ()) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   query_all_typed::<TextBead>(ThreadsEntryTypes::TextBead.try_into().unwrap())?;
   Ok(())
}


/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_enc_beads(_: ()) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   query_all_typed::<EncryptedBead>(ThreadsEntryTypes::EncryptedBead.try_into().unwrap())?;
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
   let tuples = query_all_local(entry_type)?;
  /// Emit System Signal
   let pulses = tuples.into_iter()
     .map(|(ah, create, entry)| {
        let typed = into_typed(entry, &app_entry_def).unwrap();
        let info = entry_info(ah, &Action::Create(create), false, &typed);
        return ThreadsSignalProtocol::Entry((info, typed));
     })
     .collect();
   emit_threads_signal(pulses)?;
   Ok(())
}


/// Return vec of typed entries of given entry type found in local source chain
fn query_all_local(entry_type: EntryType) -> ExternResult<Vec<(ActionHash, Create, Entry)>> {
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
