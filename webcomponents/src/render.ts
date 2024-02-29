import {getInitials, ProfilesAltZvm, ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {AgentPubKeyB64, decodeHashFromBase64, encodeHashToBase64} from "@holochain/client";
import {html, LitElement, TemplateResult} from "lit";
import {Profile as ProfileMat} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {
    NotifiableEventType,
  TextBead,
    ThreadsEntryType,
    WeaveNotification
} from "./bindings/threads.types";
import {ThreadsZvm} from "./viewModels/threads.zvm";
import {
  AnyBeadMat,
  BeadInfo,
  EntryBeadMat,
  TextBeadMat,
  TypedBead,
  TypedBeadMat
} from "./viewModels/threads.perspective";
import {stringifyHrl} from "@ddd-qc/we-utils";
import {decodeHrl} from "./utils";
import {FilesDvm, prettyFileSize} from "@ddd-qc/files";
import markdownit from "markdown-it";
import {unsafeHTML} from "lit/directives/unsafe-html.js";
import {Hrl} from "@lightningrodlabs/we-applet";
import {toasty} from "./toast";
import {ThreadsDvm} from "./viewModels/threads.dvm";
import {WeServicesEx} from "./weServicesEx";


/** */
export function renderAvatar(profilesZvm: ProfilesAltZvm, agentKey: AgentPubKeyB64, size: string): TemplateResult<1> {
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
              <ui5-avatar size=${size} class="chatAvatar" slot="avatar">
                  <img src=${avatarUrl}>
              </ui5-avatar>
            `: html`
              <ui5-avatar size=${size} class="chatAvatar" slot="avatar" shape="Circle" initials=${initials} color-scheme="Accent2"></ui5-avatar>
    `;
}



/** */
export function renderSideBead(parent: LitElement, infoPair: [BeadInfo, TypedBead], threadsDvm: ThreadsDvm, filesDvm: FilesDvm, isNew: boolean, weServices?: WeServicesEx) {
  console.log("renderSideBead() infoPair", infoPair);
  if (infoPair == undefined) {
    return html``;
  }
  const [beadInfo, typedBead] = infoPair;

  const date = new Date(beadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
  const date_str = date.toLocaleString('en-US', {hour12: false});

  const agentName = threadsDvm.profilesZvm.perspective.profiles[beadInfo.author]? threadsDvm.profilesZvm.perspective.profiles[beadInfo.author].nickname : "unknown";
  let content = html`<div>__unknown__</div>`;
  switch(beadInfo.beadType) {
    case ThreadsEntryType.TextBead:
      const tm = typedBead as TextBead;
      //content = tm.value;
      const md = markdownit();
      //const md = markdownit().use(emoji/* , options */);
      const result = md.render(tm.value);
      const parsed = unsafeHTML(result);
      /** render all */
      content = html`<div>${parsed}</div>`;
      break;
    case ThreadsEntryType.AnyBead:
      content = html`<div>__HRL__</div>`;
      const anyBead = typedBead as any as AnyBeadMat;
      if (anyBead.typeInfo === "hrl" && weServices) {
        const obj: [string, string] = JSON.parse(anyBead.value);
        const hrl: Hrl = [decodeHashFromBase64(obj[0]), decodeHashFromBase64(obj[1])];
        const hrlStr = stringifyHrl(hrl);
        const id = "hrl-item" + "-" + obj[0];
        if (weServices.getAttachableInfo(hrlStr)) {
          content = html`
              <div .id=${id} style="color:#8a0cb7; cursor:pointer; overflow: auto;"
                   @click=${(_e) => weServices.openHrl({hrl})}>
                  HRL: ${hrlStr}
              </div>
          `;
        } else {
            weServices.attachableInfo({hrl}).then(async (attLocAndInfo) => {
            //await delay(100); // or maybe do a a requestUpdate()
            const item = parent.shadowRoot.getElementById(id) as HTMLElement;
            if (item) {
              item.innerText = attLocAndInfo.attachableInfo.name;
            }
          });
        }
      }
      break;
    case ThreadsEntryType.EntryBead:
      content = html`<div>__File__</div>`;
      const entryBead = typedBead as any as EntryBeadMat;
      console.log("<comment-thread-view> entryBead", entryBead, entryBead.sourceEh);
      const manifestEh = entryBead.sourceEh;
      const maybeTuple = filesDvm.deliveryZvm.perspective.publicParcels[manifestEh];
      if (maybeTuple) {
        const desc = maybeTuple[0];
        content = html`<div style="color:#1067d7; cursor:pointer; overflow: auto;" 
                              @click=${(e) => {
          filesDvm.downloadFile(manifestEh);
          toasty("File downloaded: " + desc.name);
        }}>
                          File: ${desc.name} (${prettyFileSize(desc.size)})
                      </div>`;
      }
      break;
    default:
      break;
  }

  /* render item */
  return html`
    <div class="sideItem" style="${isNew? "border: 1px solid #F64F4F" : ""};">
        <div class="avatarRow">
            ${renderAvatar(threadsDvm.profilesZvm, beadInfo.author, "XS")}
            <div class="nameColumn" style="display:flex; flex-direction:column;">
                <span class="agentName">${agentName}</span>
                <span class="chatDate"> ${date_str}</span>
            </div>
        </div>
        <div class="contentRow">
          ${content}
        </div>
    </div>`;
}


/** Return [notifTitle, notifBody] */
export function  composeNotificationTitle(notif: WeaveNotification, threadsZvm: ThreadsZvm, filesDvm: FilesDvm, weServices: WeServicesEx): [string, string] {
    let title: string = "";
    let content: string = "";
    const ah = encodeHashToBase64(notif.content);
    if (NotifiableEventType.Mention in notif.event) {
        const beadPair = threadsZvm.perspective.beads[ah];
        if (!beadPair) {
            title = "Mention in channel";
        } else {
            const beadInfo = beadPair[0];
            const typedBead = beadPair[1];
            const maybeThread = threadsZvm.getThread(beadInfo.bead.ppAh);
            if (maybeThread) {
                title = "Mention in channel " + maybeThread.name;
            }
            content = determineBeadName(beadInfo, typedBead, filesDvm, weServices);
        }
    }
    if (NotifiableEventType.NewBead in notif.event) {
      const beadPair = threadsZvm.perspective.beads[ah];
      if (!beadPair) {
        title = "New message in channel";
      } else {
        const beadInfo = beadPair[0];
        const typedBead = beadPair[1];
        const maybeThread = threadsZvm.getThread(beadInfo.bead.ppAh);
        if (maybeThread) {
          title = "New message in channel " + maybeThread.name;
        }
        content = determineBeadName(beadInfo, typedBead, filesDvm, weServices);
      }
    }
    if (NotifiableEventType.Reply in notif.event) {
        const beadPair = threadsZvm.perspective.beads[ah];
        if (!beadPair) {
            title = "Reply in channel";
        } else {
            const beadInfo = beadPair[0];
            const typedBead = beadPair[1];
            const maybeThread = threadsZvm.getThread(beadInfo.bead.ppAh);
            if (maybeThread) {
                title = "Reply in channel " + maybeThread.name;
            }
            content = determineBeadName(beadInfo, typedBead, filesDvm, weServices);
        }
    }
    if (NotifiableEventType.Fork in notif.event) {
        const maybeThread = threadsZvm.getThread(ah);
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
    if (NotifiableEventType.Dm in notif.event) {
        // TODO
    }
    return [title, content];
}



/** */
export function determineBeadName(beadInfo: BeadInfo, typedBead: TypedBeadMat, filesDvm: FilesDvm, weServices: WeServicesEx): string {
    switch (beadInfo.beadType) {
      /** TextBead: text content */
      case ThreadsEntryType.TextBead: return (typedBead as TextBeadMat).value; break;
      /** EntryBead: Filename */
      case ThreadsEntryType.EntryBead:
            const fileBead = typedBead as EntryBeadMat;
            const tuple = filesDvm.deliveryZvm.perspective.publicParcels[fileBead.sourceEh];
            if (!tuple) {
                return "<file>";
            }
            return tuple[0].name;
        break;
      /** AnyBead: AttachableInfo.name */
      case ThreadsEntryType.AnyBead:
            const hrlBead = typedBead as AnyBeadMat;
            const hrl = decodeHrl(hrlBead.value);
            const attLocInfo = weServices.getAttachableInfo(stringifyHrl(hrl));
            if (!attLocInfo) {
                return "<unknown attachable>";
            }
            return attLocInfo.attachableInfo.name;
        break;
      /** */
      default:
        break;
    }
    return "<unknown>";
}
