import {
  AnyBead, BaseBeadKind, Bead,
  EncryptedBead,
  EntryBead,
  ParticipationProtocol, Subject,
  TextBead,
  ThreadsEntryType
} from "../bindings/threads.types";
import {WAL} from "@lightningrodlabs/we-applet";
import {ActionId, AgentId, DnaId, EntryId, getIndexByVariant, intoLinkableId, LinkableId} from "@ddd-qc/lit-happ";
import {ActionHashB64, AgentPubKeyB64, EntryHashB64, Timestamp} from "@holochain/client";
import {SpecialSubjectType} from "../events";
import {decode, encode, ExtensionCodec} from "@msgpack/msgpack";

/** -- Should be defined in @holochain/client */
//export const HOLOCHAIN_EPOCH = 1640995200000000;

export type TypedBaseBead = EntryBead | AnyBead | TextBead;
export type TypedBead = TypedBaseBead | EncryptedBead;

export type TypedContent = string | WAL | EntryId;

export type BaseBeadType = ThreadsEntryType.TextBead | ThreadsEntryType.EntryBead | ThreadsEntryType.AnyBead
export type BeadType = BaseBeadType | ThreadsEntryType.EncryptedBead;

export interface EncryptedBeadContent {encBead: EncryptedBead, otherAgent: AgentId}




/**  */
export enum NotifiableEvent {
  NewBead = 'NewBead',
  Mention = 'Mention',
  Reply = 'Reply',
  Fork = 'Fork',
  NewDmThread = 'NewDmThread',
}

/**  */
export interface ThreadsNotificationTip {
  event: NotifiableEvent,
  author: AgentId,
  timestamp: Timestamp,
  content: ActionId,
  /**  */
  link_ah: ActionId,
  pp_ah: ActionId,
  data: NotificationTipBeadData | NotificationTipPpData,
}


export interface ThreadsNotification {
  //eventIndex: number,
  event: NotifiableEvent,
  createLinkAh: ActionId,
  author: AgentId,
  timestamp: Timestamp,
  content: ActionId, // ppAh or beadAh depending on event
}


/** */
export interface BeadInfo {
  creationTime: Timestamp,
  author: AgentId,
  beadType: BeadType,
  bead: BeadMat,
  //name: string,
}

export interface BeadLinkMaterialized {
  creationTime: Timestamp,
  beadAh: ActionId,
  beadType: BeadType,
}



export type NotificationTipPpData = {
  pp: ParticipationProtocol,
  creationTime: Timestamp,
};

export type NotificationTipBeadData = {
  typed: TypedBead,
  beadType: BeadType,
  creationTime: Timestamp,
};




/** -- PpMat -- */

/**  */
export interface ParticipationProtocolMat {
  purpose: string,
  rules: string,
  subject: SubjectMat,
  subject_name: string,
}
export function materializeParticipationProtocol(pp: ParticipationProtocol): ParticipationProtocolMat {
  return {
    purpose: pp.purpose,
    rules: pp.rules,
    subject: materializeSubject(pp.subject),
    subject_name: pp.subject_name,
  } as ParticipationProtocolMat;
}
export function dematerializeParticipationProtocol(pp: ParticipationProtocolMat): ParticipationProtocol {
  return {
    purpose: pp.purpose,
    rules: pp.rules,
    subject: dematerializeSubject(pp.subject),
    subject_name: pp.subject_name,
  } as ParticipationProtocol;
}


/** -- Subject -- */

export interface SubjectMat {
  address: LinkableId,
  typeName: SpecialSubjectType,
  dnaHash: DnaId,
  appletId: EntryId,
}
export function materializeSubject(subject: Subject): SubjectMat {
  const index = getIndexByVariant(SpecialSubjectType, subject.typeName); // Make sure typeName is valid
  return {
    address: intoLinkableId(subject.address),
    typeName: subject.typeName as SpecialSubjectType,
    dnaHash: new DnaId(subject.dnaHash),
    appletId: new EntryId(subject.appletId),
  }
}
export function dematerializeSubject(subject: SubjectMat): Subject {
  return {
    address: subject.address.hash,
    typeName: subject.typeName,
    dnaHash: subject.dnaHash.hash,
    appletId: subject.appletId.b64,
  }
}


/** -- Bead -- */

export interface BeadMat {
  ppAh: ActionId,
  prevBeadAh: ActionId,
}
export function materializeBead(bead: Bead): BeadMat {
  return {
    ppAh: new ActionId(bead.ppAh),
    prevBeadAh: new ActionId(bead.prevBeadAh),
  }
}
export function dematerializeBead(bead: BeadMat): Bead {
  return {
    ppAh: bead.ppAh.hash,
    prevBeadAh: bead.prevBeadAh.hash,
  }
}


/** -- EntryBead -- */

export interface EntryBeadMat {
  bead: BeadMat,
  sourceEh: EntryId,
  sourceType: string,
  sourceRole: string,
  sourceZome: string,
}
export function materializeEntryBead(bead: EntryBead): EntryBeadMat {
  return {
    bead: materializeBead(bead.bead),
    sourceEh: new EntryId(bead.sourceEh),
    sourceType: bead.sourceType,
    sourceRole: bead.sourceRole,
    sourceZome: bead.sourceZome,
  }
}
export function dematerializeEntryBead(bead: EntryBeadMat): EntryBead {
  return {
    bead: dematerializeBead(bead.bead),
    sourceEh: bead.sourceEh.hash,
    sourceType: bead.sourceType,
    sourceRole: bead.sourceRole,
    sourceZome: bead.sourceZome,
  }
}


/** -- TextBead -- */

export interface TextBeadMat {
  bead: BeadMat,
  value: string,
}
export function materializeTextBead(bead: TextBead): TextBeadMat {
  return {
    bead: materializeBead(bead.bead),
    value: bead.value,
  }
}
export function dematerializeTextBead(bead: TextBeadMat): TextBead {
  return {
    bead: dematerializeBead(bead.bead),
    value: bead.value,
  }
}


/** -- AnyBead -- */

export interface AnyBeadMat {
  bead: BeadMat,
  value: string,
  typeInfo: string,
}
export function materializeAnyBead(bead: AnyBead): AnyBeadMat {
  return {
    bead: materializeBead(bead.bead),
    value: bead.value,
    typeInfo: bead.typeInfo,
  }
}
export function dematerializeAnyBead(bead: AnyBeadMat): AnyBead {
  return {
    bead: dematerializeBead(bead.bead),
    value: bead.value,
    typeInfo: bead.typeInfo,
  }
}


/** -- TypedBeadMat -- */

export type TypedBaseBeadMat = EntryBeadMat | AnyBeadMat | TextBeadMat;
export type TypedBeadMat = TypedBaseBeadMat | EncryptedBead;


// /** */
// export function determineBeadType(typedBead: TypedBeadMat | TypedBead): BeadType {
//   if ("sourceEh" in typedBead) {
//     return ThreadsEntryType.EntryBead;
//   }
//   if ("typeInfo" in typedBead) {
//     return ThreadsEntryType.AnyBead;
//   }
//   return ThreadsEntryType.TextBead;
// }


/** */
export function base2typed(base: BaseBeadKind): [TypedBaseBead, BaseBeadType] {
  if ("AnyBead" in base) return [base.AnyBead, ThreadsEntryType.AnyBead];
  if ("EntryBead" in base) return [base.EntryBead, ThreadsEntryType.EntryBead];
  if ("TextBead" in base) return [base.TextBead, ThreadsEntryType.TextBead];
  throw Error("Unknown BaseBeadKind");
}


/** */
export function bead2base(typed: TypedBaseBead, beadType: BaseBeadType): BaseBeadKind {
  switch(beadType) {
    case ThreadsEntryType.TextBead: return {TextBead: typed as TextBead}; break;
    case ThreadsEntryType.AnyBead: return {AnyBead: typed as AnyBead}; break;
    case ThreadsEntryType.EntryBead: return {EntryBead: typed as EntryBead}; break;
    default: throw Error("Unknown bead type: " + beadType); break;
  }
}


/** */
export function materializeTypedBead(typed: TypedBead, beadType: BeadType): TypedBeadMat {
  let typedMat: TypedBeadMat;
  switch(beadType) {
    case ThreadsEntryType.TextBead: typedMat = materializeTextBead(typed as TextBead); break;
    case ThreadsEntryType.AnyBead: typedMat = materializeAnyBead(typed as AnyBead); break;
    case ThreadsEntryType.EntryBead: typedMat = materializeEntryBead(typed as EntryBead); break;
    case ThreadsEntryType.EncryptedBead: typedMat = typed as EncryptedBead; break;
    default: throw Error("Unknown bead type: " + beadType); break;
  }
  return typedMat;
}
/* */
export function dematerializeTypedBead(typedMat: TypedBeadMat, beadType: BeadType): TypedBead {
  let typed: TypedBead;
  switch(beadType) {
    case ThreadsEntryType.TextBead: typed = dematerializeTextBead(typedMat as TextBeadMat); break;
    case ThreadsEntryType.AnyBead: typed = dematerializeAnyBead(typedMat as AnyBeadMat); break;
    case ThreadsEntryType.EntryBead: typed = dematerializeEntryBead(typedMat as EntryBeadMat); break;
    case ThreadsEntryType.EncryptedBead: typed = typedMat as EncryptedBead; break;
    default: throw Error("Unknown bead type: " + beadType); break;
  }
  return typed;
}



/** -- holochainIdExtensionCodec -- */

export const holochainIdExtensionCodec = new ExtensionCodec();

const AGENTID_EXT_TYPE = 0 // Any in 0-127
holochainIdExtensionCodec.register({
  type: AGENTID_EXT_TYPE,
  encode: (object: unknown): Uint8Array | null => {
    if (object instanceof AgentId) {
      return encode(object.b64);
    } else {
      return null;
    }
  },
  decode: (data: Uint8Array) => {
    const b64 = decode(data) as AgentPubKeyB64;
    return new AgentId(b64);
  },
});


const ENTRYID_EXT_TYPE = 1 // Any in 0-127
holochainIdExtensionCodec.register({
  type: ENTRYID_EXT_TYPE,
  encode: (object: unknown): Uint8Array | null => {
    if (object instanceof EntryId) {
      return encode(object.b64);
    } else {
      return null;
    }
  },
  decode: (data: Uint8Array) => {
    const b64 = decode(data) as EntryHashB64;
    return new EntryId(b64);
  },
});


const ACTIONID_EXT_TYPE = 2 // Any in 0-127
holochainIdExtensionCodec.register({
  type: ACTIONID_EXT_TYPE,
  encode: (object: unknown): Uint8Array | null => {
    if (object instanceof ActionId) {
      return encode(object.b64);
    } else {
      return null;
    }
  },
  decode: (data: Uint8Array) => {
    const b64 = decode(data) as ActionHashB64;
    return new ActionId(b64);
  },
});
