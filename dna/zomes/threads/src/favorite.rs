use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;


///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn publish_favorite(bead_ah: ActionHash) -> ExternResult<ActionHash> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Make sure pp_ah is a PP
    //let (_pp_eh, _pp): (EntryHash, Bead)  = get_typed_from_ah(bead_ah.clone())?;
    /// Get current setting if any
    // let (current_setting, maybe_link_ah) = get_my_notify_settings(input.pp_ah.clone())?;
    // /// Bail if setting already set
    // if current_setting == input.setting {
    //     return Ok(None);
    // }
    // /// Delete previous
    // if let Some(link_ah) = maybe_link_ah {
    //     let _ = delete_link(link_ah)?;
    // }
    /// Set new setting
    let new_link_ah = create_link(agent_info()?.agent_latest_pubkey, bead_ah, ThreadsLinkType::Favorite, LinkTag::from(()))?;
    /// Done
    Ok(new_link_ah)
}


///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn unpublish_favorite(bead_ah: ActionHash) -> ExternResult<()> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let me = AnyLinkableHash::from(agent_info()?.agent_latest_pubkey);
    let links = get_links(link_input(me, ThreadsLinkType::Favorite, None))?;
    let ah = AnyLinkableHash::from(bead_ah);
    for link in links {
        if link.target == ah {
            let _link_ah = delete_link(link.create_link_hash)?;
        }
    }
    /// Done
    Ok(())
}


///
#[hdk_extern]
pub fn probe_my_favorites(_: ()) -> ExternResult<Vec<ActionHash>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let me = AnyLinkableHash::from(agent_info()?.agent_latest_pubkey);
    let links = get_links(link_input(me, ThreadsLinkType::Favorite, None))?;
    let mut res = Vec::new();
    for link in links {
        let bead_ah: ActionHash = link.target.into_action_hash().unwrap();
        // TODO: check the bead exists
        res.push(bead_ah)
    }
    /// Default
    Ok(res)
}
