use hdk::prelude::*;
use authorship_zapi::{get_original_authors};
use zome_signals::*;
use zome_core::get_input_types::*;


#[hdk_extern]
pub fn fetch_beads(input: GetManyAhInput) -> ExternResult<()> {
   debug!("fetch_beads() {}", input.ahs.len());
   let mut pulses = Vec::with_capacity(input.ahs.len());

   let mut records = Vec::new();
   for bead_ah in input.ahs.clone() {
      let Some(record) = get(bead_ah.clone(), GetOptions::local())? else {
         error!("fetch_beads(): Bead not found at given ActionHash");
         continue;
      };
      records.push(record);
   }
   let lhs = records.iter().map(|r| r.signed_action.hashed.hash.clone().into()).collect::<Vec<AnyLinkableHash>>();
   let original_authors = get_original_authors(GetManyLhInput {lhs, strategy: input.strategy})?;

   for record in records {
      /// Create Pulse
      let mut pulse = EntryPulse::try_from_new_record(record.clone(), ValidatedBy::Me, false)?;
      /// Get Original author
      let maybe = original_authors.get(&record.signed_action.hashed.hash);
      if let Some(pair) = maybe {
         debug!("fetch_beads() original author found: {} || {}", pair.1, pair.0);
         pulse.change_author(pair.1.clone(), pair.0);
      }
      ///
      pulses.push(ZomeSignalProtocol::Entry(pulse));
   }
   /// Emit signal
   emit_zome_signal(pulses)?;
   Ok(())
}
