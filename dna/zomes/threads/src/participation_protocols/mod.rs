
mod probe_pps_from_subject;
mod publish_participation_protocol;


use hdi::hash_path::path::{Component};
use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use authorship_zapi::*;
use zome_signals::*;


/// Return original author
#[hdk_extern]
pub fn fetch_pp(ah: ActionHash) -> ExternResult<Option<(ParticipationProtocol, Timestamp, AgentPubKey)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let Ok((record, typed)) = get_typed_and_record::<ParticipationProtocol>(ah.clone().into()) else {
    return Ok(None);
  };
  /// Emit Signal
  emit_new_entry_signal(record.clone(), false)?;
  ///
  let maybe_op = get_original_author(ah)?;
  if let Some(opPair) = maybe_op {
    return Ok(Some((typed, opPair.0, opPair.1)));
  };
  let action = record.action().clone();
  ///
  Ok(Some((typed, action.timestamp(), action.author().to_owned())))
}


///
fn get_subject_tp(subject: Subject) -> ExternResult<TypedPath> {
  debug!("get_subject_tp() applet_id: {}", subject.applet_id);
  let mut tp = get_subject_type_tp(subject.applet_id.clone(), &subject.type_name)?;
  //let subject_hash_comp = hash2comp(subject_hash);
  let subject_hash_comp = subject2comp(&subject);
  tp.path.append_component(subject_hash_comp);
  Ok(tp)
}


///
pub fn get_subject_type_tp(applet_id: String, subject_type_name: &str) -> ExternResult<TypedPath> {
  let mut tp = get_applet_tp(applet_id)?;
  tp.path.append_component(subject_type_name.into());
  Ok(tp)
}


///
pub fn get_applet_tp(applet_id: String) -> ExternResult<TypedPath> {
  //let applet_id_comp = hash2comp(applet_hash);
  let applet_id_comp = Component::from(applet_id);
  let mut tp = Path::from(ROOT_ANCHOR_SUBJECTS)
    .typed(ThreadsLinkType::SubjectPath)?;
  tp.path.append_component(applet_id_comp);
  Ok(tp)
}


///
pub fn subject2comp(subject: &Subject) -> Component {
  debug!("subject2comp() {} | {}", subject.dna_hash_b64, subject.address);
  let str = format!("{}{}{}", subject.dna_hash_b64, "|", subject.address);
  //debug!("subject2comp() {}", str);
  str.into()
}


///
pub fn comp2subject(comp: &Component) -> ExternResult<(String, String)> {
  let s = String::try_from(comp)
    .map_err(|e| wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;

  debug!("comp2subject() s = {}", s);
  let (dna_hash_b64, subject_address) = s.split_at(s.find("|").unwrap());
  let subject_address = &subject_address[1..]; // remove delimiter
  debug!("comp2subject() {} :: {}", dna_hash_b64, subject_address);


  Ok((dna_hash_b64.to_string(), subject_address.to_string()))
}
