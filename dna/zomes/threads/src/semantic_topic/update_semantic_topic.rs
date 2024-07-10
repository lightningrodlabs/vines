use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use crate::semantic_topic::*;


/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTopicInput {
  pub eh: EntryHash,
  pub topic: SemanticTopic,
}

/// Creates the SemanticTopic
#[hdk_extern]
#[feature(zits_blocking)]
pub fn update_semantic_topic(input: UpdateTopicInput) -> ExternResult<EntryHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Make sur length is OK
  if let Ok(properties) = get_properties() {
    if input.topic.title.len() > properties.max_topic_name_length as usize ||
      input.topic.title.len() < properties.min_topic_name_length as usize {
      return error("Topic length is invalid.");
    }
  }
  /// Make sure Topic does already exists
  let (record, old) = get_typed_and_record::<SemanticTopic>(input.eh.into())?;
  /// Make sure title changed
  if old.title == input.topic.title {
      return error("Topic title is same");
  }
  // /// Make sure its same author
  // if agent_info()?.agent_latest_pubkey != record.action().author().to_owned() {
  //   return error("Only original author can change topic title");
  // }

  debug!("update_semantic_topic from: '{}' to: '{}'", old.title, input.topic.title);

  ///
  let new_eh = hash_entry(input.topic.clone())?;
  let _ah = update_entry(record.action_address().to_owned(), ThreadsEntry::SemanticTopic(input.topic.clone()))?;
  let tp = determine_topic_anchor(input.topic.title.clone())?;
  tp.ensure()?;
  let ph = tp.path_entry_hash()?;
  debug!("create_semantic_topic() path:  '{}' {} | {}", path2anchor(&tp.path).unwrap(), tp.link_type.zome_type.0, ph);
  create_link(
    ph,
    new_eh.clone(),
    ThreadsLinkType::Topics,
    LinkTag::new(input.topic.title.to_lowercase().as_bytes().to_vec()),
  )?;
  /// Delete previous link
  let old_tp = determine_topic_anchor(old.title.clone())?;
  let old_ph = old_tp.path_entry_hash()?;
  let prefix = LinkTag::new(old.title.to_lowercase().as_bytes().to_vec());
  let links = get_links(link_input(old_ph.clone(), ThreadsLinkType::Topics, Some(prefix)))?;
  debug!("Links found: {}", links.len());
  for link in links {
    delete_link(link.create_link_hash)?;
  }
  //delete_link(old_ph)?;
  ///
  Ok(new_eh)
}
