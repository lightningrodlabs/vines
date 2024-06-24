use hdk::prelude::*;
use zome_utils::*;
use crate::*;


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
  debug!("Broadcasting tip {:?} to {:?}", input.tip, input.peers);
  return broadcast_tip_inner(input.peers, input.tip);
}


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
  let res = send_remote_signal(
    ExternIO::encode(pulse).unwrap(),
    filtered,
  );
  if let Err(e) = res {
    error!("send_remote_signal() failed during broadcast_tip(): {:?}", e);
    return error("send_remote_signal() failed during broadcast_tip()");
  }
  debug!("calling remote recv_remote_signal() DONE");
  Ok(())
}


/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CastNotificationTipInput {
  pub notification_tip: SerializedBytes,
  pub peer: AgentPubKey,
}

///
#[hdk_extern]
fn cast_notification_tip(input: CastNotificationTipInput) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  debug!("cast_notification_tip(): {:?}", input);
  /// Pre-conditions: Don't call yourself (otherwise we get concurrency issues)
  let me = agent_info()?.agent_latest_pubkey;
  if me == input.peer {
    return error("Can't notify self");
  }
  /// emit signal
  let tip = TipProtocol::Notification(input.notification_tip);
  broadcast_tip_inner(vec![input.peer], tip)?;
  /// Done
  Ok(())
}
