import {ActionHashB64, AgentPubKeyB64, AnyDhtHashB64, EntryHashB64, HoloHashB64, Timestamp} from "@holochain/client";
import {
  ActionId,
  ActionIdMap,
  AgentId,
  AgentIdMap,
  AnyId,
  DnaId,
  EntryId,
  EntryIdMap,
  intoAnyId,
  LinkableId,
  MyDictionary,
  ValidatedBy,
} from "@ddd-qc/lit-happ";
import {Thread} from "./thread";
import {
  DM_SUBJECT_TYPE_NAME,
  NotifySetting,
  ParticipationProtocol,
  Subject,
  ThreadLastProbeLog,
  ThreadsEntryType,
} from "../bindings/threads.types";
import {AnyIdMap} from "../utils";
import {
  BeadInfo,
  BeadLinkMaterialized,
  BeadType,
  dematerializePp,
  materializePp,
  NotifiableEvent,
  PpMat,
  TextBeadMat,
  ThreadsNotification,
  TypedBaseBeadMat,
  TypedBeadMat
} from "./threads.materialize";
import {AuthorshipZvm} from "./authorship.zvm";
import {SearchParameters} from "../search";
import {Cell} from "@ddd-qc/cell-proxy";
import {prettyTimestamp} from "@ddd-qc/files";
import {SpecialSubjectType} from "../events";


/** Snapshot does not store notifications and new/unread state */
/** TODO: store private DMs */
export type ThreadsSnapshot = {
  /** Store of all Subjects: hash -> Subject */
  subjects: [HoloHashB64, Subject][],
  /** Store of all SemTopic: ah -> TopicTitle */
  semanticTopics: [ActionHashB64, string, AgentPubKeyB64][],
  /** Keep only marked items */
  hiddens: HoloHashB64[],
  favorites: ActionHashB64[],
  /** (ppAh, ppMat, title, ts, author) */
  pps: [ActionHashB64, PpMat, string, Timestamp, AgentPubKeyB64][],
  /** (ppAh, agents) */
  bans: [ActionHashB64, AgentPubKeyB64[]][],
  /** (ppAh, beads) */
  flags: [ActionHashB64, ActionHashB64[]][],
  /** beadAh -> [BeadInfoMat, TypedBeadMat] */
  beads: [ActionHashB64, BeadInfo, TypedBeadMat][],
  /** bead_ah -> [agent, emojis[]][] */
  emojiReactions: [ActionHashB64, [AgentPubKeyB64, string[]][]][],

  // TODO: remove duplicates
  /** AppletId -> (PathEntryHash -> subjectType) */
  appletSubjectTypes: [EntryHashB64, [EntryHashB64, string][]][],
  /** */
  appletIds: EntryHashB64[],
}


function print(self: ThreadsSnapshot): void {
  console.log("ThreadSnapshot:");
  console.log("  -       appletIds:", self.appletIds.length);
  console.log("  -        subjects:", self.subjects.length);
  console.log("  -  semanticTopics:", self.semanticTopics.length);
  console.log("  -         hiddens:", self.hiddens.length);
  console.log("  -       favorites:", self.favorites.length);
  console.log("  -             pps:", self.pps.length);
  console.log("  -            bans:", self.bans.flat().length);
  console.log("  -           flags:", self.flags.flat().length);
  console.log("  -           beads:", self.beads.length);
  console.log("  -  emojiReactions:", self.emojiReactions.length);
  console.log("  - appletSubjTypes:", self.appletSubjectTypes.length);
}

export type ThreadsPerspectiveComparable = {
  appletIds: number,
  subjects: number,
  subjectToLatest: number,
  semanticTopics: number,
  bannedSemanticTopics: number,
  hiddens: number,
  favorites: number,
  threads: number,
  bans: number,
  flags: number,
  threadTitles: string[],
  beads: number,
  emojiReactions: number,
  appletSubjectTypes: number,
  dmAgents: number,
  decBeads: number,
  notifSettings: number,
  inbox: number,
  unreads: number,
  globalProbeLogTs: number,
  validationMap: string,
};


/** */
export class ThreadsPerspective {

  /** Hashes already reported as missing, so the warnings below print once each
   *  rather than on every render that reads them. */
  protected static _warnedUnknownProbeLog: Set<string> = new Set();
  protected static _warnedMissingBeads: Set<string> = new Set();


  /** Entries that have been found with New = true */
  isNewStorageMap: Set<AnyDhtHashB64> = new Set();

  /** Entries that have been found in the source-chain or DHT */
  validationMap: Map<AnyDhtHashB64, ValidatedBy> = new Map();

  /** */
  appletIds: EntryId[] = [];
  /** Store of all Subjects: hash -> Subject */
  subjects: AnyIdMap<Subject> = new AnyIdMap();
  subjectToLatest: AnyIdMap<AnyId> = new AnyIdMap();
  subjectToOrig: AnyIdMap<AnyId> = new AnyIdMap();
  /** Store of all SemTopic: ah -> (TopicTitle, author) */
  semanticTopics: ActionIdMap<[string, AgentId]> = new ActionIdMap();
  bannedSemanticTopics: ActionId[] = [];
  /** Any hash -> isHidden */
  hiddens: MyDictionary<boolean> = {};
  /** */
  favorites: ActionId[] = [];
  /** ppAh -> Thread */
  threads: ActionIdMap<Thread> = new ActionIdMap();
  /** ppAh */
  deletedThreads: Set<ActionHashB64> = new Set();
  /** beadAh -> [BeadInfo, TypedBead] */
  beads: ActionIdMap<[BeadInfo, TypedBeadMat]> = new ActionIdMap();
  /** ppAh -> agents */
  bans: ActionIdMap<AgentId[]> = new ActionIdMap();
  /** ppAh -> linkAh, beadAh)[] */
  flags: ActionIdMap<[ActionId, ActionId][]> = new ActionIdMap();
  /** beadAh -> (agent -> emoji[]) */
  emojiReactions: ActionIdMap<AgentIdMap<string[]>> = new ActionIdMap();
  /** AppletId -> PathEntryHash -> subjectType */
  appletSubjectTypes: EntryIdMap<EntryIdMap<string>> = new EntryIdMap();

  /** -- DM stuff  -- */
  /** agentId -> ppAh */
  dmAgents: AgentIdMap<ActionId> = new AgentIdMap();
  /** encBeadAh -> [BeadInfo, TypedBead] */
  decBeads: ActionIdMap<[BeadInfo, TypedBaseBeadMat]> = new ActionIdMap();


  /** -- New / unread -- */
  globalProbeLogTs: Timestamp = 0;

  /** -- Notification Inbox -- */
  /** linkAh -> [agent, beadAh] */
  //mentions: MyDictionary<[AgentPubKeyB64, ActionHashB64]>,
  /** linkAh -> (ppAh, notif) */
  inbox: ActionIdMap<[ActionId, ThreadsNotification]> = new ActionIdMap();
  /** ppAh -> (author, linkAh)[] */
  inboxByThread: ActionIdMap<[AgentId, ActionId][]> = new ActionIdMap();
  /* ppAh -> (agent -> value) */
  notifSettings: ActionIdMap<AgentIdMap<NotifySetting>> = new ActionIdMap();


  /** -- Extra -- */

  /** Store threads for queried/probed subjects: SubjectHash -> ProtocolAh */
  threadsPerSubject: AnyIdMap<ActionId[]> = new AnyIdMap();
  /** PathEntryHash -> [DnaId, SubjectHash][] */
  subjectsPerType: EntryIdMap<[DnaId, AnyId][]> = new EntryIdMap();
  ///* name string -> ppAh */
  //private _threadsByName: MyDictionary<ActionId> = {};

  /** New = Found when doing probeAllLatest(), i.e. created since last GlobalProbeLog */
  /** A subject is new if a new thread has been found for it and no older threads for this subject has been found */
  /* ppAh -> SubjectHash */
  newThreads: ActionIdMap<AnyId> = new ActionIdMap();
  /** Unread messages by thread. Unread thread = Has "new" beads */
  /** ppAh -> (subjectHash, (beadAh, CreationTime)[]) */
  unreads: ActionIdMap<[AnyId, [ActionId, Timestamp][]]> = new ActionIdMap();


  /** Things to compare when deciding to notify subscribers */
  comparable(): Object {
    const res: ThreadsPerspectiveComparable = {
      appletIds: this.appletIds.length,
      subjects: this.subjects.size,
      subjectToLatest: this.subjectToLatest.size,
      semanticTopics: this.semanticTopics.size,
      bannedSemanticTopics: this.bannedSemanticTopics.length,
      hiddens: Object.keys(this.hiddens).length,
      favorites: this.favorites.length,
      threads: this.threads.size - this.deletedThreads.size,
      bans: this.bans.size,
      flags: this.flags.size,
      threadTitles: Array.from(this.threads.values()).map((thread) => thread.title),
      beads: this.beads.size,
      emojiReactions: this.emojiReactions.size,
      appletSubjectTypes: this.appletSubjectTypes.size,
      dmAgents: this.dmAgents.size,
      decBeads: this.decBeads.size,
      notifSettings: this.notifSettings.size,
      inbox: this.inbox.size,
      unreads: this.unreads.size,
      globalProbeLogTs: this.globalProbeLogTs,
      validationMap: JSON.stringify(Array.from(this.validationMap.entries())),
    };
    return res;
  }


  /** -- Getters -- */

  getNotifSetting(ppAh: ActionId, agent: AgentId): NotifySetting {
    const settings = this.notifSettings.get(ppAh);
    console.log("getNotifSetting()", settings);
    if (!settings) {
      /** Return default */
      return NotifySetting.MentionsOnly;
    }
    const maybeAgentSetting = settings.get(agent);
    if (!maybeAgentSetting) {
      /** Return default */
      return NotifySetting.MentionsOnly;
    }
    return maybeAgentSetting;
  }


  getParticipationProtocol(ah: ActionId): ParticipationProtocol | undefined {
    const thread = this.threads.get(ah);
    if (!thread) {
      return undefined;
    }
    return thread.pp;
  }

  getAllPps(): ActionId[] { return Array.from(this.threads.keys()) }

  getAllSubjects(): [HoloHashB64, Subject][] { return Array.from(this.subjects.entries()) }

  getAllNotifications(): [ActionId, [ActionId, ThreadsNotification]][] {return Array.from(this.inbox.entries())}


  getSubjectType(appletId: EntryId, pathHash: EntryId): string | undefined {
    const typesForDna = this.appletSubjectTypes.get(appletId);
    if (!typesForDna) {
      return undefined;
    }
    return typesForDna.get(pathHash);
  }

  /** */
  isNew(hash: AnyDhtHashB64): boolean {
    //console.debug("New: is?", hash, this.isNewStorageMap.has(hash));
    return this.isNewStorageMap.has(hash);
  }

  /** */
  isPersistent(hash: AnyDhtHashB64): boolean {
    //console.debug("Persistent: is?", hash, this.persistentStorageMap.has(hash));
    const validation = this.validationMap.get(hash);
    return !!validation && validation !== ValidatedBy.None;
  }

  /** */
  getValidation(hash: AnyDhtHashB64): ValidatedBy {
    const validation = this.validationMap.get(hash);
    if (!validation) {
      return ValidatedBy.None;
    }
    return validation;
  }

  getBeadInfo(beadAh: ActionId): BeadInfo | undefined {
    const maybeBead = this.beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    return maybeBead[0];
  }

  getBead(beadAh: ActionId): TypedBeadMat | undefined {
    const maybeBead = this.beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    return maybeBead[1];
  }

  getBaseBeadInfo(beadAh: ActionId): BeadInfo | null {
    const maybeBead = this.beads.get(beadAh);
    if (!maybeBead) {
      return null;
    }
    if (maybeBead[0].beadType != ThreadsEntryType.EncryptedBead) {
      return maybeBead[0];
    }
    const maybeDecBead = this.decBeads.get(beadAh);
    if (!maybeDecBead) {
      return null;
    }
    return maybeDecBead[0];
  }


  /** */
  getBaseBead(beadAh: ActionId): TypedBaseBeadMat | undefined {
    const maybeBead = this.beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    if (maybeBead[0].beadType != ThreadsEntryType.EncryptedBead) {
      return maybeBead[1] as TypedBaseBeadMat;
    }
    //console.log("getBaseBead()", beadAh);
    const maybeDecBead = this.decBeads.get(beadAh);
    if (!maybeDecBead) {
      return undefined;
    }
    return maybeDecBead[1];
  }


  /** */
  getMostRecentBeadsOnThread(ppAh: ActionId): [BeadInfo, TypedBaseBeadMat][] {
    const thread = this.threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getLast(10).map((bl) => bl.beadAh);
    let infos: [BeadInfo, TypedBaseBeadMat][] = [];
    for (const ah of beadAhs) {
      const beadInfo = this.getBaseBeadInfo(ah);
      if (beadInfo) {
        const typedBased = this.getBaseBead(ah)!;
        infos.push([beadInfo, typedBased])
      }
    }
    //TODO: tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  getAllBeadsOnThread(ppAh: ActionId): [ActionId, BeadInfo, TypedBaseBeadMat][] {
    const thread = this.threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getAll().map((bl) => bl.beadAh);
    let infos: [ActionId, BeadInfo, TypedBaseBeadMat][] = [];
    for (const ah of beadAhs) {
      if (this.beads.get(ah)) {
        infos.push([ah, this.getBaseBeadInfo(ah)!, this.getBaseBead(ah)!]);
      }
    }
    //TODO: tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  hasReachedBeginning(ppAh: ActionId): boolean {
    let thread = this.threads.get(ppAh);
    return !!thread && thread.hasSearchedOldestBead;
  }


  /** */
  getAllNotificationsForPp(argPpAh: ActionId): [ActionId, ThreadsNotification][] {
    //console.debug("getAllNotificationsForPp()", argPpAh, this.inbox);
    let result: [ActionId, ThreadsNotification][] = [];
    for (const [linkAh, [ppAh, notif]] of this.inbox.entries()) {
      if (argPpAh.equals(ppAh)) {
        result.push([linkAh, notif]);
      }
    }
    return result;
  }


  /** */
  getEditThread(beadAh: ActionId): [ActionId, Thread] | undefined {
    let res: [ActionId, Thread] | undefined = undefined;
    this.threads.forEach((thread, ah, _map) => {
      if (thread.pp.subject.address == beadAh.b64 && thread.pp.purpose == "EDIT") {
        res = [ah, thread];
      }
    });
    return res;
  }

  getLatestEdit(beadAh: ActionId): string | undefined {
    let bead = this.getBead(beadAh) as TextBeadMat;
    if (!bead) return undefined;
    const pair = this.getEditThread(beadAh);
    if (!pair) {
      return bead.value;
    }
    const lastBeads = pair[1].getLast(1);
    if (lastBeads.length == 0) {
      /** Once per bead: also read per render. */
      if (!ThreadsPerspective._warnedMissingBeads.has(beadAh.b64)) {
        ThreadsPerspective._warnedMissingBeads.add(beadAh.b64);
        console.warn("Missing beads in EditThread", beadAh.short);
      }
      return bead.value;
    }
    const lastBead = lastBeads[0]!;
    bead = this.getBead(lastBead.beadAh) as TextBeadMat;
    return bead.value;
  }


  /** */
  getLatestThread(): [ActionId, Thread] | undefined {
    let res: [ActionId, Thread] | undefined = undefined;
    this.threads.forEach((thread, ah, _map) => {
      if (!res || thread.creationTime > res[1].creationTime) {
        res = [ah, thread];
      }
    });
    return res;
  }


  /** */
  hasBan(ppAh: ActionId, agent: AgentId): boolean {
    if (!ppAh || !agent) {
      return false;
    }
    const bans = this.bans.get(ppAh);
    if (bans) {
      for (const a of bans) {
        if (agent.equals(a)) {
          return true;
        }
      }
    }
    return false;
  }


  /** */
  hasFlag(ppAh: ActionId, beadAh: ActionId): boolean {
    const flags = this.flags.get(ppAh);
    if (flags) {
      for (const [_linkAh, curBeadAh] of flags) {
        if (beadAh.equals(curBeadAh)) {
          return true;
        }
      }
    }
    return false;
  }


  /** */
  hasEmojiReaction(beadAh: ActionId, agent: AgentId, emoji: string): boolean {
    const beadEmojis = this.emojiReactions.get(beadAh);
    if (!beadEmojis) {
      return false;
    }
    /** Look for agent */
    const agentEmojis = beadEmojis.get(agent);
    if (!agentEmojis) {
      return false;
    }
    /** Look for emoji */
    const maybeAlready = agentEmojis.find((e) => e == emoji);
    return !!maybeAlready && maybeAlready.length > 0;
  }


  /** -- Getters -- */

  /** Return curated linkAh & Notif array */
  filteredInbox(): [ActionId, ThreadsNotification][] {
    const res: Map<String, [ActionId, ThreadsNotification][]> = new Map();
    Array.from(this.inbox.entries())
      .map(([linkAh, [ppAh, notif]]) => {
        if (notif.event == NotifiableEvent.NewDmThread) {
          return;
        }
        const trip = "" + ppAh.b64 + notif.author.b64;
        const cur = res.get(trip);
        if (!cur) {
          res.set(trip, [[linkAh, notif]]);
          return;
        }
        if (cur && notif.event == NotifiableEvent.NewBead) {
          return;
        }
        cur.push([linkAh, notif]);

      });
    return Array.from(res.values()).flat();
  }

  /** */

  /** Recursively follow mapping and store all IDs in both directions */
  getAllSubjectVersions(subjectAnyId: AnyId): AnyId[] {
    let subjectId = subjectAnyId;
    let all: AnyId[] = [subjectAnyId];
    let next;
    do {
      next = this.subjectToLatest.get(subjectId.b64);
      if (next) {
        all.push(next);
        subjectId = next;
      }
    } while (next);
    subjectId = subjectAnyId;
    let prev;
    do {
      prev = this.subjectToOrig.get(subjectId.b64)
      if (prev) {
        all.push(prev);
        subjectId = prev;
      }
    } while (prev);
    return all;
  }

  /** Recursively follow mapping */
  getLatestSubject(origSubjectId: AnyId): AnyId {
    let subjectId = origSubjectId;
    let next;
    do {
      next = this.subjectToLatest.get(subjectId.b64);
      if (next) subjectId = next;
    } while (next);
    return subjectId;
  }

  /** Recursively follow mapping */
  getOrigSubject(latestSubId: AnyId): AnyId {
    let subjectId = latestSubId;
    let prev;
    do {
      prev = this.subjectToOrig.get(subjectId.b64)
      if (prev) subjectId = prev;
    } while (prev);
    return subjectId;
  }


  /** */
  getCommentThreadForSubject(subjectId: AnyId): ActionId | null {
    const ppAhs = this.threadsPerSubject.get(subjectId.b64);
    if (!ppAhs) {
      return null;
    }
    for (const ppAh of ppAhs) {
      const thread = this.threads.get(ppAh);
      if (thread && thread.pp.purpose == "comment") {
        return ppAh;
      }
    }
    return null;
  }


  /** */
  getSubjectThreads(startSubjectId: AnyId): ActionId[] {
    const subjectIds = this.getAllSubjectVersions(startSubjectId);
    //console.log("getSubjectThreads() subjectIds", subjectIds.length, startSubjectId.short);
    let all: ActionId[] = []
    for (const subjectId of subjectIds) {
      const pps = this.getSubjectVersionThreads(subjectId);
      console.log("getSubjectVersionThreads() delete", pps.length);
      all = all.concat(pps);
    }
    //console.log("getSubjectThreads() END", all.length);
    return all;
  }

  /** */
  getSubjectVersionThreads(subjectId: AnyId): ActionId[] {
    //console.log("getSubjectVersionThreads() delete known:", this.deletedThreads.size, this.deletedThreads);
    const maybe = this.threadsPerSubject.get(subjectId.b64);
    if (!maybe) return [];
    const filtered = maybe.filter((ppAh) => !this.deletedThreads.has(ppAh.b64));
    return filtered;
  }


  /** */
  getSubjects(typePathHash: EntryId): [DnaId, AnyId][] | undefined {
    return this.subjectsPerType.get(typePathHash);
  }


  /** unreadSubjects: subject has at least one unread thread */
  getUnreadSubjects(): AnyId[] {
    let unreadSubjects = Array.from(this.unreads.values()).map(([subjectId, _beads]) => subjectId);
    /** Dedup */
    return [...new Set(unreadSubjects)];
  }


  /** Returns SubjectHash -> OldestNewThreadTs, i.e. creationTime of Subject */
  getNewSubjects(): AnyIdMap<Timestamp> {
    /** newSubjects: Store subject's oldest 'new' thread time for each new thread */
    const oldestNewThreadBySubject: AnyIdMap<Timestamp> = new AnyIdMap();
    for (const [ppAh, subjectId] of this.newThreads.entries()) {
      const thread = this.threads.get(ppAh);
      if (!thread) {
        console.error("Thread not found");
        continue;
      }
      const oldest = oldestNewThreadBySubject.get(subjectId.b64);
      if (!oldest || thread.creationTime < oldest) {
        oldestNewThreadBySubject.set(subjectId.b64, thread.creationTime);
      }
    }
    //console.log("oldestThreadTimeBySubject", oldestThreadTimeBySubject);

    /* Figure out if subjects are new: no older "none-new" threads found for this subject */
    let newSubjects: AnyIdMap<Timestamp> = new AnyIdMap();
    for (const [origSubjectHash, oldestNewThreadTs] of oldestNewThreadBySubject.entries()) {
      const subjectHash = this.getOrigSubject(intoAnyId(origSubjectHash)).b64;
      const threads = this.threadsPerSubject.get(subjectHash)? this.threadsPerSubject.get(subjectHash)! : [];
      const pairs: [ActionId, Timestamp][] = threads.map((ppAh) => {
        const thread = this.threads.get(ppAh);
        if (!thread) {
          console.error("Thread not found");
          return [ppAh, 0];
        }
        return [ppAh, thread.creationTime];
      })
      //newSubjects[subjectHash] = pairs.map(([ppAh, _ts]) => ppAh);
      newSubjects.set(subjectHash, oldestNewThreadTs);
      for (const [_ppAh, ppCreationTime] of pairs) {
        if (ppCreationTime < oldestNewThreadTs) {
          newSubjects.delete(subjectHash);
          break;
        }
      }
    }
    return newSubjects;
  }


  /** Return matching beadAhs */
  searchTextBeads(parameters: SearchParameters): [ActionId, BeadInfo, string][] {
    console.log("searchTextBeads()", parameters);
    /** Must have at least one param */
    if (Object.keys(parameters).length == 1) {
      return [];
    }
    if (parameters.beforeTs && parameters.afterTs && parameters.afterTs < parameters.beforeTs) {
      throw new Error(`Invalid search parameters. Search time interval: [${parameters.afterTs}; ${parameters.beforeTs}]'.`);
    }

    /** Filter bead type */
    let matchingTextBeads: [ActionId, BeadInfo, string][] = Array.from(this.beads.entries())
      .filter(([_beadAh, beadPair]) => beadPair[0].beadType == ThreadsEntryType.TextBead)
      .map(([beadAh, beadPair]) => [beadAh, beadPair[0], (beadPair[1] as TextBeadMat).value.toLowerCase()]);
    let decMatchingTextBeads: [ActionId, BeadInfo, string][] = Array.from(this.decBeads.entries())
      .filter(([_beadAh, beadPair]) => beadPair[0].beadType == ThreadsEntryType.TextBead)
      .map(([beadAh, beadPair]) => [beadAh, beadPair[0], (beadPair[1] as TextBeadMat).value.toLowerCase()]);
    matchingTextBeads = matchingTextBeads.concat(decMatchingTextBeads);

    /** filter applet */
    if (parameters.appletByName) {
      // TODO
    }
    // /** filter thread */
    // // FIXME
    // if (parameters.threadByName) {
    //   /** Bail if thread does not exist */
    //   const ppAh = this.getPpByName(parameters.threadByName);
    //   if (!ppAh) {
    //     return [];
    //   }
    //   matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.bead.ppAh.equals(ppAh));
    // }

    /** filter author */
    if (parameters.author) {
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.author.equals(parameters.author!))
    }
    /** filter mention */
    if (parameters.mentionsAgentByName) {
      const mentionLC = `@${parameters.mentionsAgentByName}`.toLowerCase();
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, _beadInfo, textLC]) => textLC.includes(mentionLC))
    }
    /** filter beforeTs */
    if (parameters.beforeTs) {
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.creationTime <= parameters.beforeTs!);
    }
    /** filter afterTs */
    if (parameters.afterTs) {
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.creationTime >= parameters.afterTs!);
    }
    /** Filter by keywords OR */
    if (parameters.keywords) {
      const keywordsLC = parameters.keywords.map((word) => word.toLowerCase());
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, _beadPair, textLC]) => {
        for (const keywordLC of keywordsLC) {
          if (textLC.includes(keywordLC)) {
            //console.log("searchTextBeads() has", keywordLC, textLC);
            return true;
          }
        }
        return false;
      })
    }
    /** DONE */
    console.log("searchTextBeads() result", /*matchingTextBeads.length,*/ matchingTextBeads);
    return matchingTextBeads;
  }


  /** -- */

  /** -- Memento -- */

  /** TODO: deep copy */
  /** Optimized version of makePartialSnapshot */
  makeSnapshot(): ThreadsSnapshot {
    /** applet subject types */
    const appletSubjectTypes: [EntryHashB64, [EntryHashB64, string][]][] = [];
    for (const [appletEh, map] of this.appletSubjectTypes.entries()) {
      const types: [EntryHashB64, string][] = Array.from(map.entries()).map(([pathEh, type]) => [pathEh.b64, type]);
      appletSubjectTypes.push([appletEh.b64, types]);
    }
    /** emojis */
    const emojiReactions: [ActionHashB64, [AgentPubKeyB64, string[]][]][] = [];
    for (const [beadAh, map] of this.emojiReactions.entries()) {
      const agents: [AgentPubKeyB64, string[]][] = Array.from(map.entries()).map(([agent, emojis]) => [agent.b64, emojis]);
      emojiReactions.push([beadAh.b64, agents]);
    }

    /** PPs */
    /** Collapse subject address to the latest version */
    let pps: [ActionHashB64, PpMat, string, Timestamp, AgentPubKeyB64][] = Array.from(this.threads.entries())
      .filter(([_ppAh, thread]) => thread.pp.subject.typeName !== SpecialSubjectType.TextBead || thread.pp.purpose !== "EDIT") // Dont include TextBead edit threads
      .filter(([ppAh, _thread]) => !this.deletedThreads.has(ppAh.b64)) // Dont include Deleted threads
      .map(([ppAh, thread]) => {
      const latest = this.getLatestSubject(intoAnyId(thread.pp.subject.address));
      thread.pp.subject.address = latest.b64;
      return [ppAh.b64, materializePp(thread.pp), thread.title, thread.creationTime, thread.author.b64];
    });

    /** -- Done -- */
    const result: ThreadsSnapshot = {
      appletIds: this.appletIds.map((id) => id.b64),
      subjects: Array.from(this.subjects.entries()),
      semanticTopics: Array.from(this.semanticTopics.entries()).map(([topicHash, [title, author]]) => [topicHash.b64, title, author.b64]),
      hiddens: Object.entries(this.hiddens).filter(([_hash, isHidden]) => isHidden).map(([hash, _isHidden]) => hash),
      favorites: this.favorites.map((id) => id.b64),
      pps,
      bans: Array.from(this.bans.entries()).map(([ppAh, agents]) => [ppAh.b64, agents.map((a) => a.b64)]),
      flags: Array.from(this.flags.entries()).map(([ppAh, pairs]) => [ppAh.b64, pairs.map(([_lh, beadAh]) => beadAh.b64)]),
      beads: Array.from(this.beads.entries()).map(([beadAh, [beadInfo, typed]]) => [beadAh.b64, beadInfo, typed]),
      emojiReactions,
      appletSubjectTypes,
    };
    print(result);
    return result;
  }


  /** */
  makePartialSnapshot(selectedPps: Set<string>): ThreadsSnapshot {
    /** Filter out deleted, and edit threads */
    selectedPps = new Set(Array.from(selectedPps)
      .filter((ppAhB64) => {
        const thread = this.threads.get(new ActionId(ppAhB64));
        if (!thread) return true;
        return thread.pp.subject.typeName != SpecialSubjectType.TextBead || thread.pp.purpose !== "EDIT";
      })
      .filter((ppAhB64) => !this.deletedThreads.has(ppAhB64))
    );
    /** applet subject types */
    const appletSubjectTypes: [EntryHashB64, [EntryHashB64, string][]][] = [];
    for (const [appletEh, map] of this.appletSubjectTypes.entries()) {
      const types: [EntryHashB64, string][] = Array.from(map.entries()).map(([pathEh, type]) => [pathEh.b64, type]);
      appletSubjectTypes.push([appletEh.b64, types]);
    }
    /** PPs */
    /** Collapse subject address to the latest version */
    const selectedTopics: Set<string> = new Set();
    const pps: [ActionHashB64, PpMat, string, Timestamp, AgentPubKeyB64][] = Array.from(this.threads.entries())
      .filter(([ppAh, _thread]) => selectedPps.has(ppAh.b64))
      .map(([ppAh, thread]) => {
        if (thread.pp.subject.typeName == SpecialSubjectType.SemanticTopic) {
          selectedTopics.add(thread.pp.subject.address);
        }
        const latest = this.getLatestSubject(intoAnyId(thread.pp.subject.address));
        thread.pp.subject.address = latest.b64;
        return [ppAh.b64, materializePp(thread.pp), thread.title, thread.creationTime, thread.author.b64];
      });

    /** Collapse TextBead data to latest version */
    let beadsMap = new ActionIdMap<[BeadInfo, TypedBeadMat]>();
    Array.from(this.beads.entries())
      .filter(([_beadAh, [beadInfo, _typed]]) => selectedPps.has(beadInfo.bead.ppAh.b64))
      .map(([beadAh, [beadInfo, typed]]) => {
        (typed as TextBeadMat).value = this.getLatestEdit(beadAh) ?? (typed as TextBeadMat).value;
        beadsMap.set(beadAh, [beadInfo, typed])
      });
    /** emojis */
    const emojiReactions: [ActionHashB64, [AgentPubKeyB64, string[]][]][] = [];
    for (const [beadAh, map] of this.emojiReactions.entries()) {
      if (!beadsMap.get(beadAh)) continue;
      const agents: [AgentPubKeyB64, string[]][] = Array.from(map.entries()).map(([agent, emojis]) => [agent.b64, emojis]);
      emojiReactions.push([beadAh.b64, agents]);
    }
    /** -- Done -- */
    const result: ThreadsSnapshot = {
      appletSubjectTypes,
      appletIds: this.appletIds.map((id) => id.b64),
      subjects: Array.from(this.subjects.entries()),
      semanticTopics: Array.from(this.semanticTopics.entries())
        .filter(([topicHash, _pair]) => selectedTopics.has(topicHash.b64))
        .map(([topicHash, [title, author]]) => [topicHash.b64, title, author.b64]),
      hiddens: Object.entries(this.hiddens).filter(([_hash, isHidden]) => isHidden).map(([hash, _isHidden]) => hash),
      pps,
      beads: Array.from(beadsMap.entries()).map(([beadAh, [a, b]]) => [beadAh.b64, a, b]),
      emojiReactions,
      favorites: this.favorites.filter((id) => beadsMap.get(id)).map((id) => id.b64),
      bans: Array.from(this.bans.entries())
        .filter(([ppAh, _a]) => selectedPps.has(ppAh.b64))
        .map(([ppAh, agents]) => [ppAh.b64, agents.map((a) => a.b64)]),
      flags: Array.from(this.flags.entries())
        .filter(([ppAh, _a]) => selectedPps.has(ppAh.b64))
        .map(([ppAh, pairs]) => [ppAh.b64, pairs.map(([_lh, beadAh]) => beadAh.b64)]),
    };
    print(result);
    return result;
  }
}


/** Perspective fields that are built from the Core perspective. There is no exclusive data to this class. */
export class ThreadsPerspectiveMutable extends ThreadsPerspective {

  get readonly(): ThreadsPerspective {
    return this;
  }


  /** -- Store -- */

  /** */
  setValidation(hash: AnyDhtHashB64, newValidation: ValidatedBy) {
    // console.log("setValidation call", hash, newValidation);
    const current = this.validationMap.get(hash);
    if (!current) {
      this.validationMap.set(hash, newValidation);
      return;
    }
    /** Update validation if it's better */
    switch (newValidation) {
      case ValidatedBy.None: break;
      case ValidatedBy.Network: this.validationMap.set(hash, newValidation); break;
      case ValidatedBy.Peer:
        if (current !== ValidatedBy.Network) {
          this.validationMap.set(hash, newValidation);
        }
        break;
      case ValidatedBy.Me:
        if (current === ValidatedBy.None) {
          this.validationMap.set(hash, newValidation);
        }
        break;
    }
  }


  /** */
  storeAllNewThreads(list: [ActionId, AnyId][]) {
    //this.newThreads.clear();
    for (const [ah, subjectHash] of list) {
      this.newThreads.set(ah, subjectHash);
    }
  }


  /** */
  unstoreNewThread(ah: ActionId) {
    this.newThreads.delete(ah);
  }


  /** */
  storeAllUnreads(list: ActionIdMap<[AnyId, [ActionId, Timestamp][]]>) {
    this.unreads.clear();
    for (const [ah, map] of list.entries()) {
      this.unreads.set(ah, map)
    }
  }

  /** */
  storeSubjectsWithType(typePathEh: EntryId, subjectB64s: [DnaId, AnyId][]) {
    this.subjectsPerType.set(typePathEh, subjectB64s);
  }


  /** */
  storeSubjectTypesForApplet(appletId: EntryId, raw: [string, Uint8Array][]) {
    console.log("storeSubjectTypesForApplet() appletId", appletId.b64, raw.length);
    let subjectTypes: EntryIdMap<string> = new EntryIdMap();
    for (const [subjectType, pathEh] of raw) {
      subjectTypes.set(new EntryId(pathEh), subjectType);
    }
    console.log("storeSubjectTypesForApplet() appletId subjectTypes", subjectTypes);
    this.appletSubjectTypes.set(appletId, subjectTypes);
  }


  /** */
  storeTypedBeadWithMeta(beadAh: ActionId, beadInfo: BeadInfo, typedBead: TypedBeadMat, isNew: Boolean, validation: ValidatedBy, isUnread: boolean, innerPair?: [BeadInfo, TypedBaseBeadMat]) {
    //console.debug("storeTypedBead()", beadInfo.beadType, beadAh.short, isNew, validation);
    if (this.beads.get(beadAh)) {
      console.warn("Bead already stored", beadAh.b64);
      return;
    }
    /** Store EncryptedBead */
    if (beadInfo.beadType == ThreadsEntryType.EncryptedBead) {
      if (!innerPair) {
        throw Error("Missing innerPair argument");
      }
      this.decBeads.set(beadAh, innerPair);
    }
    /** Store normal base Bead */
    this.beads.set(beadAh, [beadInfo, typedBead]);
    this.storeBeadInThread(beadAh, beadInfo, isUnread, beadInfo.beadType);
    this.setValidation(beadAh.b64, validation);
    if (isNew) {
      this.isNewStorageMap.add(beadAh.b64);
    }
  }


  /* Store Bead in its Thread */
  private storeBeadInThread(beadAh: ActionId, beadInfo: BeadInfo, isUnread: boolean, beadType: BeadType) {
    const ppAh = beadInfo.bead.ppAh;
    const creationTime = beadInfo.creationTime;
    //console.debug("storeBeadInThread()", ppAh.short, beadType, beadAh.short, creationTime, this.threads.get(ppAh));
    const thread = this.threads.get(ppAh);
    if (!thread) {
      // await this.fetchPp(ppAh);
      // if (!this._threads.has(ppAh)) {
      //   return Promise.reject("Unknown ppAh");
      // }
      return;
    }
    const blMat: BeadLinkMaterialized = {creationTime, beadAh, beadType};
    thread.addItem(blMat);
    if (isUnread) {
      if (!this.unreads.get(ppAh)) {
        this.unreads.set(ppAh, [intoAnyId(thread.pp.subject.address), []]);
      }
      this.unreads.get(ppAh)![1].push([beadAh, creationTime]);
    }
  }


  /** */
  storeNotification(newNotif: ThreadsNotification, ppAh: ActionId) {
    if (this.inbox.get(newNotif.createLinkAh)) {
      return;
    }
    console.log("storeNotification()", newNotif.event, newNotif.createLinkAh.b64);
    this.inbox.set(newNotif.createLinkAh, [ppAh, newNotif]);
    const maybe = this.inboxByThread.get(ppAh);
    if (!maybe) {
      this.inboxByThread.set(ppAh, [[newNotif.author, newNotif.createLinkAh]]);
    } else {
      maybe.push([newNotif.author, newNotif.createLinkAh])
    }
  }


  /** */
  unstoreNotification(linkAh: ActionId) {
    const maybe = this.inbox.get(linkAh);
    if (!maybe) {
      return
    }
    const ppAh = maybe[0];
    //const notifAuthor = maybe[1].author;
    /** Delete in inboxByThread */
    const newList = this.inboxByThread.get(ppAh)!
      .filter(([_author, lAh]) => !linkAh.equals(lAh));
    this.inboxByThread.set(ppAh, newList);
    /** */
    this.inbox.delete(linkAh);
  }


  /** */
  storeHidden(hash: LinkableId, isHidden: boolean) {
    this.hiddens[hash.b64] = isHidden;
  }


  updateSemanticTopic(newAh: ActionId, oldAh: ActionId, title: string, author: AgentId): void {
    this.unstoreSemanticTopic(oldAh);
    this.storeSemanticTopic(newAh, title, author);
    this.subjectToOrig.set(newAh.b64, oldAh);
    this.subjectToLatest.set(oldAh.b64, newAh);
    //this.subjects.set(subjectAddr.b64, pp.subject);
  }

  /** */
  storeSemanticTopic(hash: ActionId, title: string, author: AgentId): void {
    //console.debug("store SemanticTopic", hash.short);
    if (!this.bannedSemanticTopics.includes(hash)) {
      this.semanticTopics.set(hash, [title, author]);
    }
  }

  /** */
  unstoreSemanticTopic(hash: ActionId): void {
    // if (!this.semanticTopics.has(hash)) {
    //   console.warn("Unstoring unknown topic", hash.short);
    //   return;
    // }
    this.bannedSemanticTopics.push(hash);
    //console.debug("unstore SemanticTopic", hash.short);
    this.semanticTopics.delete(hash);
  }


  /** */
  storeNotifSetting(ppAh: ActionId, agent: AgentId, setting: NotifySetting): void {
    if (!this.notifSettings.get(ppAh)) {
      this.notifSettings.set(ppAh, new AgentIdMap());
    }
    this.notifSettings.get(ppAh)!.set(agent, setting);
  }


  /** */
  storeFavorite(beadAh: ActionId): void {
    if (this.favorites.map((ah) => ah.b64).includes(beadAh.b64)) {
      return;
    }
    this.favorites.push(beadAh);
  }

  /** */
  unstoreFavorite(beadAh: ActionId): void {
    if (!this.favorites.map((ah) => ah.b64).includes(beadAh.b64)) {
      return;
    }
    this.favorites = this.favorites.filter(item => item.b64 !== beadAh.b64);
  }


  /** */
  storeDeletedThread(ppAh: ActionId) {
    console.debug(`storeDeletedThread() thread`, ppAh.b64);
    this.deletedThreads.add(ppAh.b64);
  }

  // /** */
  // unstoreThread(ppAh: ActionId) {
  //   console.debug(`unstoreThread() thread`, ppAh.b64);
  //   const thread = this.threads.get(ppAh);
  //   if (!thread) {
  //     return;
  //   }
  //   this.threads.delete(ppAh);
  //   this.newThreads.delete(ppAh);
  //   const subjectAddr = intoAnyId(thread.pp.subject.address);
  //   const subjectThreads = this.threadsPerSubject.get(subjectAddr.b64);
  //   if (subjectThreads) {
  //     const filtered = [];
  //     for (const thread of subjectThreads) {
  //       if (!thread.equals(ppAh)) {
  //         filtered.push(thread);
  //       }
  //     }
  //     if (filtered.length > 0) {
  //       this.threadsPerSubject.set(subjectAddr.b64, filtered);
  //     } else {
  //       this.threadsPerSubject.delete(subjectAddr.b64);
  //     }
  //   }
  // }


  /** */
  storeThread(cell: Cell, ppAh: ActionId, pp: ParticipationProtocol, maybeTitle: string | undefined, creationTime: Timestamp, author: AgentId, validation: ValidatedBy, isNew: boolean): ParticipationProtocol {
    //console.debug(`storeThread() thread "${ppAh.short}"`, author.short, isNew, pp, pp.subject.name, pp.subject.address);
    console.debug(`storeThread() thread`, pp.purpose, ppAh.b64, prettyTimestamp(creationTime));
    if (!pp || !cell) {
      throw Error("Arguments undefined when calling storeThread()");
    }
    if (this.deletedThreads.has(ppAh.b64)) {
      console.log("storeThread aborted, since thread is marked deleted");
      return pp;
    }
    this.setValidation(ppAh.b64, validation);
    if (isNew) {
      this.isNewStorageMap.add(ppAh.b64);
    }
    /** Return already stored PP */
    if (this.threads.has(ppAh)) {
      return this.threads.get(ppAh)!.pp;
    }
    const subjectAddr = intoAnyId(pp.subject.address);
    const thread = new Thread(pp, maybeTitle, /*FIXME cell.dnaModifiers.origin_time*/ 0, creationTime, author);
    //console.log(`storeThread() thread "${ppAh.short}" for subject "${pp.subject.address}"| creationTime: ${prettyTimestamp(creationTime)}"`);
    /** Add already stored log */
    const maybeLog = this._tempThreadLogs.get(ppAh);
    if (maybeLog) {
      thread.setLatestProbeLogTime(maybeLog.ts);
      this._tempThreadLogs.delete(ppAh);
    }
    /** */
    this.threads.set(ppAh, thread);
    /** Add already stored beads */
    for (const [beadAh, [info, _typed]] of this.beads.entries()) {
      if (info.bead.ppAh.equals(ppAh)) {
        this.storeBeadInThread(beadAh, info, isNew, info.beadType); // Note: If thread is new then all known beads for this thread are also new
      }
    }
    if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
      /** DM thread */
      const agentId = new AgentId(subjectAddr.b64);
      let otherAgent = cell.address.agentId.equals(author)? agentId : author;
      //console.log("storeThread() dmThread", otherAgent);
      this.dmAgents.set(otherAgent, ppAh);
    } else {
      /** isNew */
      if (isNew) {
        //console.debug(`storeThread() newThreads "${ppAh.short}"`);
        this.newThreads.set(ppAh, subjectAddr);
      }
      /** threadsPerSubject */
      if (!this.threadsPerSubject.get(subjectAddr.b64)) {
        this.threadsPerSubject.set(subjectAddr.b64, []);
      }
      this.threadsPerSubject.get(subjectAddr.b64)!.push(ppAh);

      /** All Subjects */
      this.storeSubject(pp.subject);
      // if (!this.subjects.get(subjectAddr.b64)) {
      //   this.subjects.set(subjectAddr.b64, pp.subject);
      // }
    }
    //console.log("storePp()", ppMat.subjectHash, ppAh)
    /** Done */
    return pp;
  }


  /** */
  storeSubject(sub: Subject) {
    if (!this.subjects.get(sub.address)) {
      this.subjects.set(sub.address, sub);
    }
  }


  /** */
  storeBan(ppAh: ActionId, agent: AgentId) {
    console.debug("storeBan()", ppAh.short, agent.short);
    if (this.hasBan(ppAh, agent)) {
      return;
    }
    let bans = this.bans.get(ppAh);
    if (!bans) {
      bans = [];
    }
    bans.push(agent);
    this.bans.set(ppAh, bans);
  }


  /** */
  storeFlag(ppAh: ActionId, beadAh: ActionId, linkAh: ActionId) {
    console.debug("storeFlag()", ppAh.short, beadAh.short);
    if (this.hasFlag(ppAh, beadAh)) {
      return;
    }
    let flags = this.flags.get(ppAh);
    //console.debug("storeFlag() count", flags);
    if (!flags) {
      flags = [];
    }
    flags.push([linkAh, beadAh]);
    this.flags.set(ppAh, flags);
  }


  /** */
  storeEmojiReaction(beadAh: ActionId, agent: AgentId, emoji: string) {
    console.debug("storeEmojiReaction()", emoji, beadAh.short, agent.short);
    if (this.hasEmojiReaction(beadAh, agent, emoji)) {
      return;
    }
    if (!this.emojiReactions.get(beadAh)) {
      this.emojiReactions.set(beadAh, new AgentIdMap());
    }
    if (!this.emojiReactions.get(beadAh)!.get(agent)) {
      this.emojiReactions.get(beadAh)!.set(agent, []);
    }
    const agentEmojis = this.emojiReactions.get(beadAh)!.get(agent)!;
    agentEmojis.push(emoji);
    this.emojiReactions.get(beadAh)!.set(agent, agentEmojis);
  }


  /** */
  unstoreEmojiReaction(beadAh: ActionId, agent: AgentId, emoji: string) {
    console.debug("unstoreEmojiReaction()", emoji, beadAh.short, agent.short);
    const beadEmojis = this.emojiReactions.get(beadAh);
    if (!beadEmojis) {
      console.warn("Trying to unstore missing emoji reaction (1)");
      return;
    }
    /** Look for agent */
    const agentEmojis = beadEmojis.get(agent);
    if (!agentEmojis) {
      console.warn("Trying to unstore missing emoji reaction (2)");
      return;
    }
    if (!agentEmojis.includes(emoji)) {
      console.warn("Trying to unstore missing emoji reaction (3)");
      return;
    }
    const filtered = agentEmojis.filter((e) => !(e == emoji));
    this.emojiReactions.get(beadAh)!.set(agent, filtered);
    console.debug("unstoreEmojiReaction() set", filtered);
    /** Delete empty maps */
    if (this.emojiReactions.get(beadAh)!.get(agent)!.length == 0) {
      this.emojiReactions.get(beadAh)!.delete(agent);
      if (this.emojiReactions.get(beadAh)!.size == 0) {
        this.emojiReactions.delete(beadAh);
      }
    }
  }


  /** */
  storeGlobalLog(latestGlobalLogTime: Timestamp) {
    console.log("storeGlobalLog()")
    this.globalProbeLogTs = latestGlobalLogTime;
    //this.unreads.clear();
    //this.newThreads.clear();
  }


  /** */
  private _tempThreadLogs: ActionIdMap<ThreadLastProbeLog> = new ActionIdMap();

  storeThreadLog(log: ThreadLastProbeLog) {
    const ppAh = new ActionId(log.ppAh);
    const thread = this.threads.get(ppAh);
    if (!thread) {
      /** Once per thread: this is read on every render of every lister, so an
       *  unknown thread used to print dozens of identical lines per second. */
      if (!ThreadsPerspective._warnedUnknownProbeLog.has(ppAh.b64)) {
        ThreadsPerspective._warnedUnknownProbeLog.add(ppAh.b64);
        console.warn("Getting ThreadLastProbeLog for unknown thread", ppAh);
      }
      this._tempThreadLogs.set(ppAh, log);
      return;
    }
    thread.setLatestProbeLogTime(log.ts);
    this.unreads.delete(ppAh);
  }


  /** */
  unstoreUnreadThread(threadHash: ActionId) {
    this.unreads.delete(threadHash);
  }

  /** */
  storeAllAppletIds(ehs: EntryId[]) {
    this.appletIds = ehs;
  }


  /** */
  storeAllSubjects(list: Subject[]) {
    this.subjects.clear();
    for (const subject of list) {
      this.subjects.set(subject.address, subject);
    }
  }


  /** -- Memento -- */

  /** */
  restore(snapshot: ThreadsSnapshot, authorshipZvm: AuthorshipZvm, cell: Cell) {
    print(snapshot);
    /** Clear Notifications */
    this.globalProbeLogTs = 0;
    this.inbox.clear();
    this.notifSettings.clear();
    this.newThreads.clear();
    this.deletedThreads.clear();
    this.unreads.clear();
    /** this.appletIds */
    this.appletIds = [];
    for (const appletId of Object.values(snapshot.appletIds)) {
      this.appletIds.push(new EntryId(appletId));
    }
    /** this.appletSubjectTypes */
    this.appletSubjectTypes.clear();
    for (const [appletId, dict] of Object.values(snapshot.appletSubjectTypes)) {
      const appletEh = new EntryId(appletId);
      if (!this.appletSubjectTypes.get(appletEh)) {
        this.appletSubjectTypes.set(appletEh, new EntryIdMap());
      }
      for (const [pathHash, subjectType] of Object.values(dict)) {
        this.appletSubjectTypes.get(appletEh)!.set(new EntryId(pathHash), subjectType);
      }
    }
    /** this.subjects */
    this.subjects.clear();
    this.subjectsPerType.clear();
    for (const [subjectAddr, subject] of Object.values(snapshot.subjects)) {
      this.subjects.set(subjectAddr, subject);
      /** Figure out subjectsPerType */
      const appletTypes = this.appletSubjectTypes.get(new EntryId(subject.appletId));
      if (appletTypes) {
        const maybe = Array.from(appletTypes.entries()).filter(([_pathEh, typeName]) => typeName == subject.typeName);
        if (maybe) {
          const pathEh: EntryId = maybe[0]![0];
          if (!this.subjectsPerType.get(pathEh)) {
            this.subjectsPerType.set(pathEh, []);
          }
          this.subjectsPerType.get(pathEh)!.push([new DnaId(subject.dnaHashB64), intoAnyId(subjectAddr)]);
        }
      }
    }
    /** this.semanticTopics */
    this.semanticTopics.clear();
    for (const [topicHash, title, author] of Object.values(snapshot.semanticTopics)) {
      this.storeSemanticTopic(new ActionId(topicHash), title, new AgentId(author));
    }
    /** this.hiddens */
    this.hiddens = {}
    for (const anyHashB64 of Object.values(snapshot.hiddens)) {
      this.hiddens[anyHashB64] = true;
    }
    /** this.threads */
    this.threads.clear();
    this.threadsPerSubject.clear();
    this.dmAgents.clear();
    for (const [ppAhB64, ppMat, title, creationTime, _maybeOtherAgent] of Object.values(snapshot.pps)) {
      const ppAh = new ActionId(ppAhB64);
      const authorshipLog: [Timestamp, AgentId] = authorshipZvm.perspective.getAuthor(ppAh) != undefined
        ? authorshipZvm.perspective.getAuthor(ppAh)!
        : [creationTime, cell.address.agentId];
      this.storeThread(cell, ppAh, dematerializePp(ppMat), title, authorshipLog[0], authorshipLog[1], ValidatedBy.None, false);
    }
    /** this.beads */
    this.beads.clear();
    this.decBeads.clear();
    for (const [beadAhB64, beadInfo, typedBead] of Object.values(snapshot.beads)) {
      const beadAh = new ActionId(beadAhB64);
      const authorshipLog: [Timestamp, AgentId] = authorshipZvm.perspective.getAuthor(beadAh) != undefined
        ? authorshipZvm.perspective.getAuthor(beadAh)!
        : [beadInfo.creationTime, beadInfo.author];
      beadInfo.creationTime = authorshipLog[0];
      if (authorshipLog[1]) {
        beadInfo.author = authorshipLog[1];
      }
      //this.storeTypedBead(beadAh, typedBead, beadInfo.beadType, authorshipLog[0], authorshipLog[1], true);
      if (beadInfo.beadType != ThreadsEntryType.EncryptedBead) {
        this.storeTypedBeadWithMeta(beadAh, beadInfo, typedBead, false, ValidatedBy.None, true);
      }
      // TODO handle decBeads
    }
    //console.log("import() beads", this.beads);
    /** this._emojiReactions */
    this.emojiReactions.clear();
    //console.log("import() emojiReactions", snapshot.emojiReactions);
    for (const [beadAhB64, pairs] of snapshot.emojiReactions) {
      const beadAh = new ActionId(beadAhB64);
      if (!this.emojiReactions.get(beadAh)) {
        this.emojiReactions.set(beadAh, new AgentIdMap());
      }
      for (const [agentB64, emojis] of pairs) {
        //console.log("import() emojiReaction", agentB64, emojis);
        const agent = new AgentId(agentB64);
        this.emojiReactions.get(beadAh)!.set(agent, emojis);
      }
    }
    /** this.favorites */
    this.favorites = snapshot.favorites.map((b64) => new ActionId(b64));
    /** */
    this.print();
  }


  /** */
  print(): void {
    console.log("ThreadsPerspective:");
    console.log("  -       appletIds:", this.appletIds.length);
    console.log("  - appletSubjTypes:", this.appletSubjectTypes.size);
    console.log("  -        subjects:", this.subjects.size);
    console.log("  -  semanticTopics:", this.semanticTopics.size);
    console.log("  -         hiddens:", Object.keys(this.hiddens).length);
    console.log("  -       favorites:", this.favorites.length);
    console.log("  -         threads:", this.threads.size);
    console.log("  -            bans:", this.bans.size);
    console.log("  -           flags:", this.flags.size);
    console.log("  -           beads:", this.beads.size);
    console.log("  -  emojiReactions:", this.emojiReactions.size);
  }
}



