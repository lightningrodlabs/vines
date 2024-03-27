import {ActionHashB64, decodeHashFromBase64, dhtLocationFrom32} from "@holochain/client";
import {
  AnyBeadMat,
  AnyLinkableHashB64,
  BeadType, EntryBeadMat, materializeTypedBead,
  SubjectMat, TextBeadMat,
  TypedBeadMat
} from "./viewModels/threads.perspective";
import {FilesDvm, FileType} from "@ddd-qc/files";
import {Hrl, WAL, weaveUrlToLocation} from "@lightningrodlabs/we-applet";
import {ThreadsZvm} from "./viewModels/threads.zvm";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {PP_TYPE_NAME, SUBJECT_TYPE_TYPE_NAME, THIS_APPLET_ID} from "./contexts";
import {
  SEMANTIC_TOPIC_TYPE_NAME,
  ThreadsEntryType
} from "./bindings/threads.types";


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
export interface CommentRequest {
  maybeCommentThread: ActionHashB64 | null,
  subjectHash: AnyLinkableHashB64,
  subjectType: string,
  subjectName: string,
  viewType: string,
}


/** */
export function parseMentions(str: string): string[]  {
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



function emptyValidHash(prefix) {
  let core = new Uint8Array(32).fill(0);
  const checksum = dhtLocationFrom32(core);
  return new Uint8Array([...prefix, ...core, ...Array.from(checksum)]);
}


export function emptyAgentPubKey() {
  return emptyValidHash([0x84, 0x20, 0x24]);
}



/** We  */
export function determineSubjectPrefix(subjectTypeName: string) {
    switch (subjectTypeName) {
      /** -- special types -- */
      case SEMANTIC_TOPIC_TYPE_NAME: return `#`; break;
      case PP_TYPE_NAME: return `🧵`; break;
      case SUBJECT_TYPE_TYPE_NAME: return `🧶`; break;
      /** -- bead types -- */
      case ThreadsEntryType.TextBead: return "💬"; break;
      case ThreadsEntryType.EntryBead: return "📎"; break;
      case ThreadsEntryType.AnyBead:return "🔗"; break;
      /** other */
      default: return ""; break;
    }
}


/** We are determining the subject name and formatting it into a thread name */
export async function determineSubjectName(subject: SubjectMat, threadsZvm: ThreadsZvm, filesDvm: FilesDvm, weServices: WeServicesEx) {
  //console.log("determineSubjectName()", subject);
  /** Threads Applet */
  if (subject.appletId == THIS_APPLET_ID || (weServices && subject.appletId == weServices.appletId)) {
    switch (subject.typeName) {
      /** -- special types -- */
      case SEMANTIC_TOPIC_TYPE_NAME:
        let semTopic = threadsZvm.perspective.allSemanticTopics[subject.hash];
        if (!semTopic) {
          await threadsZvm.probeSemanticTopics();
          semTopic = threadsZvm.perspective.allSemanticTopics[subject.hash];
        }
        return semTopic[0];
        break;
      case PP_TYPE_NAME:
        let thread = threadsZvm.perspective.threads[subject.hash];
        if (!thread) {
          thread = await threadsZvm.fetchPp(subject.hash);
        }
        return thread.name;
        break;
      case SUBJECT_TYPE_TYPE_NAME:
        if (weServices) {
          let appletInfo = weServices.getAppletInfo(weServices.appletId);
          if (!appletInfo) {
            appletInfo = await weServices.appletInfo(decodeHashFromBase64(weServices.appletId));
          }
          return `/${appletInfo.appletName}/{${subject.typeName}}`;
        } else {
          return `{${subject.typeName}}`;
        }
        break;
      /** -- bead types -- */
      case ThreadsEntryType.TextBead:
      case ThreadsEntryType.EntryBead:
      case ThreadsEntryType.AnyBead:
        let beadPair = threadsZvm.perspective.beads[subject.hash];
        let typedMat;
        if (!beadPair) {
          const typed = await threadsZvm.fetchTypedBead(decodeHashFromBase64(subject.hash), subject.typeName, false);
          typedMat = materializeTypedBead(typed, subject.typeName);
        } else {
          typedMat = beadPair[1];
        }
        const beadName = determineBeadName(subject.typeName, typedMat, filesDvm, weServices);
        //console.log("determineSubjectName() beadName", beadName);
        return beadName;
        break;
      /** unknown */
      default:
        return `{unknown '${subject.typeName}'}`;
        break;
    }
  } else {
    /** Unknown Applet */
    if (weServices) {
      const appletInfo = weServices.getAppletInfo(subject.appletId);
      const hrl: Hrl = [decodeHashFromBase64(subject.dnaHash), decodeHashFromBase64(subject.hash)];
      const maybeInfo = weServices.getAssetInfo({hrl});
      if (maybeInfo) {
        return `/${appletInfo.appletName}/${maybeInfo.assetInfo.name}`;
      } else {
        return `/${appletInfo.appletName}/{${subject.typeName}}`;
      }
    } else {
      return `{UnknownApplet}`;
    }
  }
}


/** */
export function determineBeadName(beadType: BeadType, typedBead: TypedBeadMat, filesDvm: FilesDvm, weServices: WeServicesEx): string {
  //console.log("determineBeadName()", typedBead);
  switch (beadType) {
    /** TextBead: text content */
    case ThreadsEntryType.TextBead:
      return truncate((typedBead as TextBeadMat).value, 60, true);
    break;
    /** EntryBead: Filename */
    case ThreadsEntryType.EntryBead:
      if (!filesDvm) {
        return "<unknown file>";
      }
      const fileBead = typedBead as EntryBeadMat;
      const tuple = filesDvm.deliveryZvm.perspective.publicParcels[fileBead.sourceEh];
      if (!tuple) {
        return "<file>";
      }
      return tuple[0].name;
    break;
    /** AnyBead: assetInfo.name */
    case ThreadsEntryType.AnyBead:
      if (!weServices) {
        return "<unknown asset>";
      }
      const hrlBead = typedBead as AnyBeadMat;
      const wal = weaveUrlToWal(hrlBead.value);
      const attLocInfo = weServices.getAssetInfo(wal);
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
