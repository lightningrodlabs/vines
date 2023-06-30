use hdk::prelude::*;
use threads_integrity::*;
use crate::beads::{BeadLink};
use crate::path_explorer::*;
use crate::time_indexing::get_latest_time_indexed_links::get_latest_time_indexed_links;
use crate::time_indexing::{SweepInterval, TimedItemTag};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeAllLatestOutput {
  pub searched_interval: SweepInterval,
  pub new_threads_by_subject: Vec<(AnyLinkableHash, ActionHash)>,
  pub new_beads_by_thread: Vec<(ActionHash, BeadLink)>,
}

/// Get latest links from the global time index
/// Returns:
///  - searched interval
///  - all new threads (as pp_ah & subject hash)
///  - all new beads (as bead links && pp_ah)
#[hdk_extern]
pub fn probe_all_latest(begin_time: Timestamp)
  -> ExternResult<ProbeAllLatestOutput>
{
  let searched_interval = SweepInterval::new(begin_time, sys_time()?)?;
  /// Query DHT
  let root_tp = Path::from(GLOBAL_TIME_INDEX).typed(ThreadsLinkType::GlobalTimePath)?;
  let responses = get_latest_time_indexed_links(root_tp, searched_interval.clone(), usize::MAX, None)?.1;
  debug!("links.len = {}", responses.len());
  /// Convert links to BeadLinks
  let me = agent_info()?.agent_initial_pubkey;
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
        if item_tag.devtest_timestamp > begin_time {
          pps.push((subject_hash.clone(), pp_ah.clone()));
          //debug!("Thread found: {} (for subject: {:?})", pp_ah, topic_hash);
        }
      } else {
        let pp_ah: ActionHash = ActionHash::from_raw_39(item_tag.custom_data).unwrap();
        let bl = BeadLink {
          //index_time,
          creation_time: item_tag.devtest_timestamp,
          //creation_time: link.timestamp,
          bead_ah: ActionHash::from(link.target),
          bead_type: item_tag.item_type,
          //bead_type: tag2str(&link.tag).unwrap(),
        };
        /// Add only if after begin_time since we may have older items from the same time bucket
        if bl.creation_time > begin_time {
          bls.push((pp_ah, bl));
          //debug!("Bead found: {} (for thread: {:?})", bl.bead_ah, pp_ah);
        }
      }
    }
  /// Done
  debug!("new_threads_by_subject.len = {}", pps.len());
  debug!("   new_beads_by_thread.len = {}", bls.len());
  Ok(ProbeAllLatestOutput {
    searched_interval,
    new_threads_by_subject: pps,
    new_beads_by_thread: bls,
  })
}
