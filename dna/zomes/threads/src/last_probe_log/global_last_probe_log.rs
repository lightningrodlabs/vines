use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use crate::*;


///
#[hdk_extern]
pub fn query_global_log(_ : ()) -> ExternResult<(ActionHash, GlobalLastProbeLog)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  debug!("query_global_log()");
  let entry_type = EntryType::App(ThreadsEntryTypes::GlobalLastProbeLog.try_into().unwrap());
  let tuples = get_all_typed_local::<GlobalLastProbeLog>(entry_type.clone())?;
  if tuples.len() > 1 {
    return zome_error!("More than one global query log create found");
  }
  /// Create First log if none was created
  if tuples.is_empty() {
    let first_log = GlobalLastProbeLog {
      ts: sys_time()?,
      maybe_last_known_pp_ah: None,
    };
    let ah = create_entry(ThreadsEntry::GlobalLastProbeLog(first_log.clone()))?;
    return Ok((ah, first_log))
  }
  /// Search for updates
  let query_args = ChainQueryFilter::default()
    .include_entries(true)
    .action_type(ActionType::Update)
    .entry_type(entry_type);
  let records = query(query_args)?;
  debug!("query_global_log() updates found: {:?}", records);
  /// If no updated found return the create
  if records.is_empty() {
    let (ah, create, typed) = tuples[0].clone();
    emit_entry_signal(ah.clone(), &Action::Create(create), false, ThreadsEntry::GlobalLastProbeLog(typed.clone()))?;
    return Ok((ah, typed));
  }
  /// Grab last one (ascending order)
  let latest_record = records.last().unwrap().clone();
  let typed: GlobalLastProbeLog = get_typed_from_record(latest_record.clone())?;
  /// Emit signal
  let entry_info = EntryInfo {
    hash: AnyDhtHash::from(latest_record.action().entry_hash().unwrap().to_owned()),
    ts: latest_record.action().timestamp(),
    author: latest_record.action().author().to_owned(),
    state: StateChange::Update(false),
  };
  let dsp = ThreadsSignalProtocol::Entry((entry_info, ThreadsEntry::GlobalLastProbeLog(typed.clone())));
  emit_threads_signal(vec![dsp])?;
  /// Done
  Ok((latest_record.action_address().to_owned(), typed))
}


#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
pub struct CommitGlobalLogInput {
  maybe_ts: Option<Timestamp>,
  maybe_last_known_pp_ah: Option<ActionHash>,
}

/// Update global log entry to current time.
/// Return time of newly created global log entry.
#[hdk_extern]
#[feature(zits_blocking)]
pub fn commit_global_log(input: CommitGlobalLogInput) -> ExternResult<Timestamp> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  debug!("commit_global_log() {:?}", input);
  /// Get Previous one (this also makes sure that one has been created so we can do update)
  let (ah, prev) = query_global_log(())?;
  /// Create latest log
  let now = sys_time()?;
  let ts = input.maybe_ts.unwrap_or(now);
  if ts <= prev.ts {
      return error("New GlobalLog Timestamp must be newer than previous one");
  }
  let gql = GlobalLastProbeLog {
    ts,
    maybe_last_known_pp_ah: input.maybe_last_known_pp_ah,
  };
  /// Update the entry
  let _ah = update_entry(ah, ThreadsEntry::GlobalLastProbeLog(gql.clone()))?;
  /// Done
  Ok(gql.ts)
}





