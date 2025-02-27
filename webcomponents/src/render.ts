import {getInitials, ProfilesAltPerspective, ProfilesAltZvm} from "@ddd-qc/profiles-dvm";
import {html, LitElement, TemplateResult} from "lit";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {ThreadsZvm} from "./viewModels/threads.zvm";
import {determineBeadName, latestThreadName} from "./utils";
import {FilesDvm} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {NotifiableEvent, ThreadsNotification} from "./viewModels/threads.materialize";
import {AgentId} from "@ddd-qc/lit-happ";
import {beadJumpEvent, JumpEvent, ShowProfileEvent, threadJumpEvent} from "./events";
import {msg} from "@lit/localize";
import {Rules} from "./bindings/threads.types";


/** Get profile for agent, otherwise fetch it from DHT and return unknown Profile */
export function loadProfile(profilesZvm: ProfilesAltZvm, agentKey: AgentId): ProfileMat {
  let profile = {nickname: "unknown", fields: {}} as ProfileMat;
  const maybeAgent = profilesZvm.perspective.getProfile(agentKey);
  if (maybeAgent) {
    profile = maybeAgent;
  } else {
    console.log("Profile not found for agent", agentKey, profilesZvm.perspective.profiles)
    /* await */ profilesZvm.findProfile(agentKey);
    //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
  }
  return profile;
}


/** */
export function renderAvatar(profilesZvm: ProfilesAltZvm, agentKey: AgentId, size: string, classArg: string = "chatAvatar", slotArg?:string): TemplateResult<1> {
  const profile = loadProfile(profilesZvm, agentKey);
  return renderProfileAvatar(profile, size, classArg, slotArg);
}


/** Render ui5-avatar with profile pic */
export function renderProfileAvatar(profile: ProfileMat, size: string, classArg: string = "chatAvatar", slotArg?: string) {
    const initials = getInitials(profile.nickname);
    const avatarUrl = profile.fields['avatar'];
    const slot = slotArg? slotArg : "";
    return avatarUrl
      ? html`<ui5-avatar size=${size} class=${classArg} slot=${slot}>
                <img .src=${avatarUrl} style="object-fit: cover;">
              </ui5-avatar>`
      : html`<ui5-avatar size=${size} class=${classArg} slot=${slot} shape="Circle" initials=${initials} color-scheme="Accent2"></ui5-avatar>`;
}


/** */
export function renderAvatars(agentHashes: Uint8Array[], lit: LitElement, perspective: ProfilesAltPerspective): TemplateResult<1> {
  let peerList: TemplateResult<1>[] = [];
  const unknown = html`${msg('Unknown member')}`;
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
      : html`<div style="cursor:pointer"
                      @click=${(e:any) => {
        e.preventDefault(); e.stopPropagation();
        lit.dispatchEvent(new CustomEvent<ShowProfileEvent>('show-profile', {detail: {agentId, x: e.clientX, y: e.clientY}, bubbles: true, composed: true}));
      }}>${renderProfileAvatar(pair![0], "XS")}</div>`;
    peerList.push(li);
  }
  return html`${peerList}`;
}


export function renderModerators(rules: Rules, lit: LitElement, perspective: ProfilesAltPerspective): TemplateResult<1> {
  if ("manual" in rules) {
    return renderAvatars(rules.manual.moderators, lit, perspective)
  }
  if ("auto" in rules) {
    return html`<span>${msg('Automatic')}</span>`;
  }
  return html`<span>${msg('None')}</span>`;
}


/** */
export function rules2str(rules: Rules): string {
   if ("manual" in rules) {
     const instructions = rules.manual.instructions.length > 0 ? rules.manual.instructions
       : msg("No instructions provided");
    return msg('Manual') + ": " + instructions;
  }
  if ("auto" in rules) {
    return msg('Auto') + ": "
    + (rules.auto.canText? msg('Text, ') : "")
    + (rules.auto.canFile? msg('File, ') : "")
    + (rules.auto.canWal? msg('WAL, ') : "")
    + (rules.auto.allowedAgents.length > 0? msg('Restricted') : msg('Everyone'))
    + (rules.auto.maybeAgentCapPerDay? msg(', Capped') : "");
  }
  return msg('None');
}


/** Return [notifTitle, notifBody, jumpEvent] */
export function  composeNotificationTitle(notif: ThreadsNotification, threadsZvm: ThreadsZvm, filesDvm: FilesDvm, weServices: WeServicesEx): [string, string, CustomEvent<JumpEvent>] {
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
        }
        else {
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
        if (maybeThread)  {
            // const subjectHash = maybeThread.pp.subjectHash;
            // const subject = this.getSubject(subjectHash);
            // title = "New thread about a " + subject.typeName;
            title += " " + latestThreadName(maybeThread.title, maybeThread.pp, threadsZvm);
            content = msg("Rules") + ": " + rules2str(maybeThread.pp.rules);
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


/** Change a timestamp to date of type "March 11, 2024" */
export function ts2day(ts: number): string {
  if (ts <= 0) {
    return "N/A";
  }
  const date = new Date(ts / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds

  /** Array of month names ; TODO: localize */
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  /* Get the month, day, and year components */
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  /* Format the date string */
  const formattedDate = `${month} ${day}, ${year}`;

  return formattedDate;
}
