use std::collections::{/*BTreeMap,*/ HashMap};
use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;


// ///
// #[hdk_extern]
// pub fn fetch_thread_log(eh: EntryHash) -> ExternResult<ThreadLastProbeLog> {
//   std::panic::set_hook(Box::new(zome_panic_hook));
//   debug!("get_thread_query_log() {:?}", eh);
//   let typed = get_typed_from_eh(eh)?;
//   Ok(typed)
// }



/// Return ActionHash
#[hdk_extern]
#[feature(zits_blocking)]
pub fn commit_thread_log(tql: ThreadLastProbeLog) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let ah = create_entry(ThreadsEntry::ThreadLastProbeLog(tql.clone()))?;
  Ok(ah)
}




/// Get all ThreadQueryLog in local source-chain
/// Return last searched time of each known Thread
#[hdk_extern]
pub fn query_thread_logs(_: ()) -> ExternResult<Vec<ThreadLastProbeLog>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let entry_type = EntryType::App(ThreadsEntryTypes::ThreadLastProbeLog.try_into().unwrap());

  /// Get Create actions
  let create_records = get_all_typed_local::<ThreadLastProbeLog>(entry_type.clone())?;
  let mut hashmap = HashMap::new();
  for (ah, _create, tql) in create_records {
    hashmap.insert(ah, tql);
  }

  /// Get Update actions
  let query_args = ChainQueryFilter::default()
    .include_entries(true)
    .action_type(ActionType::Update)
    .entry_type(entry_type.clone());
  let updates = query(query_args)?;

  for record in updates {
    let Action::Update(update) = record.action().clone()
      else {return zome_error!("Should be an update Action")};
    let Some(prev_log) = hashmap.get(&update.original_action_address)
      else {return zome_error!("Should have a Create for each Update Action")};
    let updated_log: ThreadLastProbeLog = get_typed_from_record(record)?;
    if updated_log.ts > prev_log.ts {
      let _prev = hashmap.insert(update.original_action_address.clone(), updated_log);
    }
  }
  /// Done
  let res = hashmap.into_values().collect();
  Ok(res)
}
