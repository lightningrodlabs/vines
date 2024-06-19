use hdk::prelude::*;
//use zome_utils::*;
use threads_integrity::{EncryptedBead, BaseBeadKind};


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
