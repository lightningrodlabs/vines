use std::collections::{/*BTreeMap,*/ HashMap};
use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use crate::*;


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
  //let create_records = get_all_typed_local::<ThreadLastProbeLog>(entry_type.clone())?;
  let query_args = ChainQueryFilter::default()
    .include_entries(true)
    .action_type(ActionType::Create)
    .entry_type(entry_type.clone());
  let create_records = query(query_args)?;

  let mut hashmap: HashMap<ActionHash, Record> = HashMap::new();
  for record in create_records {
    //let entry_info = EntryInfo::from_new_action(&Action::Create(create), false);
    hashmap.insert(record.action_address().to_owned(), record);
  }
  /// Get Update actions
  let query_args = ChainQueryFilter::default()
    .include_entries(true)
    .action_type(ActionType::Update)
    .entry_type(entry_type.clone());
  let updates = query(query_args)?;
  /// Keep newest value
  for record in updates {
    let Action::Update(update) = record.action().clone()
      else {return zome_error!("Should be an update Action")};
    let Some(prev_record) = hashmap.get(&update.original_action_address)
      else {return zome_error!("Should have a Create for each Update Action")};
    let prev_log: ThreadLastProbeLog = get_typed_from_record(prev_record.to_owned())?;
    let updated_log: ThreadLastProbeLog = get_typed_from_record(record.clone())?;
    if updated_log.ts > prev_log.ts {
      //let entry_info = EntryInfo::from_new_action(&Action::Update(update.clone()), false);
      let _prev = hashmap.insert(update.original_action_address.clone(), record);
    }
  }
  /// Emit signals
  let pulses = hashmap.iter()
    .map(|(_ah, record)| {
      let pulse = EntryPulse::try_from_new_record(record.to_owned(), false).unwrap();
      ThreadsSignalProtocol::Entry(pulse)
    })
    .collect();
  emit_threads_signal(pulses)?;
  /// Done
  let res = hashmap.into_values()
    .map(|record| get_typed_from_record(record).unwrap())
    .collect();
  Ok(res)
}
