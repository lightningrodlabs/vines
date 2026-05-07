use hdi::prelude::*;
use crate::*;
use crate::validate_link::validate_create_link;
use crate::validation_create_entry::validate_create_entry;

///
#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
   debug!("*** ThreadsIntegrityZome.validate() op = {:?}", op);
   match op {
      Op::StoreRecord ( _ ) => Ok(ValidateCallbackResult::Valid),
      Op::StoreEntry(storeEntry) => {
         let creation_action = storeEntry.action.hashed.into_inner().0;
         let res = validate_create_entry(creation_action.clone(), storeEntry.entry, Some(creation_action.entry_type()));
         debug!("*** validate_entry() res = {:?}", res);
         res
      },
      Op::RegisterCreateLink(reg_create_link) => {
         return validate_create_link(reg_create_link.create_link.hashed);
         //Ok(ValidateCallbackResult::Valid)
      },
      Op::RegisterDeleteLink (_)=> Ok(ValidateCallbackResult::Valid),
      Op::RegisterUpdate { .. } => Ok(ValidateCallbackResult::Valid),
      Op::RegisterDelete(reg_del) => {
         return validate_delete_entry(reg_del);
         //Ok(ValidateCallbackResult::Valid)
      },
      Op::RegisterAgentActivity { .. } => Ok(ValidateCallbackResult::Valid),
   }
}

///
pub fn validate_delete_entry(reg_del: RegisterDelete) -> ExternResult<ValidateCallbackResult> {
   let delete_action = reg_del.delete.hashed.into_inner().0;
   let Ok(entry) = must_get_entry(delete_action.deletes_entry_address.clone()) else {
      return Ok(ValidateCallbackResult::Invalid("Delete Entry not allowed: Entry not found".to_string()));
   };
   let Ok(sah) = must_get_action(delete_action.deletes_address.clone()) else {
      return Ok(ValidateCallbackResult::Invalid("Delete Entry not allowed: Action not found".to_string()));
   };
   /// Dispatch according to base type
   let result = match entry.content.clone() {
      Entry::CounterSign(_data, _bytes) => Ok(ValidateCallbackResult::Invalid("CounterSign not allowed".into())),
      Entry::Agent(_agent_key) => Ok(ValidateCallbackResult::Valid),
      Entry::CapClaim(_claim) => Ok(ValidateCallbackResult::Valid),
      Entry::CapGrant(_grant) => Ok(ValidateCallbackResult::Valid),
      Entry::App(_entry_bytes) => {
         let Some(EntryType::App(app_entry_def)) = sah.hashed.content.entry_type() else {
            return Ok(ValidateCallbackResult::Invalid("Delete Entry not allowed: Action not EntryType::App".to_string()));
         };
         let variant = entry_index_to_variant(app_entry_def.entry_index)?;
         if variant != ThreadsEntryTypes::ParticipationProtocol {
            return Ok(ValidateCallbackResult::Invalid("Delete Entry not allowed: Entry not a ParticipationProtocol".to_string()));
         }
         let pp = ParticipationProtocol::try_from(entry)?;
         return validate_delete_pp(sah.hashed.content, pp);
      },
   };
   /// Done
   //debug!("*** validate_entry() result = {:?}", result);
   result
}


/// Only one moderator allowed to delete a ParticipationProtocol, and with deletion allowed.
pub fn validate_delete_pp(action: Action, pp: ParticipationProtocol) -> ExternResult<ValidateCallbackResult> {
   if !pp.moderation.can_delete_thread {
      return Ok(ValidateCallbackResult::Invalid("Delete ParticipationProtocol not allowed".to_string()))
   }
   if pp.moderation.moderators.len() != 1 {
      return Ok(ValidateCallbackResult::Invalid("Delete ParticipationProtocol requires one unique moderator".to_string()))
   }
   if action.author() != &pp.moderation.moderators[0] {
      return Ok(ValidateCallbackResult::Invalid("Delete ParticipationProtocol requires moderator to be the deleter".to_string()))
   }
   debug!("*** validate_delete_pp() Successful");
   Ok(ValidateCallbackResult::Valid)
}
