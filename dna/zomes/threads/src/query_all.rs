use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use zome_signals::*;
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
