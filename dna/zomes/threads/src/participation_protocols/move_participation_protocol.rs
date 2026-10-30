use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use zome_path::{tag2Ts, ts2Tag};


///
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MovePpInput {
   pub pp_ah: ActionHash,
   pub from: AnyLinkableHash,
   pub to: AnyLinkableHash,
}


/// File a thread under another subject.
/// The "Threads" link from the old subject is deleted and recreated from the new one,
/// with the same index-time in its tag so chronological orders do not change.
/// The entry's `subject` field is left as is: it says where the thread was created,
/// the link says where it is now.
/// Allowed for the thread's author, for anyone when the thread has no moderators,
/// and for a moderator otherwise.
#[hdk_extern]
#[feature(zits_blocking)]
pub fn move_participation_protocol(input: MovePpInput) -> ExternResult<ActionHash> {
   std::panic::set_hook(Box::new(zome_panic_hook));
   if input.from == input.to {
      return error("Thread is already filed under that subject");
   }
   /// Make sure pp exists
   let (record, pp) = get_typed_and_record::<ParticipationProtocol>(input.pp_ah.clone().into(), GetStrategy::Local)?;
   /// Make sure we are allowed
   let me = agent_info()?.agent_initial_pubkey;
   let is_author = record.action().author() == &me;
   let moderators = &pp.moderation.moderators;
   if !is_author && !moderators.is_empty() && !moderators.contains(&me) {
      return error("Only the thread's author or a moderator can move it");
   }
   /// Find the Threads link(s) from the old subject. Try the local cache first, the link may
   /// have been created by someone else.
   let target: AnyLinkableHash = input.pp_ah.clone().into();
   let mut links = threads_links_to(input.from.clone(), &target, GetStrategy::Local)?;
   if links.is_empty() {
      links = threads_links_to(input.from.clone(), &target, GetStrategy::Network)?;
   }
   if links.is_empty() {
      return error("Thread is not filed under the given subject");
   }
   let index_time = tag2Ts(links[0].tag.clone());
   /// Delete old links
   for link in links {
      delete_link(link.create_link_hash, GetOptions::local())?;
   }
   /// Create new link
   let ah = create_link(
      input.to,
      input.pp_ah,
      ThreadsLinkType::Threads,
      ts2Tag(index_time),
   )?;
   /// Done
   Ok(ah)
}


/// Threads links from `base` that point to `target`
fn threads_links_to(base: AnyLinkableHash, target: &AnyLinkableHash, strategy: GetStrategy) -> ExternResult<Vec<Link>> {
   let links = get_links(
      LinkQuery::new(base, ThreadsLinkType::Threads.try_into_filter().unwrap()),
      strategy,
   )?;
   Ok(links.into_iter().filter(|l| &l.target == target).collect())
}
