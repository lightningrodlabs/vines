import {ActionHashB64, AgentPubKeyB64, EntryHashB64, HoloHashB64, Timestamp} from "@holochain/client";
import {
  Dictionary,
  AgentId,
  ActionId,
  EntryId,
  AgentIdMap,
  ActionIdMap,
  EntryIdMap, DnaId, LinkableId, intoAnyId, AnyId,
} from "@ddd-qc/lit-happ";
import {Thread} from "./thread";
import {
  DM_SUBJECT_TYPE_NAME,
  NotifySetting, ParticipationProtocol, Subject, ThreadLastProbeLog, ThreadsEntryType,
} from "../bindings/threads.types";
import {AnyIdMap} from "../utils";
import {
  BeadInfo,
  BeadLinkMaterialized,
  BeadType,
  TextBeadMat,
  ThreadsNotification,
  TypedBaseBeadMat,
  TypedBeadMat
} from "./threads.materialize";
import {AuthorshipZvm} from "./authorship.zvm";
import {SearchParameters} from "../search";
import {Cell} from "@ddd-qc/cell-proxy";


/** Snapshot does not store notifications and new/unread state */
/** TODO: store private dms */
export interface ThreadsSnapshot {
  /** Store of all Subjects: hash -> Subject */
  subjects: [HoloHashB64, Subject][],
  /** Store of all SemTopic: eh -> TopicTitle */
  semanticTopics: [EntryHashB64, string][],
  /** Keep only marked items */
  hiddens: HoloHashB64[],
  favorites: ActionHashB64[],
  /** ppAh -> (ppMat, ts, author) */
  pps: [ActionHashB64, ParticipationProtocol, Timestamp, AgentPubKeyB64][],
  /** beadAh -> [BeadInfoMat, TypedBeadMat] */
  beads: [ActionHashB64, BeadInfo, TypedBeadMat][],
  /** bead_ah -> [agent, emojis[]][] */
  emojiReactions: [ActionHashB64, [AgentPubKeyB64, string[]][]][],

  // TODO: remove deductibles
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
  console.log("  -           beads:", self.beads.length);
  console.log("  -  emojiReactions:", self.emojiReactions.length);
  console.log("  - appletSubjTypes:", self.appletSubjectTypes.length);
  console.log("  -       favorites:", self.favorites.length);
}


/** */
export class ThreadsPerspective {
  /** */
  appletIds: EntryId[] = [];
  /** Store of all Subjects: hash -> Subject */
  subjects: AnyIdMap<Subject> = new AnyIdMap();
  /** Store of all SemTopic: eh -> TopicTitle */
  semanticTopics: EntryIdMap<string> = new EntryIdMap();
  /** Any hash -> isHidden */
  hiddens: Dictionary<boolean> = {};
  /** */
  favorites: ActionId[] = [];
  /** ppAh -> Thread */
  threads: ActionIdMap<Thread> = new ActionIdMap();
  /** beadAh -> [BeadInfo, TypedBead] */
  beads: ActionIdMap<[BeadInfo, TypedBeadMat]> = new ActionIdMap();
  /** beadAh -> [agent, emoji][] */
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
  //mentions: Dictionary<[AgentPubKeyB64, ActionHashB64]>,
  /** linkAh -> (ppAh, notif) */
  inbox: ActionIdMap<[ActionId, ThreadsNotification]> = new ActionIdMap();
  /* ppAh -> (agent -> value) */
  notifSettings: ActionIdMap<AgentIdMap<NotifySetting>> = new ActionIdMap();


  /** -- Extra -- */

  /** Store threads for queried/probed subjects: SubjectHash -> ProtocolAh */
  threadsPerSubject: AnyIdMap<ActionId[]> = new AnyIdMap();
  /** PathEntryHash -> [DnaId, SubjectHash][] */
  subjectsPerType: EntryIdMap<[DnaId, AnyId][]> = new EntryIdMap();
  ///* name string -> ppAh */
  //private _threadsByName: Dictionary<ActionId> = {};

  /** New == Found when doing probeAllLatest(), i.e. created since last GlobalProbeLog */
  /** A subject is new if a new thread has found for it and no older threads for this subject has been found */
  /* ppAh -> SubjectHash */
  newThreads: ActionIdMap<AnyId> = new ActionIdMap();
  /** Unread subject == Has at least one unread thread */
  /** ppAh -> (subjectHash, beadAh[]) */
  unreadThreads: ActionIdMap<[AnyId, ActionId[]]> = new ActionIdMap();// Unread thread == Has "new" beads


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
    if (!thread) {
      return false;
    }
    return thread.hasSearchedOldestBead;
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
  getSubjectThreads(any: HoloHashB64): ActionId[] {
    const maybe = this.threadsPerSubject.get(any);
    if (!maybe) return [];
    return maybe;
  }


  /** */
  getSubjects(typePathHash: EntryId): [DnaId, AnyId][] | undefined {
    return this.subjectsPerType.get(typePathHash);
  }


  /** unreadSubjects: subject has at least one unread thread */
  getUnreadSubjects(): AnyId[] {
    let unreadSubjects = Array.from(this.unreadThreads.values()).map(([subjectId, _beads]) => subjectId);
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
    for (const [subjectHash, oldestNewThreadTs] of oldestNewThreadBySubject.entries()) {
      //const pairs = await this.zomeProxy.getPpsFromSubjectHash(decodeHashFromBase64(subjectHash));
      const threads = this.threadsPerSubject.get(subjectHash)? this.threadsPerSubject.get(subjectHash)!: [];
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
    /** -- Done -- */
    const result: ThreadsSnapshot = {
      appletIds: this.appletIds.map((id) => id.b64),
      subjects: Array.from(this.subjects.entries()),
      semanticTopics: Array.from(this.semanticTopics.entries()).map(([topicEh, title]) => [topicEh.b64, title]),
      hiddens: Object.entries(this.hiddens).filter(([_hash, isHidden]) => isHidden).map(([hash, _isHidden]) => hash),
      favorites: this.favorites.map((id) => id.b64),
      pps: Array.from(this.threads.entries()).map(([ppAh, thread]) => [ppAh.b64, thread.pp, thread.creationTime, thread.author.b64]),
      beads: Array.from(this.beads.entries()).map(([beadAh, [beadInfo, typed]]) => [beadAh.b64, beadInfo, typed]),
      emojiReactions,
      appletSubjectTypes,
    };
    print(result);
    return result;
  }
}



/** Perspective fields that are built from the Core perspective. There is no exclusif data. */
export class ThreadsPerspectiveMutable extends ThreadsPerspective {

  get readonly(): ThreadsPerspective {
    return this;
  }


  /** -- Store -- */

  /** */
  storeAllNewThreads(list: [ActionId, AnyId][]) {
    this.newThreads.clear();
    for (const [ah, subjectHash] of list) {
      this.newThreads.set(ah, subjectHash)
    }
  }


  /** */
  storeAllUnreadThreads(list: ActionIdMap<[AnyId, ActionId[]]>) {
    this.unreadThreads.clear();
    for (const [ah, map] of list.entries()) {
      this.unreadThreads.set(ah, map)
    }
  }

  /** */
  storeSubjectsWithType(typePathEh: EntryId, subjectB64s: [DnaId, AnyId][]) {
    this.subjectsPerType.set(typePathEh, subjectB64s);
  }


  /** */
  storeSubjectTypesForApplet(appletId: EntryId, raw: [string, Uint8Array][]) {
    let subjectTypes: EntryIdMap<string> = new EntryIdMap();
    for (const [subjectType, pathEh] of raw) {
      subjectTypes.set(new EntryId(pathEh), subjectType);
    }
    console.log("storeSubjectTypesForApplet()", appletId, subjectTypes);
    this.appletSubjectTypes.set(appletId, subjectTypes);
  }


  /** */
  storeTypedBead(beadAh: ActionId, beadInfo: BeadInfo, typedBead: TypedBeadMat, isNew: boolean, innerPair?: [BeadInfo, TypedBaseBeadMat]) {
    /** Store EncryptedBead */
    if (beadInfo.beadType == ThreadsEntryType.EncryptedBead) {
      if (!innerPair) {
        throw Error("Missing innerPair argument");
      }
      this.decBeads.set(beadAh, innerPair);
    }
    /** Store normal base Bead */
    this.beads.set(beadAh, [beadInfo, typedBead]);
    this.storeBeadInThread(beadAh, beadInfo.bead.ppAh, beadInfo.creationTime, isNew, beadInfo.beadType);
  }


  /* Store Bead in its Thread */
  private storeBeadInThread(beadAh: ActionId, ppAh: ActionId, creationTime: Timestamp, isNew: boolean, beadType: BeadType) {
    console.log("storeBeadInThread()", ppAh.short, beadType, beadAh.short, creationTime, this.threads.get(ppAh));
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
    if (isNew) {
      if (!this.unreadThreads.get(ppAh)) {
        this.unreadThreads.set(ppAh, [intoAnyId(thread.pp.subject.address), []]);
      }
      this.unreadThreads.get(ppAh)![1].push(beadAh);
    }
  }


  /** */
  storeNotification(notif: ThreadsNotification, ppAh: ActionId) {
    console.log("storeNotification()", notif.event, ppAh);
    this.inbox.set(notif.createLinkAh, [ppAh, notif]);
  }


  /** */
  unstoreNotification(linkAh: ActionId) {
    this.inbox.delete(linkAh); // = undefined;
  }


  /** */
  storeHidden(hash: LinkableId, isHidden: boolean) {
    this.hiddens[hash.b64] = isHidden;
  }


  /** */
  storeSemanticTopic(eh: EntryId, title: string): void {
    this.semanticTopics.set(eh, title);
  }
  /** */
  unstoreSemanticTopic(eh: EntryId): void {
    this.semanticTopics.delete(eh);
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
  storeThread(cell: Cell, ppAh: ActionId, pp: ParticipationProtocol, creationTime: Timestamp, author: AgentId, isNew: boolean): ParticipationProtocol {
    console.log(`storeThread() thread "${ppAh.short}"`, author.short, pp);
    if (!pp || !cell) {
      throw Error("Arguments undefined when calling storeThread()");
    }
    /** Return already stored PP */
    if (this.threads.has(ppAh)) {
      return this.threads.get(ppAh)!.pp;
    }
    const subjectAddr = intoAnyId(pp.subject.address);
    const thread = new Thread(pp, cell.dnaModifiers.origin_time, creationTime, author);
    console.log(`storeThread() thread "${ppAh.short}" for subject "${pp.subject.address}"| creationTime: ${creationTime}"`);
    this.threads.set(ppAh, thread);
    /** Add already stored beads */
    for (const [beadAh, [info, _typed]] of this.beads.entries()) {
      if (info.bead.ppAh.equals(ppAh)) {
        this.storeBeadInThread(beadAh, ppAh, info.creationTime, false, info.beadType);
      }
    }
    if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
      /** DM thread */
      const agentId = new AgentId(subjectAddr.b64);
      let otherAgent = cell.address.agentId.equals(author)? agentId : author;
      console.log("storeThread() dmThread", otherAgent);
      this.dmAgents.set(otherAgent, ppAh);
    } else {
      /** isNew */
      if (isNew) {
        this.newThreads.set(ppAh, subjectAddr);
      }
      /** threadsPerSubject */
      if (!this.threadsPerSubject.get(subjectAddr.b64)) {
        this.threadsPerSubject.set(subjectAddr.b64, []);
      }
      this.threadsPerSubject.get(subjectAddr.b64)!.push(ppAh);

      /** All Subjects */
      if (!this.subjects.get(subjectAddr.b64)) {
        this.subjects.set(subjectAddr.b64, pp.subject);
      }
    }
    //console.log("storePp()", ppMat.subjectHash, ppAh)
    /** Done */
    return pp;
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
    this.globalProbeLogTs = latestGlobalLogTime;
    this.unreadThreads.clear();
    this.newThreads.clear();
  }


  /** */
  storeThreadLog(log: ThreadLastProbeLog) {
    const ppAh = new ActionId(log.ppAh);
    const thread = this.threads.get(ppAh);
    if (!thread) {
      console.warn("Getting ThreadLastProbeLog for unknown thread", ppAh);
      return;
    }
    thread.setLatestProbeLogTime(log.ts);
    this.unreadThreads.delete(ppAh);
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
    this.unreadThreads.clear();
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
    for (const [topicEh, title] of Object.values(snapshot.semanticTopics)) {
      this.storeSemanticTopic(new EntryId(topicEh), title);
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
    for (const [ppAhB64, ppMat, creationTime, _maybeOtherAgent] of Object.values(snapshot.pps)) {
      const ppAh = new ActionId(ppAhB64);
      const authorshipLog: [Timestamp, AgentId] = authorshipZvm.perspective.getAuthor(ppAh) != undefined
        ? authorshipZvm.perspective.getAuthor(ppAh)!
        : [creationTime, cell.address.agentId];
      this.storeThread(cell, ppAh, ppMat, authorshipLog[0], authorshipLog[1], false);
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
        this.storeTypedBead(beadAh, beadInfo, typedBead, true);
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


  print(): void {
    console.log("ThreadsPerspective:");
    console.log("  -       appletIds:", this.appletIds.length);
    console.log("  - appletSubjTypes:", this.appletSubjectTypes.size);
    console.log("  -        subjects:", this.subjects.size);
    console.log("  -  semanticTopics:", this.semanticTopics.size);
    console.log("  -         hiddens:", Object.keys(this.hiddens).length);
    console.log("  -       favorites:", this.favorites.length);
    console.log("  -         threads:", this.threads.size);
    console.log("  -           beads:", this.beads.size);
    console.log("  -  emojiReactions:", this.emojiReactions.size);
  }
}



