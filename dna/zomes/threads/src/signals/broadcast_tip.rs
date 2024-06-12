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
pub fn broadcast_tip_inner(destinations: Vec<AgentPubKey>, tip: TipProtocol) -> ExternResult<()> {
  /// Pre-conditions: Don't call yourself (otherwise we get concurrency issues)
  let me = agent_info()?.agent_latest_pubkey;
  let filtered = destinations.into_iter().filter(|agent| agent != &me).collect();
  /// Prepare payload
  let pulse = ThreadsSignalProtocol::Tip(tip.clone());
  /// Signal peers
  debug!("calling remote recv_remote_signal() to {:?}", filtered);
  trace!("tip = '{:?}'", tip);
  send_remote_signal(
    ExternIO::encode(pulse).unwrap(),
    filtered,
  )?;
  trace!("calling remote recv_remote_signal() DONE");
  Ok(())
}


/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BroadcastTipInput {
  pub tip: TipProtocol,
  pub peers: Vec<AgentPubKey>,
}

///
#[hdk_extern]
fn broadcast_tip(input: BroadcastTipInput) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  // let mut peers: Vec<AgentPubKey> = vec![];
  // for a in input.peers.clone() {
  //     peers.push(a.into())
  // }
  debug!("Broadcasting tip {:?} to {:?}", input.tip, input.peers);
  return broadcast_tip_inner(input.peers, input.tip);
}
