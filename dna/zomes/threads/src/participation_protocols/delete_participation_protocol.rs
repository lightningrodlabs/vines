use hdk::prelude::*;
use zome_signals::{determine_validation, emit_zome_signal, EntryPulse, ZomeSignalProtocol};
use zome_utils::*;


///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn delete_participation_protocol(pp_ah: ActionHash) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let _ = delete_entry(DeleteInput::new(pp_ah, ChainTopOrdering::Relaxed))?;
   Ok(())
}


///
#[hdk_extern]
pub fn is_participation_protocol_deleted(pp_ah: ActionHash) -> ExternResult<bool> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   let Some(details) = get_details(pp_ah, GetOptions::local())? else {
      return Ok(false);
   };
   match details {
      Details::Entry(entry_details) => {
         let Some(first) = entry_details.deletes.first() else {
            return Ok(false);
         };
         let validation = determine_validation(&first.hashed.hash);
         let Some(entry_type) = entry_details.actions.first().unwrap().action().entry_type() else {
            return zome_error!("Missing entry_type during is_participation_protocol_deleted() a");
         };
         let pulse = EntryPulse::try_with_delete_action_no_bytes(first.hashed.clone(), entry_type.to_owned(), validation, false)?;
         let _ = emit_zome_signal(vec![ZomeSignalProtocol::Entry(pulse)]);
         Ok(true)
      },
      Details::Record(rec_details) => {
         let Some(first) = rec_details.deletes.first() else {
            return Ok(false);
         };
         let validation = determine_validation(&first.hashed.hash);
         let Some(entry_type) = rec_details.record.action().entry_type() else {
            return zome_error!("Missing entry_type during is_participation_protocol_deleted() b");
         };
         let pulse = EntryPulse::try_with_delete_action_no_bytes(first.hashed.clone(), entry_type.to_owned(), validation, false)?;
         let _ = emit_zome_signal(vec![ZomeSignalProtocol::Entry(pulse)]);
         ///
         Ok(true)
      },
   }
}
