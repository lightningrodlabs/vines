use hdk::prelude::*;
//use zome_utils::*;
//use threads_integrity::*;
use crate::*;


///
#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct DeliveryGossip {
  pub from: AgentPubKey,
  pub gossip: DirectGossip,
}


///
pub fn broadcast_gossip(destinations: Vec<AgentPubKey>, gossip: DirectGossip) -> ExternResult<()> {
  /// Pre-conditions: Don't call yourself (otherwise we get concurrency issues)
  let me = agent_info()?.agent_latest_pubkey;
  let dests = destinations.into_iter().filter(|agent| agent != &me).collect();
  /// Prepare payload
  let gossip_packet = DeliveryGossip { from: me, gossip: gossip.clone() };
  /// Signal peers
  debug!("calling remote recv_remote_signal() to {:?}", dests);
  trace!("gossip = '{:?}'", gossip);
  send_remote_signal(
    ExternIO::encode(gossip_packet).unwrap(),
    dests,
  )?;
  trace!("calling remote recv_remote_signal() DONE");
  Ok(())
}


// /// Input to the notify call
// #[derive(Serialize, Deserialize, SerializedBytes, Debug)]
// #[serde(rename_all = "camelCase")]
// pub struct BroadcastSignalInput {
//   pub signal: ThreadsSignal,
//   pub peers: Vec<AgentPubKey>,
// }
//
// ///
// #[hdk_extern]
// fn broadcast_signal(input: BroadcastSignalInput) -> ExternResult<()> {
//   std::panic::set_hook(Box::new(zome_panic_hook));
//   // let mut peers: Vec<AgentPubKey> = vec![];
//   // for a in input.peers.clone() {
//   //     peers.push(a.into())
//   // }
//   debug!("Broadcasting signal {:?} to {:?}", input.signal, input.peers);
//   send_remote_signal(ExternIO::encode(input.signal).unwrap(), input.peers)?;
//   Ok(())
// }
