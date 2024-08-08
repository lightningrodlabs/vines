import {getInitials, ProfilesAltZvm} from "@ddd-qc/profiles-dvm";
import {html, LitElement, TemplateResult} from "lit";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {ThreadsZvm} from "./viewModels/threads.zvm";
import {determineBeadName} from "./utils";
import {FilesDvm} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {NotifiableEvent, ThreadsNotification} from "./viewModels/threads.materialize";
import {AgentId} from "@ddd-qc/lit-happ";
import {beadJumpEvent, JumpEvent, threadJumpEvent} from "./events";
import {msg} from "@lit/localize";



/** */
export function renderAvatar(profilesZvm: ProfilesAltZvm, agentKey: AgentId, size: string, classArg: string = "chatAvatar", slotArg?:string): TemplateResult<1> {
  const profile = loadProfile(profilesZvm, agentKey);
  return renderProfileAvatar(profile, size, classArg, slotArg);
}



export function loadProfile(profilesZvm: ProfilesAltZvm, agentKey: AgentId) {
  let profile = {nickname: "unknown", fields: {}} as ProfileMat;
  const maybeAgent = profilesZvm.perspective.getProfile(agentKey);
  if (maybeAgent) {
    profile = maybeAgent;
  } else {
    console.log("Profile not found for agent", agentKey, profilesZvm.perspective.profiles)
    profilesZvm.findProfile(agentKey)
    //.then((profile) => {if (!profile) return; console.log("Found", profile.nickname)})
  }
  return profile;
}


/** */
export function renderProfileAvatar(profile: ProfileMat, size: string, classArg: string = "chatAvatar", slotArg?:string) {
    const initials = getInitials(profile.nickname);
    const avatarUrl = profile.fields['avatar'];
    const slot = slotArg? slotArg : "avatar";
    //console.log("renderAvatar()", initials, avatarUrl);
    return avatarUrl? html`
              <ui5-avatar size=${size} class=${classArg} slot=${slot}>
                  <img src=${avatarUrl} style="object-fit: cover;">
              </ui5-avatar>
            `: html`
              <ui5-avatar size=${size} class=${classArg} slot=${slot} shape="Circle" initials=${initials} color-scheme="Accent2"></ui5-avatar>
    `;
}




/** Return [notifTitle, notifBody] */
export function  composeNotificationTitle(notif: ThreadsNotification, threadsZvm: ThreadsZvm, filesDvm: FilesDvm, weServices: WeServicesEx): [string, string, CustomEvent<JumpEvent>] {
    let title: string = "";
    let content: string = "";
    let jump: CustomEvent<JumpEvent>;
    const ah = notif.content;
    if (NotifiableEvent.Mention === notif.event) {
        jump = beadJumpEvent(ah);
        const beadInfo = threadsZvm.perspective.getBaseBeadInfo(ah);
        title = msg("Mention");
        if (beadInfo) {
            const typedBead = threadsZvm.perspective.getBaseBead(ah);
            const maybeThread = threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
            if (maybeThread) {
                title += " " + maybeThread.name;
            }
            content = determineBeadName(beadInfo.beadType, typedBead, filesDvm, weServices);
        }
    }
    if (NotifiableEvent.NewBead === notif.event) {
      jump = beadJumpEvent(ah);
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
            title = msg("New message in") + " " + maybeThread.name;
          }
        }
        content = determineBeadName(beadInfo.beadType, typedBead, filesDvm, weServices);
      }
    }
    if (NotifiableEvent.Reply === notif.event) {
      jump = beadJumpEvent(ah);
      const beadInfo = threadsZvm.perspective.getBaseBeadInfo(ah);
        if (!beadInfo) {
            title = msg("Reply");
        } else {
          const typedBead = threadsZvm.perspective.getBaseBead(ah);
            const maybeThread = threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
            if (maybeThread) {
                title = msg("Reply in") + " " + maybeThread.name;
            }
            content = determineBeadName(beadInfo.beadType, typedBead, filesDvm, weServices);
        }
    }
    if (NotifiableEvent.Fork === notif.event) {
        jump = threadJumpEvent(ah);
        const maybeThread = threadsZvm.perspective.threads.get(ah);
        title = msg("New channel");
        if (maybeThread)  {
            // const subjectHash = maybeThread.pp.subjectHash;
            // const subject = this.getSubject(subjectHash);
            // title = "New thread about a " + subject.typeName;
            title += " " + maybeThread.name;
            content = msg("Rules") + ": " + maybeThread.pp.rules;
        }
    }
    if (NotifiableEvent.NewDmThread === notif.event) {
      title = msg("New DM channel");
    }
    return [title, content, jump];
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
