import {
  AnyBeadMat,
  BeadType, EntryBeadMat, ParticipationProtocolMat,
  SubjectMat, TextBeadMat,
  TypedBeadMat
} from "./viewModels/threads.materialize";
import {FilesDvm, FileType} from "@ddd-qc/files";
import {WAL, weaveUrlToLocation} from "@lightningrodlabs/we-applet";
import {ThreadsZvm} from "./viewModels/threads.zvm";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {THIS_APPLET_ID} from "./contexts";
import {ThreadsEntryType} from "./bindings/threads.types";
import {ProfilesAltZvm} from "@ddd-qc/profiles-dvm";
import {ActionId, AgentId, DnaId, EntryId} from "@ddd-qc/lit-happ";
import {HoloHashType} from "@ddd-qc/cell-proxy/dist/hash";
import {HoloHashB64} from "@holochain/client";
import {SpecialSubjectType} from "./events";


// /** */
// export function getIndexByVariant(enumType: any, value: string): number {
//   const keys = Object.keys(enumType).filter(key => isNaN(Number(key))); // Filter out numeric keys if present
//   for (let i = 0; i < keys.length; i++) {
//     if (enumType[keys[i]] === value) {
//       return i;
//     }
//   }
//   throw Error("Value not found in enum");
// }

//
//
// /** */
// export function getSettingType(index: number): NotifySetting {
//   const keys = Object.keys(NotifySetting);
//   if (index >= 0 && index < keys.length) {
//     const key = keys[index];
//     return NotifySetting[key];
//   }
//   /** */
//   throw Error("Out of bounds index for NotifySetting");
// }
//
//
// /** */
// export function getEventType(index: number): NotifiableEvent {
//   const keys = Object.keys(NotifiableEvent);
//   if (index >= 0 && index < keys.length) {
//     const key = keys[index];
//     return NotifiableEvent[key];
//   }
//   /** */
//   throw Error("Out of bounds index for NotifiableEvent");
// }
//
// /** */
// export function getLinkType(index: number): ThreadsLinkType {
//   const keys = Object.keys(ThreadsLinkType);
//   if (index >= 0 && index < keys.length) {
//     const key = keys[index];
//     return ThreadsLinkType[key];
//   }
//   /** */
//   throw Error("Out of bounds index for ThreadsLinkType");
// }
//
//
// /** */
// export function getEntryType(index: number): ThreadsEntryType {
//   const keys = Object.keys(ThreadsEntryType);
//   if (index >= 0 && index < keys.length) {
//     const key = keys[index];
//     return ThreadsEntryType[key];
//   }
//   /** */
//   throw Error("Out of bounds index for ThreadsEntryType");
// }

//
// export const HASH_TYPE_PREFIX_B64 = {
//   Agent: "uhCAk",
//   Entry: "uhCEk",
//   Dna: "uhC0k",
//   Action: "uhCkk",
//   External: "uhC8k",
// };
//
// /** */
// export function isHashTypeB64(hash: HoloHashB64, hashType: "Agent" | "Entry" | "Dna" | "Action" | "External") {
//   const slice = hash.slice(0, 5);
//   const prefix = HASH_TYPE_PREFIX_B64[hashType];
//   for (let i = 0; i < prefix.length; i++) {
//     if (slice[i] !== prefix[i]) {
//       return false;
//     }
//   }
//   return true;
// }
//
//
// /** */
// export function isHashType(hash: HoloHash, hashType: "Agent" | "Entry" | "Dna" | "Action" | "External") {
//   const slice = sliceHashType(hash);
//   const prefix = HASH_TYPE_PREFIX[hashType];
//   for (let i = 0; i < prefix.length; i++) {
//     if (slice[i] !== prefix[i]) {
//       return false;
//     }
//   }
//   return true;
// }

//
// /** */
// export function prettyState(state: StateChange): string {
//   if (StateChangeType.Create in state) {
//     return state.Create? "Create NEW" : "Create";
//   }
//   if (StateChangeType.Update in state) {
//     return state.Update? "Update NEW" : "Update";
//   }
//   if (StateChangeType.Delete in state) {
//     return state.Delete? "Delete NEW" : "Delete";
//   }
// }



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


/** */
export function timeSince(date: Date): string {
  var seconds = Math.floor((new Date().valueOf() - date.valueOf()) / 1000);
  var interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + " years";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}



/** */
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
    mentionedAgents = mentions.map((mentioned) => profilesZvm.perspective.getAgent(mentioned));
  }
  return mentionedAgents;
}


/** */
function tokenizeMentions(str: string): string[]  {
  if (typeof str !== 'string') {
    throw new TypeError('expected a string');
  }

  var re = /(?:[\w_＠@][＠@])|[＠@]([\w_]{1,15})(?=$|[^\w_])/g;
  var tokens = { input: str, output: str, matches: [] };
  var match;

  while ((match = re.exec(tokens.output))) {
    if (!match[1]) continue;
    var token = { name: match[1], match: match };
    tokens.matches.push(token);
  }
  return tokens.matches.map((m) => m.name);
};


/** TODO: remove once its implemented in we-applet */
export function weaveUrlToWal(url: string): WAL {
  const weaveLocation = weaveUrlToLocation(url);
  if (weaveLocation.type !== 'asset') {
    throw new Error('Passed URL is not a valid asset locator.');
  }
  return weaveLocation.wal;
}


//
// function emptyValidHash(prefix) {
//   let core = new Uint8Array(32).fill(0);
//   const checksum = dhtLocationFrom32(core);
//   return new Uint8Array([...prefix, ...core, ...Array.from(checksum)]);
// }
//
//
// export function emptyEntryHash() {
//   return emptyValidHash(HASH_TYPE_PREFIX["Entry"]);
// }
//
// export function emptyAgentPubKey() {
//   return emptyValidHash([0x84, 0x20, 0x24]);
// }
//
// export function emptyActionHash() {
//   return emptyValidHash([0x84, 0x29, 0x24]);
// }
//
// export function intoAgentPubKey(hash: AnyLinkableHash): AgentPubKey {
//   const meCore = sliceCore32(hash);
//   const meDht = sliceDhtLocation(hash)
//   return Uint8Array.from([...HASH_TYPE_PREFIX["Agent"], ...meCore, ...meDht]);
// }
//
// export function agent2eh(agent: AgentPubKey): EntryHash {
//   const meCore = sliceCore32(agent);
//   const meDht = sliceDhtLocation(agent)
//   return Uint8Array.from([...HASH_TYPE_PREFIX["Entry"], ...meCore, ...meDht]);
// }


export const MAIN_TOPIC_ID: EntryId = EntryId.empty(77); // 'M'
export const MAIN_SEMANTIC_TOPIC = "__main";

export class AnyIdMap<T> extends Map<HoloHashB64, T> {}

export function ppName(ppMat: ParticipationProtocolMat): string {
  return `${determineSubjectPrefix(ppMat.subject.typeName)} ${ppMat.subject_name}: ${ppMat.purpose}`;
}


/** We  */
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


/** We are determining the subject name and formatting it into a thread name */
export function determineSubjectName(subject: SubjectMat, threadsZvm: ThreadsZvm, filesDvm: FilesDvm, weServices: WeServicesEx): string {
  console.log("determineSubjectName()", subject);
  /** Threads Applet */
  if (subject.appletId.equals(THIS_APPLET_ID) || (weServices && subject.appletId.equals(weServices.appletId))) {
    switch (subject.typeName) {
      /** -- special types -- */
      case SpecialSubjectType.Applet:
        if (weServices) {
          let appletInfo = weServices.cache.appletInfos.get(new EntryId(weServices.appletId));
          if (!appletInfo) {
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
        const ah = new ActionId(subject.address.b64);
        const thread = threadsZvm.perspective.threads.get(ah);
        if (!thread) {
          //thread = await threadsZvm.fetchPp(subject.address);
          return "{Unknown Thread}";
        }
        return thread.name;
      }
      break;
      case SpecialSubjectType.SubjectType:
        if (weServices) {
          //let appletInfo = await weServices.appletInfo(decodeHashFromBase64(weServices.appletId));
          let appletInfo = weServices.cache.appletInfos[weServices.appletId];
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
        const ah = new ActionId(subject.address.b64);
        const beadInfo = threadsZvm.perspective.getBeadInfo(ah);
        if (beadInfo) {
          const typed = threadsZvm.perspective.getBead(ah);
          return determineBeadName(beadInfo.beadType, typed, filesDvm, weServices);
        } else {
          return `{Unknown Post}`;
        }
      }
      break;
      /** -- Vines types -- */
      case SpecialSubjectType.SemanticTopic:
        let semTopicTitle = threadsZvm.perspective.semanticTopics.get(new EntryId(subject.address.b64));
        if (!semTopicTitle) {
          //semTopic = (await threadsZvm.zomeProxy.fetchTopic(decodeHashFromBase64(subject.address))).title;
          return "{Unknown Topic}";
        }
        return semTopicTitle;
        break;
      case SpecialSubjectType.TextBead:
      case SpecialSubjectType.EntryBead:
      case SpecialSubjectType.AnyBead:
      case SpecialSubjectType.EncryptedBead:
        const ah = new ActionId(subject.address.b64);
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
      let appletInfo = weServices.cache.appletInfos.get(new EntryId(weServices.appletId));
      if (!appletInfo) {
        return "{Unknown Applet Asset}";
      }
      //const hrl: Hrl = [decodeHashFromBase64(subject.dnaHash), decodeHashFromBase64(subject.hash)];
      /** FIXME */
      if (subject.address.hashType == HoloHashType.Dna) {
        const dnaId = new DnaId(subject.address.b64);
        const maybeInfo = weServices.cache.assetInfos.get(dnaId);
        return `/${appletInfo.appletName}/${maybeInfo.assetInfo.name}`;
      } else {
        return `/${appletInfo.appletName}/{${subject.typeName}}`;
      }
    } else {
      return `{Unknown Applet Asset}`;
    }
  }
}


/** */
export function determineBeadName(beadType: BeadType, typedBead: TypedBeadMat, filesDvm: FilesDvm, weServices: WeServicesEx, charCount: number = 60): string {
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


/** Modified from https://stackoverflow.com/questions/8572826/generic-deep-diff-between-two-objects */
export var deepDiffMapper = function () {
  return {
    VALUE_CREATED: 'created',
    VALUE_UPDATED: 'updated',
    VALUE_DELETED: 'deleted',
    VALUE_UNCHANGED: 'unchanged',
    map: function(obj1, obj2) {
      if (this.isFunction(obj1) || this.isFunction(obj2)) {
        throw 'Invalid argument. Function given, object expected.';
      }
      if (this.isValue(obj1) || this.isValue(obj2)) {
        const diff = this.compareValues(obj1, obj2);
        if (diff == this.VALUE_UNCHANGED) return;
        return {
          type: diff,
          data: obj1 === undefined ? obj2 : obj1
        };
      }

      var diff = {};
      for (var key in obj1) {
        if (this.isFunction(obj1[key])) {
          continue;
        }

        var value2 = undefined;
        if (obj2[key] !== undefined) {
          value2 = obj2[key];
        }

        diff[key] = this.map(obj1[key], value2);
      }
      for (var key in obj2) {
        if (this.isFunction(obj2[key]) || diff[key] !== undefined) {
          continue;
        }

        diff[key] = this.map(undefined, obj2[key]);
      }

      return diff;

    },
    compareValues: function (value1, value2) {
      if (value1 === value2) {
        return this.VALUE_UNCHANGED;
      }
      if (this.isDate(value1) && this.isDate(value2) && value1.getTime() === value2.getTime()) {
        return this.VALUE_UNCHANGED;
      }
      if (value1 === undefined) {
        return this.VALUE_CREATED;
      }
      if (value2 === undefined) {
        return this.VALUE_DELETED;
      }
      return this.VALUE_UPDATED;
    },
    isFunction: function (x) {
      return Object.prototype.toString.call(x) === '[object Function]';
    },
    isArray: function (x) {
      return Object.prototype.toString.call(x) === '[object Array]';
    },
    isDate: function (x) {
      return Object.prototype.toString.call(x) === '[object Date]';
    },
    isObject: function (x) {
      return Object.prototype.toString.call(x) === '[object Object]';
    },
    isValue: function (x) {
      return !this.isObject(x) && !this.isArray(x);
    }
  }
}();
