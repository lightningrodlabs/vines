use hdk::prelude::*;
use zome_utils::*;
use threads_integrity::*;
use strum_macros::FromRepr;

/// Notification settings are per ParticipationProtocol.
/// Default setting is receive notification only for mentions.
/// An agent has to declare if it wants notifications for all messages or none, since it deviates from the default setting


///
#[derive(Serialize, Deserialize, SerializedBytes, Debug, Clone, PartialEq, FromRepr)]
#[repr(u8)]
pub enum NotifySetting {
    Never,
    AllMessages,
    MentionsOnly,
    // UseSubjectSetting, // Use notify setting from subject
}
impl From<NotifySetting> for u8 {
    fn from(m: NotifySetting) -> u8 {
        m as u8
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct SetNotifySettingInput {
    pub pp_ah: ActionHash,
    pub setting: NotifySetting,
    pub agent: AgentPubKey,
}


///
#[hdk_extern]
#[feature(zits_blocking)]
pub fn set_notify_setting(input: SetNotifySettingInput) -> ExternResult<Option<ActionHash>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Get current setting if any
    let (current_setting, maybe_link_ah) = get_my_notify_settings(input.pp_ah.clone())?;
    /// Bail if setting already set
    if current_setting == input.setting {
        return Ok(None);
    }
    /// Delete previous
    if let Some(link_ah) = maybe_link_ah {
        let _ = delete_link(link_ah)?;
    }
    /// No need for link if its for MentionsOnly
    if let NotifySetting::MentionsOnly = input.setting {
        return Ok(None);
    }
    /// Set new setting
    let repr: u8 = input.setting.into();
    let new_link_ah = create_link(input.pp_ah, input.agent, ThreadsLinkType::NotifySetting, LinkTag::from(vec![repr]))?;
    /// Done
    Ok(Some(new_link_ah))
}


///
#[hdk_extern]
pub fn get_my_notify_settings(pp_ah: ActionHash) -> ExternResult<(NotifySetting, Option<ActionHash>)> {
    return get_notify_settings((pp_ah, agent_info()?.agent_latest_pubkey));
}


///
#[hdk_extern]
pub fn get_notify_settings(pair: (ActionHash, AgentPubKey)) -> ExternResult<(NotifySetting, Option<ActionHash>)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let links = get_links(link_input(pair.0, ThreadsLinkType::NotifySetting, None))?;
    let agent_hash = AnyLinkableHash::from(pair.1);
    for link in links {
        if link.target == agent_hash {
            let repr: u8 = link.tag.clone().into_inner()[0];
            let setting = NotifySetting::from_repr(repr).unwrap();
            return Ok((setting, Some(link.create_link_hash)))
        }
    }
    /// Default
    Ok((NotifySetting::MentionsOnly, None))
}


///
#[hdk_extern]
pub fn get_pp_notify_settings(pp_ah: ActionHash) -> ExternResult<Vec<(AgentPubKey, NotifySetting, ActionHash)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let links = get_links(link_input(pp_ah, ThreadsLinkType::NotifySetting, None))?;
    let mut res = Vec::new();
    for link in links {
        let agent: AgentPubKey = link.target.into_agent_pub_key().unwrap();
        let repr: u8 = link.tag.clone().into_inner()[0];
        let setting = NotifySetting::from_repr(repr).unwrap();
        res.push((agent, setting, link.create_link_hash))
    }
    /// Default
    Ok(res)
}
