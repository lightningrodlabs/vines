use hdk::prelude::*;
use zome_utils::*;
//use threads_integrity::*;
use crate::*;


// ///
// #[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
// pub struct DeliveryGossip {
//   pub from: AgentPubKey,
//   pub gossip: DirectGossipProtocol,
// }


///
pub fn broadcast_gossip_inner(destinations: Vec<AgentPubKey>, gossip: DirectGossipProtocol) -> ExternResult<()> {
  /// Pre-conditions: Don't call yourself (otherwise we get concurrency issues)
  let me = agent_info()?.agent_latest_pubkey;
  let dests = destinations.into_iter().filter(|agent| agent != &me).collect();
  /// Prepare payload
  let signal = ThreadsSignal { from: me, signal: vec![ThreadsSignalProtocol::Gossip(gossip.clone())] };
  /// Signal peers
  debug!("calling remote recv_remote_signal() to {:?}", dests);
  trace!("gossip = '{:?}'", gossip);
  send_remote_signal(
    ExternIO::encode(signal).unwrap(),
    dests,
  )?;
  trace!("calling remote recv_remote_signal() DONE");
  Ok(())
}


/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BroadcastGossipInput {
  pub gossip: DirectGossipProtocol,
  pub peers: Vec<AgentPubKey>,
}

///
#[hdk_extern]
fn broadcast_gossip(input: BroadcastGossipInput) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  // let mut peers: Vec<AgentPubKey> = vec![];
  // for a in input.peers.clone() {
  //     peers.push(a.into())
  // }
  debug!("Broadcasting gossip {:?} to {:?}", input.gossip, input.peers);
  return broadcast_gossip_inner(input.peers, input.gossip);
}
