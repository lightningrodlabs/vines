use hdk::hash_path::path::Component;
use hdk::hdi::prelude::DnaHash;
use hdk::prelude::*;
use threads_integrity::*;
//use zome_utils::*;
use crate::path_explorer::*;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subject {
  hash: AnyLinkableHash,
  hash_type: AppletTopicType,
  topic_type: String,
  dna: DnaHash,
}


/// Walk Subjects AnchorTree
/// Return Anchor, EntryHash of every threaded Subject.
#[hdk_extern]
pub fn get_all_subjects(_: ()) -> ExternResult<Vec<Subject>> {
  let root_path = Path::from(ROOT_ANCHOR_SUBJECTS).typed(ThreadsLinkType::SubjectPath)?;
  let root_anchor = TypedAnchor::try_from(&root_path).unwrap();
  debug!("{:?}", root_anchor);
  let leaf_anchors = root_anchor.probe_leaf_anchors()?;
  debug!("{} leaf_anchors found.", leaf_anchors.len());
  /// Seperate last component from rest of Path
  let mut all = Vec::new();
  for tp in leaf_anchors {
    let path = Path::from(tp.anchor.clone());
    let comps: Vec<Component> = path.into();
    debug!("Parsing leaf_anchor: {}", tp.anchor);
    let dna_comp = comps[1].as_ref().to_owned();
    let dna = DnaHash::from_raw_39(dna_comp).unwrap(); // FIXME
    let topic_type = comps[2].clone();
    let hash_comp = comps[3].as_ref().to_owned();
    let subject_hash = AnyLinkableHash::from_raw_39(hash_comp).unwrap(); // FIXME

    let subject = Subject {
      hash: subject_hash.clone(),
      hash_type: AppletTopicType::from(subject_hash),
      topic_type: std::str::from_utf8(topic_type.as_ref()).unwrap().to_string(), // FIXME
      dna,
    };
    all.push(subject);
  }
  ///
  debug!("all {:?}", all);
  Ok(all)
}
