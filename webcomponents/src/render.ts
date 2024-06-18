import {getInitials, ProfilesAltZvm} from "@ddd-qc/profiles-dvm";
import {AgentPubKeyB64, encodeHashToBase64} from "@holochain/client";
import {html, LitElement, TemplateResult} from "lit";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {
  NotifiableEvent,
  } from "./bindings/threads.types";
import {ThreadsZvm} from "./viewModels/threads.zvm";
import {determineBeadName} from "./utils";
import {FilesDvm} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {ThreadsNotification} from "./viewModels/threads.perspective";



/** */
export function renderAvatar(profilesZvm: ProfilesAltZvm, agentKey: AgentPubKeyB64, size: string, classArg: string = "chatAvatar", slotArg?:string): TemplateResult<1> {
  const profile = loadProfile(profilesZvm, agentKey);
  return renderProfileAvatar(profile, size, classArg, slotArg);
}



export function loadProfile(profilesZvm: ProfilesAltZvm, agentKey: AgentPubKeyB64) {
  let profile = {nickname: "unknown", fields: {}} as ProfileMat;
  const maybeAgent = profilesZvm.perspective.profiles[agentKey];
  if (maybeAgent) {
    profile = maybeAgent;
  } else {
    console.log("Profile not found for agent", agentKey, profilesZvm.perspective.profiles)
    profilesZvm.probeProfile(agentKey)
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
                  <img src=${avatarUrl}>
              </ui5-avatar>
            `: html`
              <ui5-avatar size=${size} class=${classArg} slot=${slot} shape="Circle" initials=${initials} color-scheme="Accent2"></ui5-avatar>
    `;
}




/** Return [notifTitle, notifBody] */
export function  composeNotificationTitle(notif: ThreadsNotification, threadsZvm: ThreadsZvm, filesDvm: FilesDvm, weServices: WeServicesEx): [string, string] {
    let title: string = "";
    let content: string = "";
    const ah = notif.content;
    if (NotifiableEvent.Mention === notif.event) {
        const beadInfo = threadsZvm.getBaseBeadInfo(ah);
        if (!beadInfo) {
            title = "Mention in thread";
        } else {
            const typedBead = threadsZvm.getBaseBead(ah);
            const maybeThread = threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
            if (maybeThread) {
                title = "Mention in thread " + maybeThread.name;
            }
            content = determineBeadName(beadInfo.beadType, typedBead, filesDvm, weServices);
        }
    }
    if (NotifiableEvent.NewBead === notif.event) {
      const beadInfo = threadsZvm.getBaseBeadInfo(ah);
      if (!beadInfo) {
        title = "New message in thread";
      } else {
        const typedBead = threadsZvm.getBaseBead(ah);
        const maybeThread = threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
        const dmThread = threadsZvm.isThreadDm(beadInfo.bead.ppAh);
        if (dmThread) {
          title = "DM received";
        }
        else {
          if (maybeThread) {
            title = "New message in thread " + maybeThread.name;
          }
        }
        content = determineBeadName(beadInfo.beadType, typedBead, filesDvm, weServices);
      }
    }
    if (NotifiableEvent.Reply === notif.event) {
      const beadInfo = threadsZvm.getBaseBeadInfo(ah);
        if (!beadInfo) {
            title = "Reply in thread";
        } else {
          const typedBead = threadsZvm.getBaseBead(ah);
            const maybeThread = threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
            if (maybeThread) {
                title = "Reply in thread " + maybeThread.name;
            }
            content = determineBeadName(beadInfo.beadType, typedBead, filesDvm, weServices);
        }
    }
    if (NotifiableEvent.Fork === notif.event) {
        const maybeThread = threadsZvm.perspective.threads.get(ah);
        if (!maybeThread)  {
            title = "New thread";
        } else {
            // const subjectHash = maybeThread.pp.subjectHash;
            // const subject = this.getSubject(subjectHash);
            // title = "New thread about a " + subject.typeName;
            title = "New thread: " + maybeThread.name;
            content = "Rules: " + maybeThread.pp.rules;
        }
    }
    if (NotifiableEvent.NewDmThread === notif.event) {
      title = "New DM thread";
    }
    return [title, content];
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
