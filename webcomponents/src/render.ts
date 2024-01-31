import {getInitials, ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {AgentPubKeyB64} from "@holochain/client";
import {html, TemplateResult} from "lit";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";


/** */
export function renderAvatar(profilesZvm: ProfilesZvm, agentKey: AgentPubKeyB64, size: string): TemplateResult<1> {
    let agent = {nickname: "unknown", fields: {}} as ProfileMat;
    const maybeAgent = profilesZvm.perspective.profiles[agentKey];
    if (maybeAgent) {
        agent = maybeAgent;
    } else {
        console.log("Profile not found for agent", agentKey, profilesZvm.perspective.profiles)
        profilesZvm.probeProfile(agentKey)
        //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
    }
    const initials = getInitials(agent.nickname);
    const avatarUrl = agent.fields['avatar'];
    //console.log("renderAvatar()", initials, avatarUrl);
    return avatarUrl? html`
              <ui5-avatar size=${size} class="chatAvatar" slot="avatar" style="box-shadow: 1px 1px 1px 1px rgba(130, 122, 122, 0.88)">
                  <img src=${avatarUrl}>
              </ui5-avatar>
            `: html`
              <ui5-avatar size=${size} class="chatAvatar" slot="avatar" shape="Circle" initials=${initials} color-scheme="Accent2"></ui5-avatar>
    `;
}
