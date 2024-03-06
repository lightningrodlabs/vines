use hdi::prelude::*;

/// Dna properties
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct ThreadsProperties {
   pub min_topic_name_length: u8,
   pub max_topic_name_length: u16,
   pub group_name: String,
   pub group_svg_icon: String,
}


/// Return the DNA properties
pub fn get_properties() -> ExternResult<ThreadsProperties> {
   //debug!("*** get_properties() called");
   let dna_info = dna_info()?;
   let props = dna_info.modifiers.properties;
   //debug!("props = {:?}", props);
   let maybe_properties: Result<ThreadsProperties, <ThreadsProperties as TryFrom<SerializedBytes>>::Error> = props.try_into();
   if let Err(e) = maybe_properties {
      debug!("Deserializing dna properties failed: {:?}", e);
      return Err(wasm_error!("Deserializing dna properties failed: {:?}", e));
   }
   Ok(maybe_properties.unwrap())
}
