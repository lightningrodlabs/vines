use hdk::prelude::*;
use threads_integrity::*;
use time_indexing::*;
use zome_utils::zome_panic_hook;
use crate::beads::{BeadLink};


#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeAllOutput {
  pub searched_interval: SweepInterval,
  pub new_threads_by_subject: Vec<(AnyLinkableHash, ActionHash)>,
  pub new_beads_by_thread: Vec<(ActionHash, BeadLink)>,
}


/// Get latest links from the global time index
#[hdk_extern]
pub fn probe_all_latest(begin: Timestamp) -> ExternResult<ProbeAllOutput> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// From beginning of time to now (begin_time is expected to be last global search log time)
  return probe_all_between(SweepInterval {begin, end: sys_time()?});
}


/// Get links from the global time index
/// Returns:
///  - searched interval
///  - all new threads (as pp_ah & subject hash)
///  - all new beads (as bead links && pp_ah)
#[hdk_extern]
pub fn probe_all_between(searched_interval: SweepInterval) -> ExternResult<ProbeAllOutput> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Query DHT
  let root_tp = Path::from(GLOBAL_TIME_INDEX).typed(ThreadsLinkType::GlobalTimePath)?;
  let responses = get_latest_time_indexed_links(root_tp, searched_interval.clone(), usize::MAX, None, ThreadsLinkType::TimeItem)?.1;
  debug!("links.len = {}", responses.len());
  /// Convert links to BeadLinks
  //let me = agent_info()?.agent_initial_pubkey;
  let mut bls: Vec<(ActionHash, BeadLink)> = Vec::new();
  let mut pps: Vec<(AnyLinkableHash, ActionHash)> = Vec::new();
  for (_index_time, link) in responses {
      // /// Dont count my things as 'new'
      // if link.author == me {
      //   continue;
      // }
      let item_tag: TimedItemTag = SerializedBytes::from(UnsafeBytes::from(link.tag.0)).try_into().unwrap();
      if item_tag.item_type == PP_ITEM_TYPE {
        let pp_ah: ActionHash = ActionHash::try_from(link.target).unwrap();
        let subject_hash: AnyLinkableHash = AnyLinkableHash::from_raw_39(item_tag.custom_data).unwrap();
        /// Add only if after begin_time since we may have older items from the same time bucket
        if item_tag.ts_us > searched_interval.begin {
          pps.push((subject_hash.clone(), pp_ah.clone()));
          //debug!("Thread found: {} (for subject: {:?})", pp_ah, topic_hash);
          debug!("new Thread found: {} > {}", item_tag.ts_us, searched_interval.begin);
        }
      } else {
        let pp_ah: ActionHash = ActionHash::from_raw_39(item_tag.custom_data).unwrap();
        let bl = BeadLink {
          //index_time,
          creation_time: item_tag.ts_us,
          //creation_time: link.timestamp,
          bead_ah: ActionHash::try_from(link.target).unwrap(),
          bead_type: item_tag.item_type,
          //bead_type: tag2str(&link.tag).unwrap(),
        };
        /// Add only if after begin_time since we may have older items from the same time bucket
        if bl.creation_time > searched_interval.begin {
          bls.push((pp_ah, bl));
          //debug!("Bead found: {} (for thread: {:?})", bl.bead_ah, pp_ah);
        }
      }
    }
  /// Done
  debug!("new_threads_by_subject.len = {}", pps.len());
  debug!("   new_beads_by_thread.len = {}", bls.len());
  Ok(ProbeAllOutput {
    searched_interval,
    new_threads_by_subject: pps,
    new_beads_by_thread: bls,
  })
}
