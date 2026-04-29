import {AnyBeadMat, BeadType, EntryBeadMat, TextBeadMat, TypedBeadMat} from "./viewModels/threads.materialize";
import {FilesDvm, FileType, prettyFileSize} from "@ddd-qc/files";
import {AppletId, GroupProfile, Hrl, WAL, weaveUrlFromWal, weaveUrlToLocation} from "@theweave/api";
import {ThreadsZvm} from "./viewModels/threads.zvm";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {THIS_APPLET_ID} from "./contexts";
import {ParticipationProtocol, Subject, ThreadsEntryType, ThreadsProperties} from "./bindings/threads.types";
import {ProfilesAltZvm, Profile as ProfileMat} from "@ddd-qc/profiles-dvm";
import {ActionId, AgentId, DhtId, DnaId, EntryId, intoAnyId, intoDhtId, isHashTypeB64} from "@ddd-qc/lit-happ";
import {HoloHashB64, HoloHashType} from "@holochain/client";
import {SpecialSubjectType} from "./events";
import {toasty} from "./toast";
import {msg, str} from "@lit/localize";
import {DeliveryProperties} from "@ddd-qc/delivery";


/** MAIN TOPIC is hardcoded */
export const MAIN_TOPIC_ID: ActionId = ActionId.empty(77); // 'M'
export const MAIN_SEMANTIC_TOPIC = "Channels";


/** */
export function hrl2Id(hrl: Hrl): [DnaId, DhtId] {
  return [new DnaId(hrl[0]), intoDhtId(hrl[1])]
}

/** */
export function status2color(status: string): string {
  switch (status) {
    case "primary":
      return "rgb(14, 165, 233)";
      break;
    case "neutral":
      return "rgb(113, 113, 122)";
      break;
    case "success":
      return "rgb(34, 197, 94)";
      break;
    case "warning":
      return "rgb(245, 158, 11)";
      break;
    case "danger":
      return "rgb(239, 68, 68)";
      break;
    default:
      return "rgb(0, 0, 0)";
      break;
  }
}

export function getRandomHexColor(): string {
  // Generate a random integer between 0 and 255 for each color component (R, G, B)
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  // Convert each component to a two-digit hexadecimal string
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  // Combine the hexadecimal components into one string with a '#' prefix
  return `#${rHex}${gHex}${bHex}`;
}

export function generateRandomName(length: number = 2): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}


export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


/**
 * Extract the main type from the MIME type
 * MIME types are formatted as 'type/subtype; parameter=value'
 */
export function simplifyMimeType(mimeType: string): string {
  const match = mimeType.match(/^([a-z]+)\//i);
  if (!match || match.length < 2) {
    //throw new Error(`Invalid MIME type format: '${mimeType}'`);
    return mimeType;
  }
  const mainType = match[1]!.toLowerCase();
  // Only simplify for audio, video, or image types
  if (mainType === 'audio' || mainType === 'video' || mainType === 'image') {
    return `${mainType}/*`;
  }
  // For all other types, return the original MIME type
  return mimeType;
}


/** */
export function type2ui5Icon(type: FileType): string {
  switch (type) {
    case FileType.Document:
      return "document";
    case FileType.Pdf:
      return "pdf-attachment";
    case FileType.Text:
      return "document-text";
    case FileType.Font:
      return "attachment-text-file";
    case FileType.Image:
      return "attachment-photo";
    case FileType.Video:
      return "attachment-video";
    case FileType.Audio:
      return "attachment-audio";
    case FileType.Zip:
      return "attachment-zip-file";
    case FileType.Binary:
      return "document";
    case FileType.Other:
      return "document";
    default:
      return "document";
  }
  return "document";
}


/** Truncate string to given length and add ellipse */
export function truncate(str: string, n: number, useWordBoundary: boolean): string {
  if (str.length <= n) { return str; }
  const subString = str.slice(0, n - 1);
  return (useWordBoundary
    ? subString.slice(0, subString.lastIndexOf(" "))
    : subString) + "...";
}


/** */
export function unimportedProfiles(profilesZvm: ProfilesAltZvm, thisAgent?: AgentId): [ActionId, ProfileMat][] {
  return Array.from(profilesZvm.perspective.profiles.entries())
    .filter(([key, [profile, _ts]]) => !profile.fields["imported"] && (!thisAgent || thisAgent.equals(key)))
    .map(([key, [profile, _ts]]) => [key, profile])
}


/** Return the list of agents mentioned in a string */
export function parseMentions(str: string, profilesZvm: ProfilesAltZvm): AgentId[] {
  /** Make custom agentByName with filtered profiles */
  const profiles = unimportedProfiles(profilesZvm);
  console.log("parseMentions()", profiles);
  const agentByName: Record<string, AgentId[]> = {};
  profiles.map(([actionId, profile]) => {
    const cur = agentByName[profile.nickname];
    const agentId = profilesZvm.perspective.getProfileAgent(actionId)!;
    if (!cur) {
      agentByName[profile.nickname] = [agentId];
    } else {
      cur.push(agentId);
      agentByName[profile.nickname] = cur;
    }
  })
  const names = Object.keys(agentByName);
  /** Get Mentions */
  const mentions = tokenizeMentions(str, names);
  /** Handle special system mentions first */
  let hasAll = false;
  for (const mention of mentions) {
    if (mention == "all") {
      hasAll = true;
    }
  }
  let mentionedAgents = profilesZvm.perspective.agents;
  console.log("mentions, agentByName =", agentByName)
  if (!hasAll) {
    mentionedAgents = [];
    mentions.map((mentioned) => {
      const agents = agentByName[mentioned]!;
      if (agents) {
        mentionedAgents.push(...agents);
        if (agents.length > 1) {
          console.warn("parseMentions() multiple agents found for a mentioned name.", mentioned);
        }
      }
    })
  }
  return mentionedAgents;
}


interface Mention {
    name: string;
    startIndex: number;
    endIndex: number;
}


/** Return the list of known names that starts with '@' */
function tokenizeMentions(text: string, knownNames: string[]): string[] {
    const validNames = Array.from(knownNames);
    validNames.push("all");
    // Find mentions
    const mentions: Mention[] = [];
    // Sort names by length (longest first) to match "John Smith" before "John"
    const sortedNames = [...validNames].sort((a, b) => b.length - a.length);
    for (const name of sortedNames) {
        const regex = new RegExp(`(^|\\s)@${name}(?=\\s|$|[.,!?;:])`, 'gi');

        let match;
        while ((match = regex.exec(text)) !== null) {
            // match[1] is the captured whitespace/start, so @ starts after it
            const startIndex = match.index + match[1]!.length;
            const endIndex = startIndex + name.length + 1; // +1 for @

            // Skip if already captured by a longer name
            const overlaps = mentions.some(
                m => startIndex >= m.startIndex && startIndex < m.endIndex
            );

            if (!overlaps) {
                mentions.push({ name, startIndex, endIndex });
            }
        }
    }
    return mentions.map(m => m.name);
}


/** TODO: remove once it's implemented in we-applet */
export function weaveUrlToWal(url: string): WAL {
  const weaveLocation = weaveUrlToLocation(url);
  if (weaveLocation.type !== 'asset') {
    throw new Error('Passed URL is not a valid asset locator.');
  }
  return weaveLocation.wal;
}

export class AnyIdMap<T> extends Map<HoloHashB64, T> {}


/** Determine pp's name */
export function latestThreadName(threadTitle: string, pp: ParticipationProtocol, threadsZvm: ThreadsZvm): string {
  const curSubjectId = intoAnyId(pp.subject.address);
  const subjectType = pp.subject.typeName as SpecialSubjectType;
  const latestSubjectId = threadsZvm.perspective.getLatestSubject(curSubjectId);
  const latestSubject = threadsZvm.perspective.subjects.get(latestSubjectId.b64);
  //console.debug("latestThreadName", subjectType, latestSubject);
  let subjectName = pp.subject.name;
  if (!latestSubject) {
    if (subjectType == SpecialSubjectType.SemanticTopic) {
      let pair = threadsZvm.perspective.semanticTopics.get(ActionId.from(latestSubjectId));
      if (pair) {
        subjectName = pair[0];
      }
    }
  } else {
    subjectName = latestSubject.name;
    /** Handle Edit message special case */
    if (subjectType == SpecialSubjectType.TextBead && threadTitle == "EDIT") {
      const beadAh = ActionId.from(latestSubject.address);
      const tuple = threadsZvm.perspective.beads.get(beadAh);
      if (tuple) {
        return `"${(tuple[1] as TextBeadMat).value}"`;
      }
    }
  }
  //console.log("latestThreadName", curSubjectId.b64, latestSubjectId.b64, threadsZvm.perspective.subjects);
  return `${determineSubjectPrefix(subjectType)} ${subjectName}: ${threadTitle}`;
}


/**  */
export function determineSubjectPrefix(type: SpecialSubjectType) {
  switch (type) {
    /** -- special types -- */
    case SpecialSubjectType.Asset:
      return `📑`;
      break;
    case SpecialSubjectType.Applet:
      return `🛠`;
      break;
    case SpecialSubjectType.ParticipationProtocol:
      return `🧵`;
      break;
    case SpecialSubjectType.SubjectType:
      return `🧶`;
      break;
    case SpecialSubjectType.AgentPubKey:
      return "🧑";
      break;
    /** -- Vines types -- */
    case SpecialSubjectType.SemanticTopic:
      return `#`;
      break;
    case SpecialSubjectType.TextBead:
      return "💬";
      break;
    case SpecialSubjectType.EntryBead:
      return "📎";
      break;
    case SpecialSubjectType.AnyBead:
      return "🔗";
      break;
    /** -- Feed types -- */
    case SpecialSubjectType.Post:
      return ``;
      break;
    /** other */
    default:
      return "";
      break;
  }
}


/** */
export function getThisAppletId(weServices?: WeServicesEx): AppletId {
  if (weServices) weServices.appletIds[0];
  return THIS_APPLET_ID.b64;
}


/** We are determining the subject name and formatting it into a thread name */
export function determineSubjectName(subject: Subject, threadsZvm: ThreadsZvm, filesDvm: FilesDvm, weServices?: WeServicesEx): string {
  console.log("determineSubjectName()", subject);
  const thisAppletId = getThisAppletId(weServices);
  /** Threads Applet */
  if (subject.appletId == thisAppletId) {
    switch (subject.typeName) {
      /** -- special types -- */
      case SpecialSubjectType.Applet:
        if (weServices) {
          let appletInfo = weServices.cache.appletInfos.get(new EntryId(weServices.appletIds[0]!));
          if (appletInfo) {
            return appletInfo.appletName;
          }
        }
        return `{Unknown Applet}`;
        break
      case SpecialSubjectType.AgentPubKey:
        // FIXME: grab agent name in profiles
        return `{Unknown AgentPubKey}`;
        break
      case SpecialSubjectType.ParticipationProtocol: {
        const ah = new ActionId(subject.address);
        const thread = threadsZvm.perspective.threads.get(ah);
        if (!thread) {
          //thread = await threadsZvm.fetchPp(subject.address);
          return "{Unknown Thread}";
        }
        return latestThreadName(thread.title, thread.pp, threadsZvm);
      }
        break;
      case SpecialSubjectType.SubjectType:
        if (weServices) {
          //let appletInfo = await weServices.appletInfo(decodeHashFromBase64(weServices.appletId));
          let appletInfo = weServices.cache.appletInfos.get(new EntryId(weServices.appletIds[0]!));
          if (!appletInfo) {
            //semTopic = (await threadsZvm.zomeProxy.fetchTopic(decodeHashFromBase64(subject.hash))).title;
            return "{Unknown Applet}";
          }
          return `/${appletInfo.appletName}/{${subject.typeName}}`;
        } else {
          return `{${subject.typeName}}`;
        }
        break;
      /** -- Feed types -- */
      case SpecialSubjectType.Post: {
        const ah = new ActionId(subject.address);
        const beadInfo = threadsZvm.perspective.getBeadInfo(ah);
        if (beadInfo) {
          const typed = threadsZvm.perspective.getBead(ah);
          return determineBeadName(beadInfo.beadType, typed!, filesDvm, weServices);
        } else {
          return `{Unknown Post}`;
        }
      }
        break;
      /** -- Vines types -- */
      case SpecialSubjectType.SemanticTopic:
        const pair = threadsZvm.perspective.semanticTopics.get(new ActionId(subject.address));
        if (!pair) {
          //semTopic = (await threadsZvm.zomeProxy.fetchTopic(decodeHashFromBase64(subject.address))).title;
          return "{Unknown Category}";
        }
        return pair[0];
        break;
      case SpecialSubjectType.TextBead:
      case SpecialSubjectType.EntryBead:
      case SpecialSubjectType.AnyBead:
      case SpecialSubjectType.EncryptedBead:
        const ah = new ActionId(subject.address);
        const typedMat = threadsZvm.perspective.getBaseBead(ah);
        if (!typedMat) {
          //console.log("determineSubjectName() bead not found. Fetching.", subject.hash);
          ///*const typed =*/ await threadsZvm.fetchTypedBead(decodeHashFromBase64(subject.hash), subject.typeName/*, false*/);
          //typedMat = materializeTypedBead(typed, subject.typeName);
          //typedMat = threadsZvm.getBaseBead(subject.hash);
          return "{Unknown Message}";
        }
        const beadName = determineBeadName(subject.typeName as unknown as BeadType, typedMat, filesDvm, weServices);
        //console.log("determineSubjectName() beadName", beadName);
        return beadName;
        break;
      /** unknown */
      default:
        return `{Unknown '${subject.typeName}'}`;
        break;
    }
  } else {
    /** Unknown Asset */
    if (weServices) {
      let appletInfo = weServices.cache.appletInfos.get(new EntryId(weServices.appletIds[0]!));
      if (!appletInfo) {
        return "{Unknown Applet Asset}";
      }
      //const hrl: Hrl = [decodeHashFromBase64(subject.dnaHash), decodeHashFromBase64(subject.hash)];
      /** FIXME */
      if (isHashTypeB64(subject.address, HoloHashType.Dna)) {
        const dnaId = new DnaId(subject.address);
        const hrl = intoHrl(dnaId, intoDhtId(subject.address));
        const wurl = weaveUrlFromWal({hrl});
        const maybeInfo = weServices!.cache.assetInfos[wurl];
        if (maybeInfo) {
          return `/${appletInfo.appletName}/${maybeInfo.assetInfo.name}`;
        } else {
          return `/${appletInfo.appletName}/UnknownAsset`;
        }
      } else {
        return `/${appletInfo.appletName}/{${subject.typeName}}`;
      }
    } else {
      return `{Unknown Applet Asset}`;
    }
  }
}


/** */
export function determineBeadName(beadType: BeadType, typedBead: TypedBeadMat, filesDvm: FilesDvm, weServices: WeServicesEx | undefined, charCount: number = 60): string {
  //console.log("determineBeadName()", typedBead);
  switch (beadType) {
    /** TextBead: text content */
    case ThreadsEntryType.TextBead:
      return truncate((typedBead as TextBeadMat).value, charCount, true);
      break;
    /** EntryBead: Filename */
    case ThreadsEntryType.EntryBead:
      if (!filesDvm) {
        return "<unknown file>";
      }
      const fileBead = typedBead as EntryBeadMat;
      const pprm = filesDvm.deliveryZvm.perspective.publicParcels.get(fileBead.sourceEh);
      if (!pprm) {
        return "<file>";
      }
      return pprm.description.name;
      break;
    /** AnyBead: assetInfo.name */
    case ThreadsEntryType.AnyBead:
      if (!weServices) {
        return "<unknown asset>";
      }
      const hrlBead = typedBead as AnyBeadMat;
      const wal = weaveUrlToWal(hrlBead.value);
      const attLocInfo = weServices.assetInfoCached(wal);
      if (!attLocInfo) {
        return "<unknown asset>";
      }
      return attLocInfo.assetInfo.name;
      break;
    /** */
    default:
      break;
  }
  return "<unknown>";
}


/* Use weServices, otherwise try from dna properties */
export function determinerGroupProfile(dnaProperties: ThreadsProperties, tuple?: [WeServicesEx, number]): GroupProfile {
  /** weServices */
  if (tuple && tuple[0]) {
    const weServices = tuple[0];
    const appletInfo = weServices.appletInfoCached(new EntryId(weServices.appletIds[tuple[1]]!));
    //console.log("get appletInfo", appletInfo);
    if (appletInfo) {
      //console.log("get groupProfile", appletInfo.groupsHashes[0]);
      const weGroup = weServices.groupProfileCached(new DnaId(appletInfo.groupsHashes[0]!));
      if (weGroup) {
        return weGroup;
      }
    }
  }
  /** dnaProperties */
  let groupProfile: GroupProfile = {
    name: "Vines",
    icon_src: "icon.png",
  };
  if (dnaProperties.groupName && dnaProperties.groupName != "MyTeam") {
    groupProfile.name = dnaProperties.groupName;
  }
  // if (groupProfile.name == "Vines" && _dvm.cell.dnaModifiers.network_seed) {
  //   groupProfile.name = this._dvm.cell.dnaModifiers.network_seed;
  // }
  if (dnaProperties.groupSvgIcon) {
    groupProfile.icon_src = `data:image/svg+xml;base64,${dnaProperties.groupSvgIcon}`;
  }

  return groupProfile;
}


/** */
export function isFileValid(file: File, dnaProperties: DeliveryProperties): boolean {
  if (file.size > dnaProperties.maxParcelSize) {
    toasty(msg(str`File is too big: ${prettyFileSize(file.size)}. Maximum file size: ${prettyFileSize(dnaProperties.maxParcelSize)}`))
    return false;
  }
  if (file.size <= 0) {
    toasty(msg(`File is empty.`));
    return false;
  }
  if (file.name.length < dnaProperties.minParcelNameLength) {
    toasty(msg(str`File name is too short: ${file.name.length}. Minimum file name length: ${dnaProperties.minParcelNameLength}`));
    return false;
  }
  if (file.name.length > dnaProperties.maxParcelNameLength) {
    toasty(msg(str`File name is too long: ${file.name.length}. Maximum file name length: ${dnaProperties.maxParcelNameLength}`));
    return false;
  }
  return true;
}
