use hdk::prelude::*;
use threads_integrity::*;
use zome_signals::*;
use zome_utils::*;
use crate::input_types::*;

///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn get_pp_title(input: GetAhInput) -> ExternResult<String> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Make sur pp exists
    let (_eh, pp) = get_typed_from_ah::<ParticipationProtocol>(input.ah.clone(), input.strategy)?;
    /// Get previous title updates
    let title_links = get_links(
       LinkQuery::new(input.ah, ThreadsLinkType::TitleFix.try_into_filter().unwrap()),
       GetStrategy::Network,
    )?;
    attest_links(title_links.clone())?;
    /// Done
    return match title_links.last() {
        None => Ok(pp.purpose),
        Some(link) => Ok(zome_path::tag2str(&link.tag)?),
    };
}

///
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePpTitleInput {
    pub pp_ah: ActionHash,
    pub new_title: String,
}

///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn update_pp_title(input: UpdatePpTitleInput) -> ExternResult<ActionHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Make sur pp exists
    let record = get_record(input.pp_ah.clone().into(), GetStrategy::Network)?;
    /// Make sure we are author
    if record.action().author() != &agent_info()?.agent_initial_pubkey {
        return error("Only PP author can update its title");
    }
    /// Get previous title updates
    let title_links = get_links(
        LinkQuery::new(
            input.pp_ah.clone(),
            ThreadsLinkType::TitleFix.try_into_filter().unwrap(),
        ),
        GetStrategy::Network,
    )?;
    /// Delete previous title
    for link in title_links {
        delete_link(link.create_link_hash, GetOptions::network())?;
    }
    /// Set new title
    let ah = create_link(
        input.pp_ah.clone(),
        input.pp_ah,
        ThreadsLinkType::TitleFix,
        zome_path::str2tag(&input.new_title),
    )?;
    /// Done
    Ok(ah)
}
