use hdk::prelude::*;
use zome_utils::*;
use crate::*;


/// Don't forget to create_cap_grant() at init for this zome function
#[hdk_extern]
fn recv_remote_signal(pulse: ExternIO) -> ExternResult<()> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  let pulse: ZomeSignalProtocol = pulse.decode()
    .map_err(|e| wasm_error!(SerializedBytesError::Deserialize(e.to_string())))?;
  let caller = call_info()?.provenance;
  debug!("Received signal from {}:{:?}", caller,  pulse);
  let signal = ZomeSignal {
    from: caller,
    pulses: vec![pulse],
  };
  Ok(emit_signal(&signal)?)
}
