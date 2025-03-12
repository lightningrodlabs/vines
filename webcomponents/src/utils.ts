import {AnyBeadMat, BeadType, EntryBeadMat, TextBeadMat, TypedBeadMat} from "./viewModels/threads.materialize";
import {FilesDvm, FileType} from "@ddd-qc/files";
import {AppletId, GroupProfile, Hrl, WAL, weaveUrlFromWal, weaveUrlToLocation} from "@theweave/api";
import {ThreadsZvm} from "./viewModels/threads.zvm";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {THIS_APPLET_ID} from "./contexts";
import {ParticipationProtocol, Subject, ThreadsEntryType, ThreadsProperties} from "./bindings/threads.types";
import {ProfilesAltZvm} from "@ddd-qc/profiles-dvm";
import {ActionId, AgentId, DhtId, DnaId, EntryId, intoAnyId, intoDhtId, isHashTypeB64} from "@ddd-qc/lit-happ";
import {HoloHashType} from "@ddd-qc/cell-proxy/dist/hash";
import {HoloHashB64} from "@holochain/client";
import {SpecialSubjectType} from "./events";


/** */
export function hrl2Id(hrl: Hrl): [DnaId, DhtId] {
  return [new DnaId(hrl[0]), intoDhtId(hrl[1])]
}

/** */
export function status2color(status: string): string {
  switch(status) {
    case "primary": return "rgb(14, 165, 233)"; break;
    case "neutral": return "rgb(113, 113, 122)"; break;
    case "success": return "rgb(34, 197, 94)"; break;
    case "warning": return "rgb(245, 158, 11)"; break;
    case "danger": return "rgb(239, 68, 68)"; break;
    default: return "rgb(0, 0, 0)"; break;
  }
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
    throw new Error(`Invalid MIME type format: '${mimeType}'`);
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
    case FileType.Document: return "document";
    case FileType.Pdf: return "pdf-attachment";
    case FileType.Text: return "document-text";
    case FileType.Font: return "attachment-text-file";
    case FileType.Image: return "attachment-photo";
    case FileType.Video: return "attachment-video";
    case FileType.Audio: return "attachment-audio";
    case FileType.Zip: return "attachment-zip-file";
    case FileType.Binary: return "document";
    case FileType.Other: return "document";
    default: return "document";
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
};




/** Return list of agents mentionned in a string */
export function parseMentions(str: string, profilesZvm: ProfilesAltZvm): AgentId[] {
  const mentions = tokenizeMentions(str);
  /** Handle special mentions */
  let hasAll = false;
  for (const mention of mentions) {
    if (mention == "all") {
      hasAll = true;
    }
  }
  let mentionedAgents = profilesZvm.perspective.agents;
  if (!hasAll) {
    mentionedAgents = mentions
      .map((mentioned) => profilesZvm.perspective.getAgent(mentioned)!)
      //.filter((el) => el != undefined);
  }
  return mentionedAgents;
}


/** Return list of words that starts with '@' */
function tokenizeMentions(str: string): string[]  {
  if (typeof str !== 'string') {
    throw new TypeError('expected a string');
  }

  var re = /(?:[\w_＠@][＠@])|[＠@]([\w_]{1,15})(?=$|[^\w_])/g;
  var tokens: any = { input: str, output: str, matches: [] };
  var match;

  while ((match = re.exec(tokens.output))) {
    if (!match[1]) continue;
    var token = { name: match[1], match: match };
    tokens.matches.push(token);
  }
  return tokens.matches.map((m:any) => m.name);
};


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
  let subjectName = "unknown thread";

  const latestSubjectId = threadsZvm.perspective.getLatestSubject(curSubjectId);
  const latestSubject = threadsZvm.perspective.subjects.get(latestSubjectId.b64);
  if (!latestSubject) {
    if(subjectType == SpecialSubjectType.SemanticTopic) {
      let pair = threadsZvm.perspective.semanticTopics.get(ActionId.from(latestSubjectId));
      if (pair) {
        subjectName = pair[0];
      }
    }
  } else {
    subjectName = latestSubject.name;
    /** Handle Edit message special case */
    if(subjectType == SpecialSubjectType.TextBead && threadTitle == "EDIT") {
      const beadAh = ActionId.from(latestSubject.address);
      const tuple = threadsZvm.perspective.beads.get(beadAh);
      if (tuple) {
        return `"${(tuple[1] as TextBeadMat).value}"`;
      }
    }
  }
  console.log("latestThreadName", curSubjectId.short, latestSubjectId.short, threadsZvm.perspective.subjects);
  return `${determineSubjectPrefix(subjectType)} ${subjectName}: ${threadTitle}`;
}


/**  */
export function determineSubjectPrefix(type: SpecialSubjectType) {
    switch (type) {
      /** -- special types -- */
      case SpecialSubjectType.ParticipationProtocol: return `🧵`; break;
      case SpecialSubjectType.SubjectType: return `🧶`; break;
      case SpecialSubjectType.AgentPubKey: return "🧑"; break;
      /** -- Vines types -- */
      case SpecialSubjectType.SemanticTopic: return `#`; break;
      case SpecialSubjectType.TextBead: return "💬"; break;
      case SpecialSubjectType.EntryBead: return "📎"; break;
      case SpecialSubjectType.AnyBead:return "🔗"; break;
      /** -- Feed types -- */
      case SpecialSubjectType.Post: return ``; break;
      /** other */
      default: return ""; break;
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
          return "{Unknown Topic}";
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
  if(tuple && tuple[0]) {
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
