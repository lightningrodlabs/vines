use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct AddReactionInput {
    bead_ah: ActionHash,
    emoji: String,
    from: Option<AgentPubKey>, // For Importing
}

#[hdk_extern]
pub fn add_reaction(input: AddReactionInput) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    // TODO: Check input string is a proper emoji. (todo also in validation)
    //debug!("add_reaction({:?}) to {}", input.emoji, input.bead_ah);
    let me = agent_info()?.agent_latest_pubkey;
    let author = input.from.unwrap_or(me);
    let _ = create_link(input.bead_ah, author, ThreadsLinkType::EmojiReaction, str2tag(&input.emoji))?;
    Ok(())
}


///
#[hdk_extern]
pub fn remove_reaction(bead_ah: ActionHash) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let me = agent_info()?.agent_latest_pubkey;
    let links = get_links(link_input(bead_ah, ThreadsLinkType::EmojiReaction, None))?;
    let my_reactions: Vec<Link> = links.into_iter().filter(|link| AgentPubKey::try_from(link.target.clone()).unwrap() == me).collect();
    for reaction_link in my_reactions {
        let _ = delete_link(reaction_link.create_link_hash)?;
    }
    Ok(())
}


/// Return pairs of (agent, emoji)
#[hdk_extern]
pub fn get_reactions(bead_ah: ActionHash) -> ExternResult<Vec<(AgentPubKey, String)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let links= get_links(link_input(bead_ah.clone(), ThreadsLinkType::EmojiReaction, None))?;
    //debug!("get_reactions() found {} for {}", links.len(), bead_ah.clone());
    let pairs: Vec<(AgentPubKey, String)> = links.into_iter()
        .map(|link| (link.target.into_agent_pub_key().unwrap(), tag2str(&link.tag).unwrap()))
        .collect();
    Ok(pairs)
}
