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
  BeadType,
  dematerializeTypedBead, materializeBead,
  materializeParticipationProtocol,
  materializeSubject, materializeTypedBead,
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
  allAppletIds: EntryHashB64[],
  /** Store of all Subjects: hash -> Subject */
  allSubjects: [AnyLinkableHashB64, SubjectMat][],
  /** Store of all SemTopic: eh -> TopicTitle */
  allSemanticTopics: [EntryHashB64, string][],
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
export class ThreadsPerspectiveCore {
  /** */
  protected _allAppletIds: EntryId[] = [];
  /** Store of all Subjects: hash -> Subject */
  protected _allSubjects: AnyIdMap<SubjectMat> = new AnyIdMap();
  /** Store of all SemTopic: eh -> TopicTitle */
  protected _allSemanticTopics: EntryIdMap<string> = new EntryIdMap();
  /** Any hash -> isHidden */
  protected _hiddens: Dictionary<boolean> = {};
  /** ppAh -> Thread */
  protected _threads: ActionIdMap<Thread> = new ActionIdMap();
  /** beadAh -> [BeadInfo, TypedBead] */
  protected _beads: ActionIdMap<[BeadInfo, TypedBeadMat]> = new ActionIdMap();
  /** beadAh -> [agent, emoji][] */
  protected _emojiReactions: ActionIdMap<[AgentId, string][]> = new ActionIdMap();

  /** -- DM stuff  -- */
  /** agentId -> ppAh */
  protected _dmAgents: AgentIdMap<ActionId> = new AgentIdMap();
  /** encBeadAh -> [BeadInfo, TypedBead] */
  protected _decBeads: ActionIdMap<[BeadInfo, TypedBaseBeadMat]> = new ActionIdMap();

  /**  -- Applet threads  -- */

  /** AppletId -> PathEntryHash -> subjectType */
  protected _appletSubjectTypes: EntryIdMap<EntryIdMap<string>> = new EntryIdMap();

  /** -- Favorites -- */
  protected _favorites: ActionId[] = [];

  /** -- New / unread -- */
  protected _globalProbeLogTs: Timestamp = 0;

  /** -- Notification Inbox -- */
  /** linkAh -> [agent, beadAh] */
  //mentions: Dictionary<[AgentPubKeyB64, ActionHashB64]>,
  /** linkAh -> (ppAh, notif) */
  protected _inbox: ActionIdMap<[ActionId, ThreadsNotification]> = new ActionIdMap();
  /* ppAh -> (agent -> value) */
  protected _notifSettings: ActionIdMap<AgentIdMap<NotifySetting>> = new ActionIdMap();


  /** -- Getters -- */

  get globalProbeLogTs(): Timestamp { return this._globalProbeLogTs }

  getPpNotifSettings(ppAh: ActionId): AgentIdMap<NotifySetting> | undefined {return this._notifSettings.get(ppAh)}

  getNotifSetting(ppAh: ActionId, agent: AgentId): NotifySetting {
    const settings = this.getPpNotifSettings(ppAh);
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


  getThread(ah: ActionId): Thread | undefined {
    return this._threads.get(ah);
  }

  getAgentDm(agent: AgentId): ActionId | undefined {
    return this._dmAgents.get(agent)
  }

  getSubject(subjectHash: LinkableId): SubjectMat | undefined {
    return this._allSubjects.get(subjectHash.b64);
  }

  getSemanticTopic(eh: EntryId): string | undefined {
    return this._allSemanticTopics.get(eh);
  }

  getParticipationProtocol(ah: ActionId): ParticipationProtocolMat | undefined {
    const thread = this._threads.get(ah);
    if (!thread) {
      return undefined;
    }
    return thread.pp;
  }

  getAllPps(): ActionId[] { return Array.from(this._threads.keys()) }

  getAllSubjects(): [HoloHashB64, SubjectMat][] { return Array.from(this._allSubjects.entries()) }

  getAllNotifications(): [ActionId, [ActionId, ThreadsNotification]][] {return Array.from(this._inbox.entries())}


  getSubjectType(appletId: EntryId, pathHash: EntryId): string | undefined {
    const typesForDna = this._appletSubjectTypes.get(appletId);
    if (!typesForDna) {
      return undefined;
    }
    return typesForDna.get(pathHash);
  }

  getSubjectTypes(eh: EntryId): EntryIdMap<string> | undefined {
    return this._appletSubjectTypes.get(eh);
  }


  getEmojiReactions(beadAh: ActionId): [AgentId, string][] | undefined {
    return this._emojiReactions.get(beadAh);
  }

  getBeadInfo(beadAh: ActionId): BeadInfo | undefined {
    const maybeBead = this._beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    return maybeBead[0];
  }


  getBaseBeadInfo(beadAh: ActionId): BeadInfo | undefined {
    const maybeBead = this._beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    if (maybeBead[0].beadType != ThreadsEntryType.EncryptedBead) {
      return maybeBead[0];
    }
    const maybeDecBead = this._decBeads.get(beadAh);
    if (!maybeDecBead) {
      return undefined;
    }
    return maybeDecBead[0];
  }


  getBead(beadAh: ActionId): TypedBeadMat | undefined {
    const maybeBead = this._beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    return maybeBead[1];
  }


  getBaseBead(beadAh: ActionId): TypedBaseBeadMat | undefined {
    const maybeBead = this._beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    if (maybeBead[0].beadType != ThreadsEntryType.EncryptedBead) {
      return maybeBead[1] as TypedBaseBeadMat;
    }
    //console.log("getBaseBead()", beadAh);
    const maybeDecBead = this._decBeads.get(beadAh);
    if (!maybeDecBead) {
      return undefined;
    }
    return maybeDecBead[1];
  }


  /** */
  getMostRecentBeadsOnThread(ppAh: ActionId): [BeadInfo, TypedBead][] {
    const thread = this._threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getLast(10).map((bl) => bl.beadAh);
    let infos = [];
    for (const ah of beadAhs) {
      if (this._beads.get(ah)) {
        infos.push(this.getBaseBead(ah))
      }
    }
    //TODO: tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  getAllBeadsOnThread(ppAh: ActionId): [ActionId, BeadInfo, TypedBeadMat][] {
    const thread = this._threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getAll().map((bl) => bl.beadAh);
    let infos = [];
    for (const ah of beadAhs) {
      if (this._beads.get(ah)) {
        infos.push([ah, this.getBaseBeadInfo(ah), this.getBaseBead(ah)]);
      }
    }
    //TODO: tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  hasReachedBeginning(ppAh: ActionId): boolean {
    let thread = this._threads.get(ppAh);
    if (!thread) {
      return false;
    }
    return thread.hasSearchedOldestBead;
  }


  /** */
  getAllNotificationsForPp(argPpAh: ActionId): [ActionId, ThreadsNotification][] {
    console.log("getAllNotificationsForPp()", argPpAh, this._inbox);
    let result = [];
    for (const [linkAh, [ppAh, notif]] of this._inbox.entries()) {
      if (argPpAh.equals(ppAh)) {
        result.push([linkAh, notif]);
      }
    }
    return result;
  }


  /** */
  getLatestThread(): [ActionId, Thread] | undefined {
    let res = undefined;
    this._threads.forEach((thread, ah, _map) => {
      if (!res || thread.creationTime > res.creationTime) {
        res = [ah, thread];
      }
    });
    return res;
  }

}



/** Perspective fields that are built from the Core perspective. There is no exclusif data. */
export class ThreadsPerspective extends ThreadsPerspectiveCore {

  /** Store threads for queried/probed subjects: SubjectHash -> ProtocolAh */
  private _threadsPerSubject: AnyIdMap<ActionId[]> = new AnyIdMap();
  /** PathEntryHash -> subjectHash[] */
  private _subjectsPerType: EntryIdMap<[DnaId, LinkableId][]> = new EntryIdMap();
  /* name string -> ppAh */
  private _threadsByName: Dictionary<ActionId> = {};

  /** New == Found when doing probeAllLatest(), i.e. created since last GlobalProbeLog */
  /** A subject is new if a new thread has found for it and no older threads for this subject has been found */
  /* ppAh -> SubjectHash */
  private _newThreads: ActionIdMap<LinkableId> = new ActionIdMap();

  /** Unread subject == Has at least one unread thread */
  /** ppAh -> (subjectHash, beadAh[]) */
  private _unreadThreads: ActionIdMap<[LinkableId, ActionId[]]> = new ActionIdMap();// Unread thread == Has "new" beads


  /** -- Getters -- */

  get core(): ThreadsPerspectiveCore {
    return this;
  }

  getSubjects(pathHash: EntryId): [DnaId, LinkableId][] | undefined {
    return this._subjectsPerType.get(pathHash);
  }


  getPpByName(name: string): ActionId | undefined {
    return this._threadsByName[name];
  }

  getAllThreadsByName(): [string, ActionId][] {
    return Object.entries(this._threadsByName);
  }


  /** */
  getCommentThreadForSubject(subjectId: LinkableId): ActionId | null {
    const ppAhs = this._threadsPerSubject.get(subjectId.b64);
    if (!ppAhs) {
      return null;
    }
    for (const ppAh of ppAhs) {
      const thread = this._threads.get(ppAh);
      if (thread && thread.pp.purpose == "comment") {
        return ppAh;
      }
    }
    return null;
  }


  /** unreadSubjects: subject has at least one unread thread */
  getUnreadSubjects(): LinkableId[] {
    let unreadSubjects = Array.from(this._unreadThreads.values()).map(([subjectId, _beads]) => subjectId);
    /** Dedup */
    return [...new Set(unreadSubjects)];
  }


  /** Returns SubjectHash -> OldestNewThreadTs, i.e. creationTime of Subject */
  getNewSubjects(): AnyIdMap<Timestamp> {
    /** newSubjects: Store subject's oldest 'new' thread time for each new thread */
    const oldestNewThreadBySubject: AnyIdMap<Timestamp> = new AnyIdMap();
    for (const [ppAh, subjectId] of this._newThreads.entries()) {
      const thread = this._threads.get(ppAh);
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
      const pairs: [ActionId, Timestamp][] = this._threadsPerSubject.get(subjectHash).map((ppAh) => {
        const thread = this._threads.get(ppAh);
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
    let matchingTextBeads: [ActionId, BeadInfo, string][] = Array.from(this._beads.entries())
      .filter(([_beadAh, beadPair]) => beadPair[0].beadType == ThreadsEntryType.TextBead)
      .map(([beadAh, beadPair]) => [beadAh, beadPair[0], (beadPair[1] as TextBeadMat).value.toLowerCase()]);
    let decMatchingTextBeads: [ActionId, BeadInfo, string][] = Array.from(this._decBeads.entries())
      .filter(([_beadAh, beadPair]) => beadPair[0].beadType == ThreadsEntryType.TextBead)
      .map(([beadAh, beadPair]) => [beadAh, beadPair[0], (beadPair[1] as TextBeadMat).value.toLowerCase()]);
    matchingTextBeads = matchingTextBeads.concat(decMatchingTextBeads);

    /** filter applet */
    if (parameters.appletByName) {
      // TODO
    }
    /** filter thread */
    if (parameters.threadByName) {
      /** Bail if thread does not exist */
      const ppAh = this.getPpByName(parameters.threadByName);
      if (!ppAh) {
        return [];
      }
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.bead.ppAh.equals(ppAh));
    }
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

  /** -- Store -- */

  /* Store Bead in its Thread */
  private storeBeadInThread(beadAh: ActionId, ppAh: ActionId, creationTime: Timestamp, isNew: boolean, beadType: BeadType) {
    console.log("storeBeadInThread()", ppAh.short, beadType, beadAh.short, creationTime, this._threads.get(ppAh));
    const thread = this._threads.get(ppAh);
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
      if (!this._unreadThreads.get(ppAh)) {
        this._unreadThreads.set(ppAh, [thread.pp.subject.address, []]);
      }
      this._unreadThreads.get(ppAh)[1].push(beadAh);
    }
  }


  /** */
  storeNotification(notif: ThreadsNotification, ppAh: ActionId) {
    console.log("storeNotification()", notif.event, ppAh);
    this._inbox.set(notif.createLinkAh, [ppAh, notif]);
  }


  /** */
  unstoreNotification(linkAh: ActionId) {
    this._inbox.delete(linkAh); // = undefined;
  }


  /** */
  storeHidden(hash: LinkableId, isHidden: boolean) {
    this._hiddens[hash.b64] = isHidden;
  }


  /** */
  storeSemanticTopic(eh: EntryId, title: string): void {
    this._allSemanticTopics.set(eh, title);
  }
  /** */
  unstoreSemanticTopic(eh: EntryId): void {
    this._allSemanticTopics.delete(eh);
  }


  /** */
  storeNotifSetting(ppAh: ActionId, agent: AgentId, setting: NotifySetting): void {
    if (!this._notifSettings.get(ppAh)) {
      this._notifSettings.set(ppAh, new AgentIdMap());
    }
    this._notifSettings.get(ppAh).set(agent, setting);
  }


  /** */
  storeFavorite(beadAh: ActionId): void {
    if (this._favorites.map((ah) => ah.b64).includes(beadAh.b64)) {
      return;
    }
    this._favorites.push(beadAh);
  }
  /** */
  unstoreFavorite(beadAh: ActionId): void {
    if (!this._favorites.map((ah) => ah.b64).includes(beadAh.b64)) {
      return;
    }
    this._favorites = this._favorites.filter(item => item.b64 !== beadAh.b64);
  }


  /** */
  storeThread(cell: Cell, ppAh: ActionId, pp: ParticipationProtocol, creationTime: Timestamp, author: AgentId, isNew: boolean): ParticipationProtocolMat {
    console.log(`storeThread() thread "${ppAh.short}"`, author.short, pp);
    /** Return already stored PP */
    if (this._threads.has(ppAh)) {
      return this._threads.get(ppAh).pp;
    }
    let ppMat = materializeParticipationProtocol(pp);
    const thread = new Thread(ppMat, cell.dnaModifiers.origin_time, creationTime, author);
    console.log(`storeThread() thread "${ppAh.short}" for subject "${ppMat.subject.address.short}"| creationTime: ${creationTime}"`);
    this._threads.set(ppAh, thread);
    /** Add already stored beads */
    for (const [beadAh, [info, _typed]] of this._beads.entries()) {
      if (info.bead.ppAh.equals(ppAh)) {
        this.storeBeadInThread(beadAh, ppAh, info.creationTime, false, info.beadType);
      }
    }
    if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
      /** DM thread */
      const agentId = AgentId.from(ppMat.subject.address);
      let otherAgent = cell.agentId.equals(author)? agentId : author;
      console.log("storeThread() dmThread", otherAgent);
      this._dmAgents.set(otherAgent, ppAh);
    } else {
      /** isNew */
      if (isNew) {
        this._newThreads.set(ppAh, ppMat.subject.address);
      }
      /** threadsPerSubject */
      if (!this._threadsPerSubject.get(ppMat.subject.address.b64)) {
        this._threadsPerSubject.set(ppMat.subject.address.b64, []);
      }
      this._threadsPerSubject.get(ppMat.subject.address.b64).push(ppAh);

      /** All Subjects */
      if (!this._allSubjects.get(ppMat.subject.address.b64)) {
        this._allSubjects.set(ppMat.subject.address.b64, materializeSubject(pp.subject));
      }
    }
    //console.log("storePp()", ppMat.subjectHash, ppAh)
    /** Done */
    return ppMat;
  }


  /** */
  hasEmojiReaction(beadAh: ActionId, agent: AgentId, emoji: string): boolean {
    if (!this._emojiReactions.get(beadAh)) {
      return false;
    }
    /** Look for pair */
    const maybeAlready = Object.values(this._emojiReactions.get(beadAh)).find(([a, e]) => (agent.equals(a) && e == emoji));
    return maybeAlready && maybeAlready.length > 0;
  }


  /** */
  storeEmojiReaction(beadAh: ActionId, agent: AgentId, emoji: string) {
    console.debug("storeEmojiReaction()", emoji, beadAh.short, agent.short);
    if (this.hasEmojiReaction(beadAh, agent, emoji)) {
      return;
    }
    if (!this._emojiReactions.get(beadAh)) {
      this._emojiReactions.set(beadAh, []);
    }
    this._emojiReactions.get(beadAh).push([agent, emoji]);
  }


  /** */
  unstoreEmojiReaction(beadAh: ActionId, agent: AgentId, emoji: string) {
    console.debug("unstoreEmojiReaction()", emoji, beadAh.short, agent.short);
    if (!this._emojiReactions.get(beadAh)) {
      //this._emojiReactions[beadAh] = [];
      return;
    }
    const filtered = this._emojiReactions.get(beadAh).filter(([a, e]) => !(agent.equals(a) && e == emoji));
    if (filtered.length < this._emojiReactions.get(beadAh).length) {
      this._emojiReactions.set(beadAh, filtered);
      if (this._emojiReactions.get(beadAh).length == 0) {
        this._emojiReactions.delete(beadAh);
      }
    }
  }


  /** */
  storeGlobalLog(latestGlobalLogTime: Timestamp) {
    this._globalProbeLogTs = latestGlobalLogTime;
    this._unreadThreads.clear();
    this._newThreads.clear();
  }


  /** */
  storeThreadLog(log: ThreadLastProbeLog) {
    const ppAh = new ActionId(log.ppAh);
    const thread = this._threads.get(ppAh);
    if (!thread) {
      console.warn("Getting ThreadLastProbeLog for unknown thread", ppAh);
      return;
    }
    thread.setLatestProbeLogTime(log.ts);
    this._unreadThreads.delete(ppAh);
  }


  /** */
  storeAllAppletIds(ehs: EntryId[]) {
    this._allAppletIds = ehs;
  }

  storeAllSubjects(list: Subject[]) {
    this._allSubjects.clear();
    for (const subject of list) {
      const subjectMat = materializeSubject(subject);
      this._allSubjects.set(subjectMat.address.b64, subjectMat);
    }
  }



  /** -- Memento -- */

  /** TODO: deep copy */
  makeSnapshot(originalsZvm: AuthorshipZvm): ThreadsSnapshot {
    /** allSubjects */
    const allSubjects: [AnyLinkableHashB64, SubjectMat][] = [];
    Array.from(this._allSubjects.entries()).map(([subjectAhB64, subject]) => {
      originalsZvm.ascribeTarget("Subject", intoLinkableId(subjectAhB64), 0/*TODO: get creationTime of Subject*/, null, true);
      allSubjects.push([subjectAhB64, subject]);
    });

    /** pps */
    const pps: Array<[ActionHashB64, ParticipationProtocolMat, Timestamp, AgentPubKeyB64]> = new Array();
    Array.from(this._threads.entries()).map(([ppAh, thread]) => {
      originalsZvm.ascribeTarget(ThreadsEntryType.ParticipationProtocol, ppAh, thread.creationTime, thread.author, true);
      pps.push([ppAh.b64, thread.pp, thread.creationTime, ""]);
    });

    /** beads */
    //console.log("exportPerspective() beads", this._beads);
    //const beads: Dictionary<[BeadInfo, TypedBeadMat]> = {};
    Array.from(this._beads.entries()).map(([beadAh, [beadInfo, _typed]]) => {
      //beads[beadAh] = (typed, beadInfo.beadType); // TODO: Optimize to not store twice core bead info.
      originalsZvm.ascribeTarget(beadInfo.beadType, beadAh, beadInfo.creationTime, beadInfo.author, true);
    });


    /** subject types */
    const appletSubjectTypes = [];
    for (const [appletEh, map] of this._appletSubjectTypes.entries()) {
      const types = Array.from(map.entries()).map(([pathEh, type]) => [pathEh.b64, type]);
      appletSubjectTypes.push(appletEh.b64, types);
    }

    /** emojis */
    const emojiReactions = [];
    for (const [beadAh, pairs] of this._emojiReactions.entries()) {
      for (const [agent, emoji] of pairs) {
        emojiReactions.push([beadAh.b64, agent.b64, [emoji]]);
      }
    }

    /** -- Done -- */
    return {
      allSemanticTopics: Array.from(this._allSemanticTopics.entries()).map(([topicEh, title]) => [topicEh.b64, title]),
      allAppletIds: this._allAppletIds.map((id) => id.b64),
      allSubjects,
      appletSubjectTypes,
      pps,
      beads: Array.from(this._beads.entries()).map(([beadAh, [beadInfo, typed]]) => [beadAh.b64, beadInfo, typed]),
      emojiReactions,
      hiddens: Object.entries(this._hiddens).filter(([_hash, isHidden]) => isHidden).map(([hash, isHidden]) => hash),
      favorites: this._favorites.map((id) => id.b64),
    };
  }


  /** */
  restore(snapshot: ThreadsSnapshot) {
    /** Clear */
    // FIXME
    /** Store */
    // FIXME
  }

}



