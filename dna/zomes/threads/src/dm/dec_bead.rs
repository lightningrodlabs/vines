use hdk::prelude::*;
//use zome_utils::*;
use threads_integrity::{AnyBead, EncryptedBead, EntryBead, TextBead, TypedBaseBead};
use threads_model::BaseBeadType;

///
fn deser_bead(data: XSalsa20Poly1305Data, bead_type: BaseBeadType) -> ExternResult<TypedBaseBead> {
  match bead_type {
    BaseBeadType::Entry => {
      let item: EntryBead = bincode::deserialize(data.as_ref())
        .expect("Deserialization should work");
      Ok(TypedBaseBead::Entry(item))
    }
    BaseBeadType::Any => {
      let item: AnyBead = bincode::deserialize(data.as_ref())
        .expect("Deserialization should work");
      Ok(TypedBaseBead::Any(item))
    }
    BaseBeadType::Text => {
      let item: TextBead = bincode::deserialize(data.as_ref())
        .expect("Deserialization should work");
      Ok(TypedBaseBead::Text(item))
    }
    //_ => error("Unknown bead type"),
  }
}

#[hdk_extern]
pub fn decrypt_my_bead(enc_bead: EncryptedBead) -> ExternResult<TypedBaseBead> {
  debug!("decrypt_my_bead() {:?}", enc_bead);
  /// Decrypt
  let data = ed_25519_x_salsa20_poly1305_decrypt(
    agent_info()?.agent_latest_pubkey,
    agent_info()?.agent_latest_pubkey,
    enc_bead.for_self,
  )?;
  /// Deserialize
  return deser_bead(data, enc_bead.bead_type);
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecryptBeadInput {
  pub enc_bead: EncryptedBead,
  pub other_agent: AgentPubKey,
}


#[hdk_extern]
pub fn decrypt_bead(input: DecryptBeadInput) -> ExternResult<TypedBaseBead> {
  debug!("decrypt_bead() {:?}", input);
  /// Decrypt
  let data = ed_25519_x_salsa20_poly1305_decrypt(
    agent_info()?.agent_latest_pubkey,
    input.other_agent,
    input.enc_bead.for_other,
  )?;
  /// Deserialize
  return deser_bead(data, input.enc_bead.bead_type);
}
