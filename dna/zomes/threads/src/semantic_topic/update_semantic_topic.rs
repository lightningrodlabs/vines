use hdk::prelude::*;
use threads_integrity::*;
use zome_utils::*;
use crate::semantic_topic::*;


/// Input to the notify call
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTopicInput {
  pub ah: ActionHash,
  pub topic: SemanticTopic,
}

/// Creates the SemanticTopic
#[hdk_extern]
#[feature(zits_blocking)]
pub fn update_semantic_topic(input: UpdateTopicInput) -> ExternResult<ActionHash> {
  std::panic::set_hook(Box::new(zome_panic_hook));
  /// Make sur length is OK
  if let Ok(properties) = get_properties() {
    if input.topic.title.len() > properties.max_topic_name_length as usize ||
      input.topic.title.len() < properties.min_topic_name_length as usize {
      return error("Topic length is invalid.");
    }
  }
  /// Make sure Topic does already exists
  let old_lh: AnyLinkableHash = input.ah.into();
  let (record, old) = get_typed_and_record::<SemanticTopic>(old_lh.clone())?;
  /// Make sure title changed
  if old.title == input.topic.title {
      return error("Topic title is same");
  }
  // /// Make sure its same author
  // if agent_info()?.agent_latest_pubkey != record.action().author().to_owned() {
  //   return error("Only original author can change topic title");
  // }

  debug!("update_semantic_topic() from: '{}' to: '{}'", old.title, input.topic.title);

  /// Update Entry
  //let new_eh = hash_entry(input.topic.clone())?;
  let new_ah = update_entry(record.action_address().to_owned(), ThreadsEntry::SemanticTopic(input.topic.clone()))?;
  /// Add to Topics PathTree
  let tp = determine_topic_anchor(input.topic.title.clone())?;
  tp.ensure()?;
  let ph = tp.path_entry_hash()?;
  debug!("update_semantic_topic() path:  '{}' {} | {}", path2anchor(&tp.path).unwrap(), tp.link_type.zome_type.0, ph);
  create_link(
    ph,
    new_ah.clone(),
    ThreadsLinkType::Topics,
    LinkTag::new(input.topic.title.to_lowercase().as_bytes().to_vec()),
  )?;

  // /// Delete previous Topics links
  // let old_tp = determine_topic_anchor(old.title.clone())?;
  // let old_ph = old_tp.path_entry_hash()?;
  // let prefix = LinkTag::new(old.title.to_lowercase().as_bytes().to_vec());
  // let links = get_links(link_input(old_ph.clone(), ThreadsLinkType::Topics, Some(prefix)))?;
  // debug!("update_semantic_topic() Topics Links found: {}", links.len());
  // for link in links {
  //   delete_link(link.create_link_hash)?;
  // }

  // /// Add to Subjects PathTree
  // let subject = Subject {
  //   address: holo_hash_encode(new_ah.get_raw_39()),
  //   name,
  //   type_name,
  //   dna_hash_b64,
  //   applet_id,
  // };
  // let mut new_subject = pp.subject.clone();
  // new_subject.address = holo_hash_encode(new_ah.get_raw_39()),
  // let subject_tp = get_subject_tp(new_subject.clone())?;
  // subject_tp.ensure()?;

  // //delete_link(old_ph)?;
  // /// Displace "Protocols" link for each PP refering this Subject
  // let threads = probe_pps_from_subject_hash(old_lh.clone())?;
  // for (pp_ah, _ts) in threads {
  //   let (_eh, pp) = get_typed_from_ah::<ParticipationProtocol>(pp_ah.clone())?;
  //   let action_ts = get(pp_ah.clone(), GetOptions::network())?.unwrap().action().timestamp();
  //   /// Add to Subjects PathTree
  //   let mut new_subject = pp.subject.clone();
  //   new_subject.address = holo_hash_encode(new_ah.get_raw_39());
  //   let subject_tp = get_subject_tp(new_subject.clone())?;
  //   subject_tp.ensure()?;
  //   debug!("{} --> {}", path2anchor(&subject_tp.path).unwrap(), pp_ah);
  //   let _ta = TypedAnchor::try_from(&subject_tp).expect("Should hold a TypedAnchor");
  //   create_link(
  //     subject_tp.path_entry_hash()?,
  //     pp_ah.clone(),
  //     ThreadsLinkType::Protocols,
  //     LinkTag::new(pp.purpose),
  //     // str2tag(&subject_hash_str), // Store Subject Hash in Tag
  //   )?;
  //   /// Delete (all) previous "Protocols" link (OPTIM: should do this only on first pp)
  //   let old_subject_tp = get_subject_tp(pp.subject.clone())?;
  //   let links = get_links(link_input(old_subject_tp.path_entry_hash()?, ThreadsLinkType::Protocols, None))?;
  //   debug!("update_semantic_topic() Protocols Links found: {}", links.len());
  //   for link in links {
  //     delete_link(link.create_link_hash)?;
  //   }
  //
  //   /// Add "Threads" link
  //   link_subject_to_pp(&pp.subject, &pp_ah, action_ts)?;
  // }

  ///
  Ok(new_ah)
}
