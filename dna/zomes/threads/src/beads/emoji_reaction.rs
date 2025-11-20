use hdk::prelude::*;
use threads_integrity::*;
use zome_signals::*;
use zome_utils::*;
use crate::GetAhInput;

///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ReactionInput {
    bead_ah: ActionHash,
    emoji: String,
    from: Option<AgentPubKey>, // For Importing
}

#[hdk_extern]
#[feature(zits_blocking)]
pub fn publish_reaction(input: ReactionInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    // TODO: Check input string is a proper emoji. (todo also in validation)
    //debug!("add_reaction({:?}) to {}", input.emoji, input.bead_ah);
    let me = agent_info()?.agent_initial_pubkey;
    let author = input.from.unwrap_or(me);
    let _ = create_link(
        input.bead_ah,
        author,
        ThreadsLinkType::EmojiReaction,
        zome_path::str2tag(&input.emoji),
    )?;
    Ok(())
}

///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn unpublish_reaction(input: ReactionInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let me = agent_info()?.agent_initial_pubkey;
    let links = get_links(
        link_input(
            input.bead_ah,
            ThreadsLinkType::EmojiReaction.try_into_filter().unwrap(),
            Some(zome_path::str2tag(&input.emoji)),
        ),
        GetStrategy::Network,
    )?;
    let my_reactions: Vec<Link> = links
        .into_iter()
        .filter(|link| AgentPubKey::try_from(link.target.clone()).unwrap() == me)
        .collect();
    for reaction_link in my_reactions {
        let _ = delete_link(reaction_link.create_link_hash, GetOptions::network())?;
    }
    Ok(())
}

///
#[hdk_extern]
pub fn pull_reactions(input: GetAhInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let links = get_links(
        LinkQuery::new(
           input.ah.clone(),
            ThreadsLinkType::EmojiReaction.try_into_filter().unwrap(),
        ),
        input.strategy,
    )?;
    debug!(
        "pull_reactions() found {} for {}",
        links.len(),
        input.ah.clone()
    );
    /// Emit Signal
    attest_links(links)?;
    ///
    Ok(())
}
