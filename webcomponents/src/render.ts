import {getInitials, ProfilesAltPerspective, ProfilesAltZvm, ProfilesDvm} from "@ddd-qc/profiles-dvm";
import {html, LitElement, TemplateResult} from "lit";
import {Profile, Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {ThreadsZvm} from "./viewModels/threads.zvm";
import {determineBeadName, latestThreadName} from "./utils";
import {FilesDvm} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {NotifiableEvent, ThreadsNotification} from "./viewModels/threads.materialize";
import {AgentId, delay} from "@ddd-qc/lit-happ";
import {beadJumpEvent, JumpEvent, ShowProfileEvent, threadJumpEvent} from "./events";
import {msg} from "@lit/localize";
import {doodle_flowers} from "./doodles";


/** Get profile for agent, otherwise fetch it from DHT and return unknown Profile */
export function loadProfile(profilesZvm: ProfilesAltZvm, agentKey: AgentId): ProfileMat {
  let profile = {nickname: "unknown", fields: {}} as ProfileMat;
  const maybeAgent = profilesZvm.perspective.getProfile(agentKey);
  if (maybeAgent) {
    profile = maybeAgent;
  } else {
    console.log("Profile not found for agent", agentKey, profilesZvm.perspective.profiles)
    /* await */
    profilesZvm.findProfile(agentKey);
    //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
  }
  return profile;
}


/** */
export function renderAvatar(parent: LitElement, profilesZvm: ProfilesAltZvm, agentKey: AgentId, size: string, classArg: string = "chatAvatar", slotArg?: string): TemplateResult<1> {
  const profile = loadProfile(profilesZvm, agentKey);
  return renderProfileAvatar(parent, agentKey, profile, size, classArg, slotArg);
}


/** Render ui5-avatar with profile pic or initials
 * Provide agentKey to trigger a 'show-profile event'
 */
export function renderProfileAvatar(parent: LitElement, agentKey: AgentId | null, profile: ProfileMat, size: string, classArg: string = "chatAvatar", slotArg?: string) {
  const initials = getInitials(profile.nickname);
  const avatarUrl = profile.fields['avatar'] ?? profile.fields['avatarUrl'];
  //console.debug("renderProfileAvatar() avatarUrl", avatarUrl);
  const slot = slotArg? slotArg : "";
  const avatar = avatarUrl
    ? html`<ui5-avatar size=${size} class=${classArg}>
                <img .src=${avatarUrl} style="object-fit: cover; ${profile.fields["imported"]? "opacity:0.5":""}">
              </ui5-avatar>`
    : html`<ui5-avatar size=${size} class=${classArg} shape="Circle" initials=${initials} color-scheme="Accent2"
                       style="background: ${profile.fields["color"]}; ${profile.fields["imported"]? "opacity:0.5":""}" ></ui5-avatar>`;
  return html`
        <div style="cursor:pointer; width:fit-content;" slot=${slot}
             @click=${(e: any) => {
    if (agentKey) {
      e.stopPropagation();
      e.preventDefault();
      parent.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {
        detail: {
          agentId: agentKey,
          x: e.clientX,
          y: e.clientY
        }, bubbles: true, composed: true
      }));
    }
  }}>
          ${avatar}
        </div>
    `
}


export function renderAvatarGroup(profilesZvm: ProfilesAltZvm, agents: AgentId[], size: string = "XS", classArg: string = "grpAvatar") {
  if (agents.length < 2) {
    console.warn("avatarGroup() too few agents", agents.length);
    return html``;
  }
  // typings.has(agentId)? "red" : ""
  //console.log("Authors' Avatar", Object.keys(authors).length);
  let avatars = Object.values(agents).map((agent) => {
    const profile = loadProfile(profilesZvm, agent);
    const initials = getInitials(profile.nickname);
    const avatarUrl = profile.fields['avatar'];
    return avatarUrl
      ? html`<ui5-avatar size=${size} class=${classArg}>
                <img .src=${avatarUrl} style="object-fit: cover;">
              </ui5-avatar>`
      : html`<ui5-avatar size=${size} class=${classArg}  shape="Circle" style="background: ${profile.fields["color"]}" initials=${initials} color-scheme="Accent2"></ui5-avatar>`;
  });
  return html`<ui5-avatar-group type="Group" style="width: auto">${avatars}</ui5-avatar-group>`;
}

/** */
export function renderAvatars(parent: LitElement, agentHashes: Uint8Array[], perspective: ProfilesAltPerspective): TemplateResult<1> {
  let peerList: TemplateResult<1>[] = [];
  const unknown = html`${msg('Unknown peer')}`;
  for (const agentId of agentHashes.map((hash) => new AgentId(hash))) {
    const ah = perspective.profileByAgent.get(agentId);
    console.log("renderProfiles", agentId, ah, perspective);
    if (!ah) {
      peerList.push(unknown);
      continue;
    }
    const pair = perspective.profiles.get(ah);
    const li = !pair
      ? unknown
      //: html`${pair![0].nickname}`;
      : html`<div style="cursor:pointer">${renderProfileAvatar(parent, agentId, pair![0], "XS")}</div>`;
    peerList.push(li);
  }
  return html`${peerList}`;
}


export function renderModerators(parent: LitElement, moderators: Uint8Array[], perspective: ProfilesAltPerspective): TemplateResult<1> {
  if (moderators.length > 0) {
    return renderAvatars(parent, moderators, perspective)
  }
  return html`<span>${msg('None')}</span>`;
}


// /** */
// export function rules2str(rules: Rules): string {
//    if ("manual" in rules) {
//      const instructions = rules.manual.instructions.length > 0 ? rules.manual.instructions
//        : msg("No instructions provided");
//     return msg('Manual') + ": " + instructions;
//   }
//   if ("auto" in rules) {
//     return msg('Auto') + ": "
//     + (rules.auto.canText? msg('Text, ') : "")
//     + (rules.auto.canFile? msg('File, ') : "")
//     + (rules.auto.canWal? msg('WAL, ') : "")
//     + (rules.auto.allowedAgents.length > 0? msg('Restricted') : msg('Everyone'))
//     + (rules.auto.maybeAgentCapPerDay? msg(', Capped') : "");
//   }
//   return msg('None');
// }


/** Return [notifTitle, notifBody, jumpEvent] */
export function composeNotificationTitle(notif: ThreadsNotification, threadsZvm: ThreadsZvm, filesDvm: FilesDvm, weServices: WeServicesEx): [string, string, CustomEvent<JumpEvent>] {
  let title: string = "";
  let content: string = "";
  let jump: CustomEvent<JumpEvent> | undefined = undefined;
  const ah = notif.content;
  switch (notif.event) {
    case NotifiableEvent.Mention: {
      jump = beadJumpEvent(ah);
      const beadInfo = threadsZvm.perspective.getBaseBeadInfo(ah);
      title = msg("Mention");
      if (beadInfo) {
        const typedBead = threadsZvm.perspective.getBaseBead(ah);
        const maybeThread = threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
        if (maybeThread) {
          title += " " + latestThreadName(maybeThread.title, maybeThread.pp, threadsZvm);
        }
        content = determineBeadName(beadInfo.beadType, typedBead!, filesDvm, weServices);
      }
    }
      break;
    case NotifiableEvent.NewBead: {
      jump = beadJumpEvent(ah);
      //console.log("composeNotificationTitle() NewBead", ah.short, threadsZvm)
      const beadInfo = threadsZvm.perspective.getBaseBeadInfo(ah);
      if (!beadInfo) {
        title = msg("New message");
      } else {
        const typedBead = threadsZvm.perspective.getBaseBead(ah);
        const maybeThread = threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
        const dmThread = threadsZvm.isThreadDm(beadInfo.bead.ppAh);
        if (dmThread) {
          title = msg("DM received");
        } else {
          if (maybeThread) {
            title = msg("New message in") + " " + latestThreadName(maybeThread.title, maybeThread.pp, threadsZvm);
          }
        }
        content = determineBeadName(beadInfo.beadType, typedBead!, filesDvm, weServices);
      }
    }
      break;
    case NotifiableEvent.Reply: {
      jump = beadJumpEvent(ah);
      const beadInfo = threadsZvm.perspective.getBaseBeadInfo(ah);
      if (!beadInfo) {
        title = msg("Reply");
      } else {
        const typedBead = threadsZvm.perspective.getBaseBead(ah);
        const maybeThread = threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
        if (maybeThread) {
          title = msg("Reply in") + " " + latestThreadName(maybeThread.title, maybeThread.pp, threadsZvm);
        }
        content = determineBeadName(beadInfo.beadType, typedBead!, filesDvm, weServices);
      }
    }
      break;
    case NotifiableEvent.Fork: {
      jump = threadJumpEvent(ah);
      const maybeThread = threadsZvm.perspective.threads.get(ah);
      title = msg("New channel");
      if (maybeThread) {
        // const subjectHash = maybeThread.pp.subjectHash;
        // const subject = this.getSubject(subjectHash);
        // title = "New thread about a " + subject.typeName;
        title += " " + latestThreadName(maybeThread.title, maybeThread.pp, threadsZvm);
        //content = msg("Rules") + ": " + rules2str(maybeThread.pp.rules);
      }
    }
      break;
    case NotifiableEvent.Banned: {
      jump = threadJumpEvent(ah);
      const maybeThread = threadsZvm.perspective.threads.get(ah);
      title = msg("Banned from channel");
      if (maybeThread) {
        content = latestThreadName(maybeThread.title, maybeThread.pp, threadsZvm);
        // content = msg("Rules") + ": " + rules2str(maybeThread.pp.rules);
      }
    }
      break;
    case NotifiableEvent.Flagged: {
      jump = beadJumpEvent(ah);
      const beadInfo = threadsZvm.perspective.getBaseBeadInfo(ah);
      if (!beadInfo) {
        title = msg("Message has been flagged");
      } else {
        const typedBead = threadsZvm.perspective.getBaseBead(ah);
        const maybeThread = threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
        if (maybeThread) {
          title = msg("Message has been flagged") + " " + latestThreadName(maybeThread.title, maybeThread.pp, threadsZvm);
        }
        content = determineBeadName(beadInfo.beadType, typedBead!, filesDvm, weServices);
      }
    }
      break;
    case NotifiableEvent.NewDmThread: {
      title = msg("New DM channel");
    }
      break;
    default:
      throw Error("Unhandled Event type");
      break;
  }
  return [title, content, jump!];
}


export function renderWelcomeScreen(parent: LitElement, profilesZvm: ProfilesAltZvm, icon: string, weProfilesDvm?: ProfilesDvm) {
  const profileCount = profilesZvm.perspective.agents.length;
  const weProfile = weProfilesDvm?.profilesZvm.getMyProfile();

  const greet = weProfilesDvm? msg('Import Profile into Vines') : msg('Create your Profile');
  
  return html`
      <div style="flex-grow:1; position: absolute; top:0; left:0; width:100%; height:100%;">
          ${doodle_flowers}
      </div>
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; padding-bottom:10px; margin:auto; min-width:380px;">
          <h1 style="font-family:arial; color:#5804A8; z-index:1;">
              <img src=${icon} width="32" height="32" style="padding-left: 5px;padding-top: 5px;"/>
              Vines
          </h1>
          <div>${profileCount} ${profileCount > 1? msg('peers') : msg('peer')}</div>
          <div style="align-items: center; z-index:1;">
              <ui5-card id="profileCard">
                  <ui5-card-header id="profileCardHeader" title-text=${greet}></ui5-card-header>
                  <vines-edit-profile
                          .profile=${weProfile}
                          @save-profile=${async (e: CustomEvent<ProfileMat>) => {
                            console.log("createMyProfile()", e.detail);
                            try {
                              await profilesZvm.createMyProfile(e.detail);
                            } catch (e: any) {
                              console.warn("Failed creating my Profile", e);
                              return;
                            }
                            /** Wait for perspective to update */
                            /** TODO: add a timeout */
                            let maybeMeProfile: Profile | undefined = undefined;
                            do {
                              maybeMeProfile = profilesZvm.getMyProfile();
                              await delay(20);
                            } while (!maybeMeProfile)
                            /** */
                            parent.requestUpdate();
                          }}
                  ></vines-edit-profile>
              </ui5-card>
          </div>
      </div>`;
}
