use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;


/// Return ppAhs and timestamp of its index-time
#[hdk_extern]
pub fn get_dm_threads(_: ()) -> ExternResult<Vec<(AgentPubKey, ActionHash)>> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let links = get_links(link_input(agent_info()?.agent_latest_pubkey, ThreadsLinkType::Dm, None))?;
  let pairs = links
    .into_iter()
    .map(|l| {
      let other = tag2hash(&l.tag).unwrap();
      debug!("get_dm_threads() thread {}, other: {}", l.target, other);
      (other, ActionHash::try_from(l.target).unwrap())
    })
    .collect();
  Ok(pairs)
}
