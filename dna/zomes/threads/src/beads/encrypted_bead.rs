use hdk::prelude::*;
use time_indexing::convert_timepath_to_timestamp;
use zome_utils::*;
use threads_integrity::{ThreadsEntry, ThreadsEntryTypes, AnyBead, EncryptedBead, EntryBead, TextBead, BaseBeadKind};
use crate::beads::{get_typed_bead, index_bead};
use crate::notify_peer::{NotifiableEvent, send_inbox_item, SendInboxItemInput, WeaveNotification};


///
fn create_encrypted_bead<T>(typed_bead: T, bead_type: &str, other_agent: AgentPubKey) -> ExternResult<EncryptedBead>
  where
    T: serde::Serialize + Clone + Sized + std::fmt::Debug
{
  let me = agent_info()?.agent_latest_pubkey;
  /// Serialize
  let data: XSalsa20Poly1305Data = bincode::serialize(&typed_bead).unwrap().into();
  /// Encrypt
  let for_other = ed_25519_x_salsa20_poly1305_encrypt(
    me.clone(), other_agent, data.clone())?;
  let for_self = ed_25519_x_salsa20_poly1305_encrypt(
    me.clone(), me, data)?;
  /// Done
  Ok(EncryptedBead { for_self, for_other, bead_type: bead_type.to_string()})
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncryptBeadInput {
  pub base: BaseBeadKind,
  pub other_agent: AgentPubKey,
}


#[hdk_extern]
pub fn encrypt_bead(input: EncryptBeadInput) -> ExternResult<EncryptedBead> {
    match input.base {
      BaseBeadKind::AnyBead(any) => create_encrypted_bead(any, "AnyBead", input.other_agent),
      BaseBeadKind::EntryBead(e) => create_encrypted_bead(e, "EntryBead", input.other_agent),
      BaseBeadKind::TextBead(tb) => create_encrypted_bead(tb, "TextBead", input.other_agent),
    }
}


///
fn deser_bead(data: XSalsa20Poly1305Data, bead_type: &str) -> ExternResult<BaseBeadKind> {
  match bead_type {
    "EntryBead" => {
      let item: EntryBead = bincode::deserialize(data.as_ref())
        .expect("Deserialization should work");
      Ok(BaseBeadKind::EntryBead(item))
    }
    "AnyBead" => {
      let item: AnyBead = bincode::deserialize(data.as_ref())
        .expect("Deserialization should work");
      Ok(BaseBeadKind::AnyBead(item))
    }
    "TextBead" => {
      let item: TextBead = bincode::deserialize(data.as_ref())
        .expect("Deserialization should work");
      Ok(BaseBeadKind::TextBead(item))
    }
    _ => error("Unknown bead type"),
  }
}

#[hdk_extern]
pub fn decrypt_my_bead(enc_bead: EncryptedBead) -> ExternResult<BaseBeadKind> {
  debug!("decrypt_my_bead() {:?}", enc_bead);
  /// Decrypt
  let data = ed_25519_x_salsa20_poly1305_decrypt(
    agent_info()?.agent_latest_pubkey,
    agent_info()?.agent_latest_pubkey,
    enc_bead.for_self,
  )?;
  /// Deserialize
  return deser_bead(data, enc_bead.bead_type.as_str());
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecryptBeadInput {
  pub enc_bead: EncryptedBead,
  pub other_agent: AgentPubKey,
}


#[hdk_extern]
pub fn decrypt_bead(input: DecryptBeadInput) -> ExternResult<BaseBeadKind> {
  debug!("decrypt_bead() {:?}", input);
  /// Decrypt
  let data = ed_25519_x_salsa20_poly1305_decrypt(
    agent_info()?.agent_latest_pubkey,
    input.other_agent,
    input.enc_bead.for_other,
  )?;
  /// Deserialize
  return deser_bead(data, input.enc_bead.bead_type.as_str());
}


///-------------------------------------------------------------------------------------------------

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
pub fn add_enc_bead(input: AddEncBeadInput) -> ExternResult<(ActionHash, String, Timestamp, Vec<(AgentPubKey, WeaveNotification)>)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  debug!("add_enc_bead() {:?}", input);
  let typed = decrypt_my_bead(input.enc_bead.clone())?;
  let bead = typed.bead();
  /// Commit
  let ah = create_entry(ThreadsEntry::EncryptedBead(input.enc_bead.clone()))?;
  //let bead_type = format!("__any::{}", input.type_info);
  let tp_pair = index_bead(bead.clone(), ah.clone(), "EncryptedBead"/*&bead_type*/, input.creation_time)?;
  let bucket_time = convert_timepath_to_timestamp(tp_pair.1.path.clone())?;
  /// Reply
  let mut maybe_notif = Vec::new();
  if input.can_notify_reply {
    if bead.pp_ah != bead.prev_bead_ah.clone() {
      let reply_author = get_author(&bead.prev_bead_ah.clone().into())?;
      let maybe = send_inbox_item(SendInboxItemInput { content: ah.clone().into(), who: reply_author.clone(), event: NotifiableEvent::Reply })?;
      if let Some((_link_ah, notif)) = maybe {
        maybe_notif.push((reply_author, notif));
      }
    }
  }
  /// Done
  Ok((ah, path2anchor(&tp_pair.1.path).unwrap(), bucket_time, maybe_notif))
}


///
#[hdk_extern]
pub fn get_enc_bead_option(bead_ah: ActionHash) -> ExternResult<Option<(Timestamp, AgentPubKey, EncryptedBead)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  return Ok(get_typed_bead::<EncryptedBead>(bead_ah).ok());
}


///
#[hdk_extern]
pub fn get_enc_bead(bead_ah: ActionHash) -> ExternResult<(Timestamp, AgentPubKey, EncryptedBead)> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  return get_typed_bead::<EncryptedBead>(bead_ah);
}


///
#[hdk_extern]
pub fn get_many_enc_beads(ahs: Vec<ActionHash>) -> ExternResult<Vec<(Timestamp, AgentPubKey, EncryptedBead)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  return ahs.into_iter().map(|ah| get_typed_bead::<EncryptedBead>(ah)).collect();
}


/// Get all AnyBeads in local source-chain
/// WARN Will return actual action creation time and not stored ts_us
#[hdk_extern]
pub fn query_enc_beads(_: ()) -> ExternResult<Vec<(Timestamp, ActionHash, EncryptedBead)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let entry_type = EntryType::App(ThreadsEntryTypes::EncryptedBead.try_into().unwrap());
  let tuples = get_all_typed_local::<EncryptedBead>(entry_type)?;
  let res = tuples.into_iter().map(|(ah, create_action, typed)| {
    (create_action.timestamp, ah, typed)
  }).collect();
  Ok(res)
}
