use hdi::prelude::*;
use crate::THREADS_DEFAULT_INTEGRITY_ZOME_NAME;

#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
   debug!("{} genesis_self_check() CALLED", THREADS_DEFAULT_INTEGRITY_ZOME_NAME);
   let _info = dna_info()?;
   let Ok(properties) = get_properties() else {
      return Ok(ValidateCallbackResult::Invalid("No properties".into()));
   };
   // debug!("genesis_self_check() properties {:?}", properties);
   ///
   return properties.validate();
}


/// Dna properties
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, SerializedBytes)]
#[serde(rename_all = "camelCase")]
pub struct ThreadsProperties {
   pub min_topic_name_length: u8,
   pub max_topic_name_length: u16,
   pub group_name: String,
   pub group_svg_icon: String,
}

impl ThreadsProperties {
   pub fn new(min_topic_name_length: u8, max_topic_name_length: u16, group_name: &str, group_svg_icon: &str) -> Self {
      Self {
         min_topic_name_length,
         max_topic_name_length,
         group_name: group_name.to_string(),
         group_svg_icon: group_svg_icon.to_string(),
      }
   }
}

impl ThreadsProperties {
   pub fn validate(&self) -> ExternResult<ValidateCallbackResult> {
      if self.max_topic_name_length == 0 {
         return Ok(ValidateCallbackResult::Invalid("DNA Property \"max_topic_name_length\" must be > 0".to_string()));
      }
      if self.max_topic_name_length < self.min_topic_name_length as u16 {
         return Ok(ValidateCallbackResult::Invalid("DNA Property \"max_topic_name_length\" must be bigger than \"min_topic_name_length\"".to_string()));
      }
      if self.group_name.len() > 64 {
         return Ok(ValidateCallbackResult::Invalid("DNA Property \"group_name\" is too big".to_string()));
      }
      if self.group_svg_icon.len() > 1024 * 1024 {
         return Ok(ValidateCallbackResult::Invalid("DNA Property \"group_svg_icon\" is too big".to_string()));
      }
      ///
      Ok(ValidateCallbackResult::Valid)
   }
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



#[cfg(test)]
mod tests {
   use super::*;

   fn random_string(size: usize) -> String {
      const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      let mut result = String::with_capacity(size);
      let mut seed = std::time::SystemTime::now()
         .duration_since(std::time::UNIX_EPOCH)
         .expect("time went backwards")
         .as_nanos() as u64;

      for _ in 0..size {
         // Simple xorshift64 PRNG
         seed ^= seed << 13;
         seed ^= seed >> 7;
         seed ^= seed << 17;

         let index = seed as usize % CHARS.len();
         result.push(CHARS[index] as char);
      }
      result
   }

   fn assert_invalid(properties: ThreadsProperties) {
      let result = properties.validate().expect("validation should not fail");
      match result {
         ValidateCallbackResult::Invalid(_message) => (),
         other => panic!("expected invalid validation result, got {:?}", other),
      }
   }

   fn assert_valid(properties: ThreadsProperties) {
      let result = properties.validate().expect("validation should not fail");
      match result {
         ValidateCallbackResult::Valid => (),
         other => panic!("expected valid validation result, got {:?}", other),
      }
   }

   #[test]
   fn valid_properties() {
      assert_valid(ThreadsProperties::new(1, 3, "test", ""));
      assert_valid(ThreadsProperties::new(1, 3, "", "test"));
      assert_valid(ThreadsProperties::new(0, 3, "test", ""));
      assert_valid(ThreadsProperties::new(3, 3, "test", ""));
      assert_valid(ThreadsProperties::new(0, 3, &random_string(64), &random_string(1024 * 1024)));
   }

   #[test]
   fn invalid_properties() {
      assert_invalid(ThreadsProperties::new(0, 0, "test", "test"));
      assert_invalid(ThreadsProperties::new(10, 0, "test", "test"));
      assert_invalid(ThreadsProperties::new(10, 9, "test", "test"));
      assert_invalid(ThreadsProperties::new(0, 3, &random_string(65), &random_string(1024 * 1024)));
      assert_invalid(ThreadsProperties::new(0, 3, &random_string(64), &random_string(1024 * 1024 + 1)));
   }
}
