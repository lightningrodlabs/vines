use hdk::prelude::*;
use zome_utils::*;
use authorship_zapi::get_original_author;
use zome_signals::*;



#[hdk_extern]
pub fn fetch_beads(bead_ahs: Vec<ActionHash>) -> ExternResult<()> {
   debug!("fetch_beads() {}", bead_ahs.len());
   let mut pulses = Vec::with_capacity(bead_ahs.len());
   for bead_ah in bead_ahs {
      /// Get
      let Some(record) = get(bead_ah.clone(), GetOptions::local())? else {
         error!("fetch_beads(): Bead not found at given ActionHash");
         continue;
      };
      /// Create Pulse
      let mut pulse = EntryPulse::try_from_new_record(record, ValidatedBy::Me, false)?;
      /// Get Original author
      let maybe = get_original_author(bead_ah)?;
      if let Some(pair) = maybe {
         debug!("fetch_beads() original author found: {} || {}", pair.1, pair.0);
         pulse.change_author(pair.1, pair.0);
      }
      ///
      pulses.push(ZomeSignalProtocol::Entry(pulse));
   }
   /// Emit signal
   emit_zome_signal(pulses)?;
   Ok(())
}
