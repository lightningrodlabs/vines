//use std::convert::TryInto;
use hdk::prelude::*;
use threads_integrity::*;
use zome_signals::*;
use zome_utils::*;
use crate::participation_protocols::delete_participation_protocol::is_participation_protocol_deleted;

///
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProbePpsInput {
   pub lh: AnyLinkableHash,
   pub strategy: GetStrategy,
}


/// Return ppAhs and timestamp of its index-time
#[hdk_extern]
pub fn probe_pps_from_subject_hash(
   input: ProbePpsInput,
) -> ExternResult<Vec<(ActionHash, Timestamp)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let mut subject_hash = input.lh.clone();
    /// If the subject is an actionHash, grab its latest update
    if let Some(ah) = input.lh.clone().into_action_hash() {
        if let Ok(record) = get_record(ah.into(), input.strategy) {
            subject_hash = record.action_address().to_owned().into();
            debug!("{} | base: {} | latest {}",
                subject_hash == input.lh,
                input.lh,
                subject_hash
            );
        }
    }
    /// Grab links
    let links = get_links(
        LinkQuery::new(subject_hash, ThreadsLinkType::Threads.try_into_filter().unwrap()),
        input.strategy,
    )?;
    let ahs: Vec<(ActionHash, Timestamp)> = links
        .iter()
        .map(|l| {
            let ts = zome_path::tag2Ts(l.tag.clone());
            //debug!("get_pps_from_subject_hash() thread {}, creationTime: {}", l.target, ts);
            (ActionHash::try_from(l.target.clone()).unwrap(), ts)
        })
        .collect();
    /// Check for deleted pps
    ahs.iter().for_each(|(pp_ah, _ts)| {
        /// Emit signal if deleted
        let _ = is_participation_protocol_deleted(pp_ah.to_owned());
    });
    /// Emit signal
    attest_links(links, ValidatedBy::Network)?;
    /// Done
    Ok(ahs)
}

// /// Return ppAhs and timestamp of its index-time
// #[hdk_extern] Not used for now
// pub fn probe_pps_from_subject_anchor(anchor: String) -> ExternResult<Vec<(ActionHash, Timestamp)>> {
//   std::panic::set_hook(Box::new(zome_panic_hook));
//   if anchor.is_empty() {
//     return error("Empty anchor input");
//   }
//   let tp = Path::from(anchor).typed(ThreadsLinkType::SubjectPath)?;
//   let links = get_links(link_input(tp.path_entry_hash()?, ThreadsLinkType::Protocols, None))?;
//   let ahs = links.iter()
//     .map(|l| { (ActionHash::try_from(l.target.clone()).unwrap(), tag2Ts(l.tag.clone())) })
//     .collect();
//   /// Emit signal
//   emit_links_signal(links)?;
//   /// Done
//   Ok(ahs)
// }
