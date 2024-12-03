#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

use hdk::prelude::{ActionHash, Deserialize, Serialize};
use time_indexing::*;
use threads_model::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeAllOutput {
  pub searched_interval: SweepInterval,
  pub new_threads_by_subject: Vec<(String, ActionHash)>, // SubjectHashB64
  pub new_beads_by_thread: Vec<(ActionHash, BeadLink)>,
}
