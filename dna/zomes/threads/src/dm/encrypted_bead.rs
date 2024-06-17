use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::*;
use threads_integrity::*;
use crate::beads::{fetch_typed_bead, index_bead};
use crate::dm::decrypt_my_bead;
use crate::notifications::*;


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddEncBeadInput {
  pub enc_bead: EncryptedBead,
  pub other_agent: AgentPubKey,
  pub creation_time: Timestamp,
  pub can_notify_reply: bool,
}

/// Return bead ah, type, Global Time Anchor, bucket time
#[hdk_extern]
#[feature(zits_blocking)]
pub fn publish_enc_bead(input: AddEncBeadInput) -> ExternResult<(ActionHash, String, Timestamp)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  debug!("publish_enc_bead() {:?}", input);
  let typed = decrypt_my_bead(input.enc_bead.clone())?;
  let bead = typed.bead();
  /// Commit
  let ah = create_entry(ThreadsEntry::EncryptedBead(input.enc_bead.clone()))?;
  //let bead_type = format!("__any::{}", input.type_info);
  let tp_pair = index_bead(bead.clone(), ah.clone(), "EncryptedBead"/*&bead_type*/, input.creation_time)?;
  let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  /// Reply
  if input.can_notify_reply {
    if bead.pp_ah != bead.prev_bead_ah.clone() {
      let reply_author = get_author(&bead.prev_bead_ah.clone().into())?;
      let _maybe = notify_peer(NotifyPeerInput { content: ah.clone().into(), who: reply_author.clone(), event: NotifiableEvent::Reply })?;
    }
  }
  /// Done
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time))
}


///
#[hdk_extern]
pub fn fetch_enc_bead_option(bead_ah: ActionHash) -> ExternResult<Option<(Timestamp, AgentPubKey, EncryptedBead)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  return Ok(fetch_typed_bead::<EncryptedBead>(bead_ah).ok());
}


///
#[hdk_extern]
pub fn fetch_enc_bead(bead_ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, EncryptedBead)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  return fetch_typed_bead::<EncryptedBead>(bead_ah);
}


///
#[hdk_extern]
pub fn fetch_many_enc_beads(ahs: Vec<ActionHash>) -> ExternResult<Vec<(Timestamp, AgentPubKey, EncryptedBead)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  return ahs.into_iter().map(|ah| fetch_typed_bead::<EncryptedBead>(ah)).collect();
}


