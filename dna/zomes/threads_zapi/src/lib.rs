#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

use hdk::prelude::*;
use time_indexing::*;
use threads_model::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeAllOutput {
  pub searched_interval: SweepInterval,
  pub new_threads_by_subject: Vec<(String, ActionHash)>, // SubjectHashB64
  pub new_beads_by_thread: Vec<(ActionHash, BeadLink)>,
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublishDmThreadInput {
  pub other_agent: AgentPubKey,
  pub applet_id: String, // EntryHashB64 of the Applet entry in the group dna (We)
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddEncBeadInput {
  pub enc_bead: EncryptedBead,
  pub other_agent: AgentPubKey,
  pub creation_time: Timestamp,
}


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecryptBeadInput {
  pub enc_bead: EncryptedBead,
  pub other_agent: AgentPubKey,
}
