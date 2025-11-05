use hdi::prelude::*;
use crate::{validation_app_entry::validate_app_entry, validate_link::validate_create_link};


///
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
   debug!("*** ThreadsIntegrityZome.validate() op = {:?}", op);
   match op {
      Op::StoreRecord ( _ ) => Ok(ValidateCallbackResult::Valid),
      Op::StoreEntry(storeEntry) => {
         let creation_action = storeEntry.action.hashed.into_inner().0;
         let res = validate_entry(creation_action.clone(), storeEntry.entry, Some(creation_action.entry_type()));
         debug!("*** validate_entry() res = {:?}", res);
         res
      },
      Op::RegisterCreateLink(reg_create_link) => {
         return validate_create_link(reg_create_link.create_link.hashed);
         //Ok(ValidateCallbackResult::Valid)
      },
      Op::RegisterDeleteLink (_)=> Ok(ValidateCallbackResult::Valid),
      Op::RegisterUpdate { .. } => Ok(ValidateCallbackResult::Valid),
      Op::RegisterDelete { .. } => Ok(ValidateCallbackResult::Valid),
      Op::RegisterAgentActivity { .. } => Ok(ValidateCallbackResult::Valid),
   }
}


///
pub fn validate_entry(creation_action: EntryCreationAction, entry: Entry, maybe_entry_type: Option<&EntryType>) -> ExternResult<ValidateCallbackResult> {
   /// Determine where to dispatch according to base
   let result = match entry.clone() {
      Entry::CounterSign(_data, _bytes) => Ok(ValidateCallbackResult::Invalid("CounterSign not allowed".into())),
      Entry::Agent(_agent_key) => Ok(ValidateCallbackResult::Valid),
      Entry::CapClaim(_claim) => Ok(ValidateCallbackResult::Valid),
      Entry::CapGrant(_grant) => Ok(ValidateCallbackResult::Valid),
      Entry::App(_entry_bytes) => {
         let EntryType::App(app_entry_def) = maybe_entry_type.unwrap()
            else { unreachable!() };
         let entry_def_index = validate_app_entry(creation_action, app_entry_def.entry_index(), entry);
         entry_def_index
      },
   };
   /// Done
   //debug!("*** validate_entry() result = {:?}", result);
   result
}
