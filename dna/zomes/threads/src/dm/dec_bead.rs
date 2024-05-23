use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::{AnyBead, EncryptedBead, EntryBead, TextBead, BaseBeadKind};


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
