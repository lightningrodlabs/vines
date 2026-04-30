use hdk::prelude::*;
use strum_macros::FromRepr;
use threads_integrity::*;
use zome_signals::*;
use zome_utils::*;
use zome_core::get_input_types::*;

/// Notification settings are per ParticipationProtocol.
/// Default setting is MentionsOnly (for normal threads, AllMessages for DM threads).
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
pub fn publish_notify_setting(input: SetNotifySettingInput) -> ExternResult<Option<ActionHash>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    /// Get current setting if any
    let pull_input = GetAhInput { ah: input.pp_ah.clone(), strategy: GetStrategy::Local };
    let (current_setting, maybe_link_ah) = pull_my_notify_settings(pull_input)?;
    /// Bail if setting already set
    if current_setting == input.setting {
        return Ok(None);
    }
    /// Delete previous
    if let Some(link_ah) = maybe_link_ah {
        let _ = delete_link(link_ah, GetOptions::local())?;
    }
    /// No need for link if its for MentionsOnly
    if let NotifySetting::MentionsOnly = input.setting {
        return Ok(None);
    }
    /// Set new setting
    let repr: u8 = input.setting.into();
    let new_link_ah = create_link(
        input.pp_ah,
        input.agent,
        ThreadsLinkType::NotifySetting,
        LinkTag::from(vec![repr]),
    )?;
    /// Done
    Ok(Some(new_link_ah))
}


///
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct PullNotifySettingsInput {
   pp_ah: ActionHash,
   agent: AgentPubKey,
   strategy: GetStrategy,
}


///
#[hdk_extern]
pub fn pull_my_notify_settings(
    input: GetAhInput,
) -> ExternResult<(NotifySetting, Option<ActionHash>)> {
    return pull_notify_settings( PullNotifySettingsInput { pp_ah: input.ah, agent: agent_info()?.agent_initial_pubkey, strategy: input.strategy});
}


///
#[hdk_extern]
pub fn pull_notify_settings(
    input: PullNotifySettingsInput
) -> ExternResult<(NotifySetting, Option<ActionHash>)> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let links = get_links(
        LinkQuery::new(
            input.pp_ah,
            ThreadsLinkType::NotifySetting.try_into_filter().unwrap(),
        ),
        input.strategy,
    )?;
    let agent_hash = AnyLinkableHash::from(input.agent);
    for link in links.clone() {
        if link.target == agent_hash {
            let repr: u8 = link.tag.clone().into_inner()[0];
            let setting = NotifySetting::from_repr(repr).unwrap();
            return Ok((setting, Some(link.create_link_hash)));
        }
    }
    /// Emit Signal
    attest_links(links, ValidatedBy::Network)?;
    /// Default
    Ok((NotifySetting::MentionsOnly, None))
}

///
#[hdk_extern]
pub fn pull_pp_notify_settings(input: GetAhInput)
   -> ExternResult<Vec<(AgentPubKey, NotifySetting, ActionHash)>> {
    std::panic::set_hook(Box::new(zome_panic_hook));
    let links = get_links(
        LinkQuery::new(
            input.ah,
            ThreadsLinkType::NotifySetting.try_into_filter().unwrap(),
        ),
        input.strategy,
    )?;
    let mut res = Vec::new();
    for link in &links {
        let agent: AgentPubKey = link.target.clone().into_agent_pub_key().unwrap();
        let repr: u8 = link.tag.clone().into_inner()[0];
        let setting = NotifySetting::from_repr(repr).unwrap();
        res.push((agent, setting, link.create_link_hash.to_owned()))
    }
    /// Emit Signal
    attest_links(links, ValidatedBy::Network)?;
    /// Default
    Ok(res)
}
