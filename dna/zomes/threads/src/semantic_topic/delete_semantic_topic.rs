use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;


/// Delete the SemanticTopic
/// WARN USE FOR TESTING ONLY
#[hdk_extern]
#[feature(zits_blocking)]
#[ignore(zits)]
pub fn delete_semantic_topic(eh: EntryHash) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Make sure Topic does already exists
  let (record, _old) = get_typed_and_record::<SemanticTopic>(&eh.into())?;
  /// Make sure its same author
  if agent_info()?.agent_latest_pubkey != record.action().author().to_owned() {
    return error("Only original author can change topic title");
  }
  ///
  let ah = delete_entry(record.action_address().to_owned())?;
  Ok(ah)
}
