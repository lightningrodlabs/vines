import {ActionHashB64, AgentPubKeyB64, EntryHashB64, HoloHashB64, Timestamp} from "@holochain/client";
import {
  Dictionary,
  AgentId,
  ActionId,
  EntryId,
  AgentIdMap,
  ActionIdMap,
  EntryIdMap, DnaId, LinkableId, intoLinkableId,
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
  BeadType, dematerializeParticipationProtocol,
  materializeParticipationProtocol,
  materializeSubject,
  ParticipationProtocolMat,
  SubjectMat, TextBeadMat,
  ThreadsNotification,
  TypedBaseBeadMat,
  TypedBead,
  TypedBeadMat
} from "./threads.materialize";
import {AuthorshipZvm} from "./authorship.zvm";
import {AnyLinkableHashB64} from "@ddd-qc/path-explorer/dist/utils";
import {SearchParameters} from "../search";
import {Cell} from "@ddd-qc/cell-proxy";


/** */
export interface ThreadsSnapshot {
  /** */
  appletIds: EntryHashB64[],
  /** Store of all Subjects: hash -> Subject */
  subjects: [AnyLinkableHashB64, SubjectMat][],
  /** Store of all SemTopic: eh -> TopicTitle */
  semanticTopics: [EntryHashB64, string][],
  /** */
  hiddens: AnyLinkableHashB64[],
  favorites: ActionHashB64[],
  /** ppAh -> ppMat */
  pps: [ActionHashB64, ParticipationProtocolMat, Timestamp, AgentPubKeyB64][],
  /** beadAh -> [BeadInfoMat, TypedBeadMat] */
  beads: [ActionHashB64, BeadInfo, TypedBeadMat][],
  /** bead_ah -> [agent, emoji[]][] */
  emojiReactions: [ActionHashB64, [AgentPubKeyB64, string[]][]][],
  /** AppletId -> (PathEntryHash -> subjectType) */
  appletSubjectTypes: [EntryHashB64, [EntryHashB64, string][]][],
}


/** */
export class ThreadsPerspective {
  /** */
  appletIds: EntryId[] = [];
  /** Store of all Subjects: hash -> Subject */
  subjects: AnyIdMap<SubjectMat> = new AnyIdMap();
  /** Store of all SemTopic: eh -> TopicTitle */
  semanticTopics: EntryIdMap<string> = new EntryIdMap();
  /** Any hash -> isHidden */
  hiddens: Dictionary<boolean> = {};
  /** ppAh -> Thread */
  threads: ActionIdMap<Thread> = new ActionIdMap();
  /** beadAh -> [BeadInfo, TypedBead] */
  beads: ActionIdMap<[BeadInfo, TypedBeadMat]> = new ActionIdMap();
  /** beadAh -> [agent, emoji][] */
  emojiReactions: ActionIdMap<AgentIdMap<string[]>> = new ActionIdMap();

  /** -- DM stuff  -- */
  /** agentId -> ppAh */
  dmAgents: AgentIdMap<ActionId> = new AgentIdMap();
  /** encBeadAh -> [BeadInfo, TypedBead] */
  decBeads: ActionIdMap<[BeadInfo, TypedBaseBeadMat]> = new ActionIdMap();

  /**  -- Applet threads  -- */
  /** AppletId -> PathEntryHash -> subjectType */
  appletSubjectTypes: EntryIdMap<EntryIdMap<string>> = new EntryIdMap();

  /** -- Favorites -- */
  favorites: ActionId[] = [];

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
  /** PathEntryHash -> subjectHash[] */
  subjectsPerType: EntryIdMap<[DnaId, LinkableId][]> = new EntryIdMap();
  ///* name string -> ppAh */
  //private _threadsByName: Dictionary<ActionId> = {};

  /** New == Found when doing probeAllLatest(), i.e. created since last GlobalProbeLog */
  /** A subject is new if a new thread has found for it and no older threads for this subject has been found */
  /* ppAh -> SubjectHash */
  newThreads: ActionIdMap<LinkableId> = new ActionIdMap();

  /** Unread subject == Has at least one unread thread */
  /** ppAh -> (subjectHash, beadAh[]) */
  unreadThreads: ActionIdMap<[LinkableId, ActionId[]]> = new ActionIdMap();// Unread thread == Has "new" beads



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


  getParticipationProtocol(ah: ActionId): ParticipationProtocolMat | undefined {
    const thread = this.threads.get(ah);
    if (!thread) {
      return undefined;
    }
    return thread.pp;
  }

  getAllPps(): ActionId[] { return Array.from(this.threads.keys()) }

  getAllSubjects(): [HoloHashB64, SubjectMat][] { return Array.from(this.subjects.entries()) }

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

  getBaseBeadInfo(beadAh: ActionId): BeadInfo | undefined {
    const maybeBead = this.beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    if (maybeBead[0].beadType != ThreadsEntryType.EncryptedBead) {
      return maybeBead[0];
    }
    const maybeDecBead = this.decBeads.get(beadAh);
    if (!maybeDecBead) {
      return undefined;
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
  getMostRecentBeadsOnThread(ppAh: ActionId): [BeadInfo, TypedBead][] {
    const thread = this.threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getLast(10).map((bl) => bl.beadAh);
    let infos = [];
    for (const ah of beadAhs) {
      if (this.beads.get(ah)) {
        infos.push(this.getBaseBead(ah))
      }
    }
    //TODO: tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  getAllBeadsOnThread(ppAh: ActionId): [ActionId, BeadInfo, TypedBeadMat][] {
    const thread = this.threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getAll().map((bl) => bl.beadAh);
    let infos = [];
    for (const ah of beadAhs) {
      if (this.beads.get(ah)) {
        infos.push([ah, this.getBaseBeadInfo(ah), this.getBaseBead(ah)]);
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
    console.log("getAllNotificationsForPp()", argPpAh, this.inbox);
    let result = [];
    for (const [linkAh, [ppAh, notif]] of this.inbox.entries()) {
      if (argPpAh.equals(ppAh)) {
        result.push([linkAh, notif]);
      }
    }
    return result;
  }


  /** */
  getLatestThread(): [ActionId, Thread] | undefined {
    let res = undefined;
    this.threads.forEach((thread, ah, _map) => {
      if (!res || thread.creationTime > res.creationTime) {
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
    return maybeAlready && maybeAlready.length > 0;
  }


  /** -- Getters -- */

  // getPpByName(name: string): ActionId | undefined {
  //   return this._threadsByName[name];
  // }
  //
  // getAllThreadsByName(): [string, ActionId][] {
  //   return Object.entries(this._threadsByName);
  // }

  /** */
  getCommentThreadForSubject(subjectId: LinkableId): ActionId | null {
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


  /** unreadSubjects: subject has at least one unread thread */
  getUnreadSubjects(): LinkableId[] {
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
      if (!oldestNewThreadBySubject.get(subjectId.b64) || thread.creationTime < oldestNewThreadBySubject.get(subjectId.b64)) {
        oldestNewThreadBySubject.set(subjectId.b64, thread.creationTime);
      }
    }
    //console.log("oldestThreadTimeBySubject", oldestThreadTimeBySubject);

    /* Figure out if subjects are new: no older "none-new" threads found for this subject */
    let newSubjects: AnyIdMap<Timestamp> = new AnyIdMap();
    for (const [subjectHash, oldestNewThreadTs] of oldestNewThreadBySubject.entries()) {
      //const pairs = await this.zomeProxy.getPpsFromSubjectHash(decodeHashFromBase64(subjectHash));
      const pairs: [ActionId, Timestamp][] = this.threadsPerSubject.get(subjectHash).map((ppAh) => {
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
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.author.equals(parameters.author)) //
    }
    /** filter mention */
    if (parameters.mentionsAgentByName) {
      const mentionLC = `@${parameters.mentionsAgentByName}`.toLowerCase();
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, _beadInfo, textLC]) => textLC.includes(mentionLC))
    }
    /** filter beforeTs */
    if (parameters.beforeTs) {
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.creationTime <= parameters.beforeTs);
    }
    /** filter afterTs */
    if (parameters.afterTs) {
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.creationTime >= parameters.afterTs);
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
      })
    }
    /** DONE */
    console.log("searchTextBeads() result", /*matchingTextBeads.length,*/ matchingTextBeads);
    return matchingTextBeads;
  }


  /** -- Memento -- */

  /** TODO: deep copy */
  makeSnapshot(originalsZvm: AuthorshipZvm): ThreadsSnapshot {
    /** allSubjects */
    const allSubjects: [AnyLinkableHashB64, SubjectMat][] = [];
    Array.from(this.subjects.entries()).map(([subjectAhB64, subject]) => {
      originalsZvm.ascribeTarget("Subject", intoLinkableId(subjectAhB64), 0/*TODO: get creationTime of Subject*/, null, true);
      allSubjects.push([subjectAhB64, subject]);
    });

    /** pps */
    const pps: Array<[ActionHashB64, ParticipationProtocolMat, Timestamp, AgentPubKeyB64]> = new Array();
    Array.from(this.threads.entries()).map(([ppAh, thread]) => {
      originalsZvm.ascribeTarget(ThreadsEntryType.ParticipationProtocol, ppAh, thread.creationTime, thread.author, true);
      pps.push([ppAh.b64, thread.pp, thread.creationTime, ""]);
    });

    /** beads */
    //console.log("exportPerspective() beads", this._beads);
    //const beads: Dictionary<[BeadInfo, TypedBeadMat]> = {};
    Array.from(this.beads.entries()).map(([beadAh, [beadInfo, _typed]]) => {
      //beads[beadAh] = (typed, beadInfo.beadType); // TODO: Optimize to not store twice core bead info.
      originalsZvm.ascribeTarget(beadInfo.beadType, beadAh, beadInfo.creationTime, beadInfo.author, true);
    });


    /** subject types */
    const appletSubjectTypes = [];
    for (const [appletEh, map] of this.appletSubjectTypes.entries()) {
      const types = Array.from(map.entries()).map(([pathEh, type]) => [pathEh.b64, type]);
      appletSubjectTypes.push(appletEh.b64, types);
    }

    /** emojis */
    const emojiReactions = [];
    for (const [beadAh, map] of this.emojiReactions.entries()) {
      for (const [agent, emojis] of map.entries()) {
        emojiReactions.push([beadAh.b64, agent.b64, emojis]);
      }
    }

    /** -- Done -- */
    return {
      semanticTopics: Array.from(this.semanticTopics.entries()).map(([topicEh, title]) => [topicEh.b64, title]),
      appletIds: this.appletIds.map((id) => id.b64),
      subjects: allSubjects,
      appletSubjectTypes,
      pps,
      beads: Array.from(this.beads.entries()).map(([beadAh, [beadInfo, typed]]) => [beadAh.b64, beadInfo, typed]),
      emojiReactions,
      hiddens: Object.entries(this.hiddens).filter(([_hash, isHidden]) => isHidden).map(([hash, isHidden]) => hash),
      favorites: this.favorites.map((id) => id.b64),
    };
  }

}



/** Perspective fields that are built from the Core perspective. There is no exclusif data. */
export class ThreadsPerspectiveMutable extends ThreadsPerspective {

  get readonly(): ThreadsPerspective {
    return this;
  }


  /** -- Store -- */

  storeAllNewThreads(list: [ActionId, LinkableId][]) {
    this.newThreads.clear();
    for (const [ah, subjectHash] of list) {
      this.newThreads.set(ah, subjectHash)
    }
  }

  storeAllUnreadThreads(list: ActionIdMap<[LinkableId, ActionId[]]>) {
    this.unreadThreads.clear();
    for (const [ah, map] of list.entries()) {
      this.unreadThreads.set(ah, map)
    }
  }

  /** */
  storeSubjectsWithType(typePathHash: EntryId, subjectB64s: [DnaId, LinkableId][]) {
    this.subjectsPerType.set(typePathHash, subjectB64s);
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
        this.unreadThreads.set(ppAh, [thread.pp.subject.address, []]);
      }
      this.unreadThreads.get(ppAh)[1].push(beadAh);
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
    this.notifSettings.get(ppAh).set(agent, setting);
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
  storeThread(cell: Cell, ppAh: ActionId, pp: ParticipationProtocol, creationTime: Timestamp, author: AgentId, isNew: boolean): ParticipationProtocolMat {
    console.log(`storeThread() thread "${ppAh.short}"`, author.short, pp);
    /** Return already stored PP */
    if (this.threads.has(ppAh)) {
      return this.threads.get(ppAh).pp;
    }
    let ppMat = materializeParticipationProtocol(pp);
    const thread = new Thread(ppMat, cell.dnaModifiers.origin_time, creationTime, author);
    console.log(`storeThread() thread "${ppAh.short}" for subject "${ppMat.subject.address.short}"| creationTime: ${creationTime}"`);
    this.threads.set(ppAh, thread);
    /** Add already stored beads */
    for (const [beadAh, [info, _typed]] of this.beads.entries()) {
      if (info.bead.ppAh.equals(ppAh)) {
        this.storeBeadInThread(beadAh, ppAh, info.creationTime, false, info.beadType);
      }
    }
    if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
      /** DM thread */
      const agentId = AgentId.from(ppMat.subject.address);
      let otherAgent = cell.address.agentId.equals(author)? agentId : author;
      console.log("storeThread() dmThread", otherAgent);
      this.dmAgents.set(otherAgent, ppAh);
    } else {
      /** isNew */
      if (isNew) {
        this.newThreads.set(ppAh, ppMat.subject.address);
      }
      /** threadsPerSubject */
      if (!this.threadsPerSubject.get(ppMat.subject.address.b64)) {
        this.threadsPerSubject.set(ppMat.subject.address.b64, []);
      }
      this.threadsPerSubject.get(ppMat.subject.address.b64).push(ppAh);

      /** All Subjects */
      if (!this.subjects.get(ppMat.subject.address.b64)) {
        this.subjects.set(ppMat.subject.address.b64, materializeSubject(pp.subject));
      }
    }
    //console.log("storePp()", ppMat.subjectHash, ppAh)
    /** Done */
    return ppMat;
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
    if (!this.emojiReactions.get(beadAh).get(agent)) {
      this.emojiReactions.get(beadAh).set(agent, []);
    }
    const agentEmojis = this.emojiReactions.get(beadAh).get(agent);
    agentEmojis.push(emoji);
    this.emojiReactions.get(beadAh).set(agent, agentEmojis);
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
    this.emojiReactions.get(beadAh).set(agent, filtered);
    console.debug("unstoreEmojiReaction() set", filtered);
    /** Delete empty maps */
    if (this.emojiReactions.get(beadAh).get(agent).length == 0) {
      this.emojiReactions.get(beadAh).delete(agent);
      if (this.emojiReactions.get(beadAh).size == 0) {
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
      const subjectMat = materializeSubject(subject);
      this.subjects.set(subjectMat.address.b64, subjectMat);
    }
  }

  /** -- Memento -- */


  /** */
  restore(snapshot: ThreadsSnapshot, authorshipZvm: AuthorshipZvm, cell: Cell) {
    /** this._allAppletIds */
    this.appletIds = [];
    for (const appletId of Object.values(snapshot.appletIds)) {
      this.appletIds.push(new EntryId(appletId));
    }
    /** this._allSubjects */
    this.subjects.clear();
    for (const [subjectHash, subject] of Object.values(snapshot.subjects)) {
      this.subjects.set(subjectHash, subject)
    }
    /** this._allSemanticTopics */
    this.semanticTopics.clear();
    for (const [topicEh, title] of Object.values(snapshot.semanticTopics)) {
      this.storeSemanticTopic(new EntryId(topicEh), title);
    }

    /** this._hiddens */
    this.hiddens = {}
    // FIXME

    /** this._threads */
    this.threads.clear();
    this.threadsPerSubject.clear();
    for (const [ppAhB64, ppMat, creationTime, _maybeOtherAgent] of Object.values(snapshot.pps)) {
      const ppAh = new ActionId(ppAhB64);
      const authorshipLog: [Timestamp, AgentId | null] = authorshipZvm.perspective.getAuthor(ppAh) != undefined
        ? authorshipZvm.perspective.getAuthor(ppAh)
        : [creationTime, cell.address.agentId];
      this.storeThread(cell, ppAh, dematerializeParticipationProtocol(ppMat), authorshipLog[0], authorshipLog[1], false);
    }

    /** this._beads */
    this.beads.clear();
    this.decBeads.clear();
    for (const [beadAhB64, beadInfo, typedBead] of Object.values(snapshot.beads)) {
      const beadAh = new ActionId(beadAhB64);
      const authorshipLog: [Timestamp, AgentId | null] = authorshipZvm.perspective.getAuthor(beadAh) != undefined
        ? authorshipZvm.perspective.getAuthor(beadAh)
        : [beadInfo.creationTime, beadInfo.author];
      beadInfo.creationTime = authorshipLog[0];
      if (authorshipLog[1]) {
        beadInfo.author = authorshipLog[1];
      }
      //this.storeTypedBead(beadAh, typedBead, beadInfo.beadType, authorshipLog[0], authorshipLog[1], true);
      this.storeTypedBead(beadAh, beadInfo, typedBead, true);
      // FIXME handle decBeads
    }
    console.log("importPerspective() beads", this.beads);


    /** this._emojiReactions */
    this.emojiReactions.clear();
    for (const [beadAhB64, pairs] of Object.values(snapshot.emojiReactions)) {
      const beadAh = new ActionId(beadAhB64);
      if (!this.emojiReactions.get(beadAh)) {
        this.emojiReactions.set(beadAh, new AgentIdMap());
      }
      for (const [agentB64, emojis] of pairs) {
        const agent = new AgentId(agentB64);
        this.emojiReactions.get(beadAh).set(agent, emojis);
      }
    }

    /** this._dmAgents */
    this.dmAgents.clear();
    // FIXME

    /** this._appletSubjectTypes */
    this.appletSubjectTypes.clear();
    for (const [appletId, dict] of Object.values(snapshot.appletSubjectTypes)) {
      const appletEh = new EntryId(appletId);
      if (!this.appletSubjectTypes.get(appletEh)) {
        this.appletSubjectTypes.set(appletEh, new EntryIdMap());
      }
      for (const [pathHash, subjectType] of Object.values(dict)) {
        this.appletSubjectTypes.get(appletEh).set(new EntryId(pathHash), subjectType);
      }
    }

    /** this._favorites */
    this.favorites = snapshot.favorites.map((b64) => new ActionId(b64))

    /** */
    this.globalProbeLogTs = 0;
    this.inbox.clear();
    this.notifSettings.clear();
    this.subjectsPerType.clear();
    // FIXME
  }

}



