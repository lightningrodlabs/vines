use hdk::prelude::*;
use threads_integrity::*;
use zome_path::ts2Tag;
use zome_utils::{get_record, zome_panic_hook};


#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeSubjectInput {
   subject_source: AnyLinkableHash,
   subject_target: AnyLinkableHash,
}

/// Reassign all Pps from one subject to another
// TODO: uncomment to change the DNA and have this function be useable
//#[hdk_extern]
//#[feature(zits_blocking)]
pub fn merge_subject(input: MergeSubjectInput) -> ExternResult<()> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   if input.subject_source == input.subject_target {
      debug!("merge_subject() source == target. Nothing to do.");
      return Ok(())
   }

   // get all source subject Pps from Subject
   let tuples = probe_threads_links_from_subject_hash(input.subject_source, GetStrategy::Local)?;
   // for all pps found from source subject, reassign Pp's subject
   for (create_link_hash, pp_ah, pp_index_time) in tuples {
      // delete Threads link
      delete_link(create_link_hash, GetOptions::local())?;
      // Create new Threads link
      let _ah = create_link(
         input.subject_target.clone(),
         pp_ah,
         ThreadsLinkType::Threads,
         ts2Tag(pp_index_time))?;
   }

   // TODO: Protocols link is not actually used. If it were this code would be necessary
   // // Find Source and Target Subject
   // let source_b64: AnyLinkableHashB64 = input.subject_source.clone().into();
   // let target_b64: AnyLinkableHashB64 = input.subject_target.clone().into();
   // let subjects = pull_all_subjects(GetStrategy::Local)?;
   // let Some(source_subject) = subjects.iter().find(|s| s.address == source_b64.into()) {
   //    return zome_error!("Source subject not found.");
   // }
   // let Some(target_subject) = subjects.iter().find(|s| s.address == target_b64.into()) {
   //    return zome_error!("Target subject not found.");
   // }
   // // get all source subject Pps from Subject Hash
   // let subject_tp = get_subject_tp(source_subject.clone())?;
   // // for all pps found from source subject, reassign Pp's subject
   // // FIXME: grab all pp_ah and purpose from subject
   // for (create_link_hash, pp_ah, pp_purpose) in tuples {
   //    // delete Protocols link
   //    // delete_link(create_link_hash, GetOptions::local())?;
   //    // Create new Protocols link
   //    create_link(
   //       subject_tp.path_entry_hash()?,
   //       pp_ah.clone(),
   //       ThreadsLinkType::Protocols,
   //       LinkTag::new(pp.purpose),
   //    )?;
   // }

   // Done
   Ok(())
}


pub fn probe_threads_links_from_subject_hash(
   lh: AnyLinkableHash,
   strategy: GetStrategy,
) -> ExternResult<Vec<(ActionHash, ActionHash, Timestamp)>> {
   let mut subject_hash = lh.clone();
   /// If link is actionHash, grab latest update
   if let Some(ah) = lh.clone().into_action_hash() {
      if let Ok(record) = get_record(ah.into(), strategy) {
         subject_hash = record.action_address().to_owned().into();
      }
   }
   /// Grab links
   let links = get_links(
      LinkQuery::new(
         subject_hash,
         ThreadsLinkType::Threads.try_into_filter().unwrap(),
      ),
      strategy,
   )?;
   let res = links
      .iter()
      .map(|l| {
         let ts = zome_path::tag2Ts(l.tag.clone());
         //debug!("get_pps_from_subject_hash() thread {}, creationTime: {}", l.target, ts);
         (l.create_link_hash.clone(), ActionHash::try_from(l.target.clone()).unwrap(), ts)
      })
      .collect();
   /// Done
   Ok(res)
}