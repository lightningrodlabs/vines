import {ActionHash, AgentPubKey, Timestamp} from "@holochain/client";
import {
  AddEntryAsBeadInput,
  AnyBead,
  BaseBeadKind,
  Bead,
  BeadLink,
  CommitGlobalLogInput,
  DM_SUBJECT_TYPE_NAME,
  EncryptedBead,
  EntryBead,
  GlobalLastProbeLog,
  NotifyPeerInput,
  NotifySetting,
  ParticipationProtocol,
  SemanticTopic,
  SetNotifySettingInput,
  Subject,
  TextBead,
  ThreadLastProbeLog,
  ThreadsEntryType,
} from "../bindings/threads.types";
import {ThreadsProxy} from "../bindings/threads.proxy";
import {
  ActionId,
  AgentId,
  AgentIdMap,
  Dictionary,
  EntryId,
  EntryIdMap,
  DnaId,
  StateChangeType,
  TipProtocol,
  ZomeViewModelWithSignals,
  ActionIdMap,
  intoLinkableId,
  ZomeSignalProtocol,
  LinkPulseMat,
  EntryPulseMat,
  TipProtocolVariantEntry,
  dematerializeEntryPulse,
  LinkableId,
  enc64,
  getIndexByVariant,
  getVariantByIndex, TipProtocolVariantLink, dematerializeLinkPulse, EntryPulse, anyToB64
} from "@ddd-qc/lit-happ";
import {
  base2typed,
  BaseBeadType,
  BeadInfo,
  BeadLinkMaterialized,
  BeadType, createThreadsPerspective,
  dematerializeEntryBead,
  dematerializeParticipationProtocol,
  dematerializeTypedBead,
  EncryptedBeadContent,
  EntryBeadMat,
  materializeBead,
  materializeParticipationProtocol,
  materializeSubject,
  materializeTypedBead, NotifiableEvent, NotificationTipBeadData, NotificationTipPpData,
  ParticipationProtocolMat,
  SubjectMat,
  TextBeadMat,
  ThreadsNotification, ThreadsNotificationTip,
  ThreadsPerspective, ThreadsPerspectiveSnapshot,
  TypedBaseBead,
  TypedBaseBeadMat,
  TypedBead,
  TypedBeadMat,
  TypedContent,
} from "./threads.perspective";
import {Thread} from "./thread";
import {TimeInterval} from "./timeInterval";
import {WAL, weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {prettyTimestamp} from "@ddd-qc/files";
import {decode, encode} from "@msgpack/msgpack";
import {AnyIdMap, parseMentions} from "../utils";
import {SearchParameters} from "../search";
import {AuthorshipZvm} from "./authorship.zvm";
import {ThreadsLinkType, ThreadsUnitEnum} from "../bindings/threads.integrity";
import {SpecialSubjectType} from "../events";


//generateSearchTest();


/**
 *
 */
export class ThreadsZvm extends ZomeViewModelWithSignals {

  static readonly ZOME_PROXY = ThreadsProxy;
  get zomeProxy(): ThreadsProxy {return this._zomeProxy as ThreadsProxy;}



  /** -- Perspective -- */

  private _perspective: ThreadsPerspective = createThreadsPerspective();

  /* */
  get perspective(): ThreadsPerspective {
    return this._perspective;
  }

  /* */
  protected hasChanged(): boolean {
    if (!this._previousPerspective) {
      return true;
    }
    let hasChanged = true; // TODO
    return hasChanged;
  }


  /** Notify subscribers */
  /** TODO: structuredClone() fails because of Thread class. Refactor to a state object instead */
  protected notifySubscribers(): boolean {
    if (!this.hasChanged()) return false;
    //this._previousPerspective = structuredClone(this.perspective);
    this._previousPerspective = this.perspective;
    for (const [host, propName] of this._providedHosts) {
      (host as any)[propName] = this._previousPerspective;
    }
    this._dvmParent.zvmChanged(this);
    return true;
  }



  /** -- Get: Return stored element(s) -- */

  getPpNotifSettings(ppAh: ActionId): AgentIdMap<NotifySetting> | undefined {return this._perspective.notifSettings.get(ppAh)}

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


  getSubject(subjectHash: LinkableId): SubjectMat | undefined {
    return this._perspective.allSubjects.get(subjectHash.b64);
  }

  getSemanticTopic(eh: EntryId): string | undefined {
    return this._perspective.allSemanticTopics.get(eh);
  }

  getParticipationProtocol(ah: ActionId): ParticipationProtocolMat | undefined {
    const thread = this._perspective.threads.get(ah);
    if (!thread) {
      return undefined;
    }
    return thread.pp;
  }


  getSubjectType(appletId: EntryId, pathHash: EntryId): string | undefined {
    const typesForDna = this._perspective.appletSubjectTypes.get(appletId);
    if (!typesForDna) {
      return undefined;
    }
    return typesForDna.get(pathHash);
  }

  getSubjectTypes(eh: EntryId): EntryIdMap<string> | undefined {
    return this._perspective.appletSubjectTypes.get(eh);
  }

  getSubjects(pathHash: EntryId): [DnaId, LinkableId][] | undefined {
    return this._perspective.subjectsPerType.get(pathHash);
  }

  getEmojiReactions(beadAh: ActionId): [AgentId, string][] | undefined {
    return this._perspective.emojiReactions.get(beadAh);
  }

  getBeadInfo(beadAh: ActionId): BeadInfo | undefined {
    const maybeBead = this._perspective.beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    return maybeBead[0];
  }


  getBaseBeadInfo(beadAh: ActionId): BeadInfo | undefined {
    const maybeBead = this._perspective.beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    if (maybeBead[0].beadType != ThreadsEntryType.EncryptedBead) {
      return maybeBead[0];
    }
    const maybeDecBead = this._perspective.decBeads.get(beadAh);
    if (!maybeDecBead) {
      return undefined;
    }
    return maybeDecBead[0];
  }


  getBead(beadAh: ActionId): TypedBeadMat | undefined {
    const maybeBead = this._perspective.beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    return maybeBead[1];
  }


  getBaseBead(beadAh: ActionId): TypedBaseBeadMat | undefined {
    const maybeBead = this._perspective.beads.get(beadAh);
    if (!maybeBead) {
      return undefined;
    }
    if (maybeBead[0].beadType != ThreadsEntryType.EncryptedBead) {
      return maybeBead[1] as TypedBaseBeadMat;
    }
    //console.log("getBaseBead()", beadAh);
    const maybeDecBead = this._perspective.decBeads.get(beadAh);
    if (!maybeDecBead) {
      return undefined;
    }
    return maybeDecBead[1];
  }


  /** */
  getMostRecentBeadsOnThread(ppAh: ActionId): [BeadInfo, TypedBead][] {
    const thread = this._perspective.threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getLast(10).map((bl) => bl.beadAh);
    let infos = [];
    for (const ah of beadAhs) {
      if (this._perspective.beads.get(ah)) {
        infos.push(this.getBaseBead(ah))
      }
    }
    //TODO: tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  getAllBeadsOnThread(ppAh: ActionId): [ActionId, BeadInfo, TypedBeadMat][] {
    const thread = this._perspective.threads.get(ppAh);
    if (!thread) {
      return [];
    }
    const beadAhs = thread.getAll().map((bl) => bl.beadAh);
    let infos = [];
    for (const ah of beadAhs) {
      if (this._perspective.beads.get(ah)) {
        infos.push([ah, this.getBaseBeadInfo(ah), this.getBaseBead(ah)]);
      }
    }
    //TODO: tuples.sort((a, b) => {return 1})
    return infos;
  }


  /** */
  hasReachedBeginning(ppAh: ActionId): boolean {
    let thread = this._perspective.threads.get(ppAh);
    if (!thread) {
        return false;
    }
    return thread.hasSearchedOldestBead;
  }


  /** */
  getCommentThreadForSubject(subjectId: LinkableId): ActionId | null {
    const ppAhs = this._perspective.threadsPerSubject.get(subjectId.b64);
    if (!ppAhs) {
      return null;
    }
    for (const ppAh of ppAhs) {
      const thread = this._perspective.threads.get(ppAh);
      if (thread && thread.pp.purpose == "comment") {
        return ppAh;
      }
    }
    return null;
  }


  /** */
  getAllNotificationsForPp(argPpAh: ActionId): [ActionId, ThreadsNotification][] {
    let result = [];
    for (const [linkAh, [ppAh, notif]] of Array.from(this._perspective.inbox.entries())) {
      if (argPpAh.equals(ppAh)) {
        result.push([linkAh, notif]);
      }
    }
    return result;
  }


  /** */
  getLatestThread(): [ActionId, Thread] | undefined {
    let res = undefined;
    this._perspective.threads.forEach((thread, ah, _map) => {
      if (!res || thread.creationTime > res.creationTime) {
        res = [ah, thread];
      }
    });
    return res;
  }


  /** unreadSubjects: subject has at least one unread thread */
  getUnreadSubjects(): LinkableId[] {
    let unreadSubjects = Array.from(this._perspective.unreadThreads.values()).map(([subjectId, _beads]) => subjectId);
    /** Dedup */
    return [...new Set(unreadSubjects)];
  }


  /** Returns SubjectHash -> OldestNewThreadTs, i.e. creationTime of Subject */
  getNewSubjects(): AnyIdMap<Timestamp> {
    /** newSubjects: Store subject's oldest 'new' thread time for each new thread */
    const oldestNewThreadBySubject: AnyIdMap<Timestamp> = new AnyIdMap();
    for (const [ppAh, subjectId] of this._perspective.newThreads.entries()) {
      const thread = this._perspective.threads.get(ppAh);
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
      const pairs: [ActionId, Timestamp][] = this._perspective.threadsPerSubject.get(subjectHash).map((ppAh) => {
        const thread = this._perspective.threads.get(ppAh);
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


  /** -- Search -- */


  // /** search Threads */
  // const matchingThreadPurposes = Object.entries(this._threads)
  //   .filter(([_ppAh, thread]) => thread.pp.purpose.toLowerCase().includes(searchLC))
  //   .map(([ppAh, thread]) => thread);



  // beadText(info: BeadInfo, typed: TypedBead): string {
  //   switch (info.beadType) {
  //     case ThreadsEntryType.TextBead: return (typed as TextBead).value; break;
  //     case ThreadsEntryType.EntryBead: return (typed as EntryBead); break;
  //     case ThreadsEntryType.AnyBead: return (typed as AnyBead).value; break;
  //   }
  //   throw Error("Unknown beadType", info.beadType);
  // }


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
    let matchingTextBeads: [ActionId, BeadInfo, string][] = Array.from(this._perspective.beads.entries())
      .filter(([_beadAh, beadPair]) => beadPair[0].beadType == ThreadsEntryType.TextBead)
      .map(([beadAh, beadPair]) => [beadAh, beadPair[0], (beadPair[1] as TextBeadMat).value.toLowerCase()]);
    let decMatchingTextBeads: [ActionId, BeadInfo, string][] = Array.from(this._perspective.decBeads.entries())
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
      if (!this._perspective.threadsByName[parameters.threadByName]) {
        return [];
      }
      const ppAh = this._perspective.threadsByName[parameters.threadByName]
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.bead.ppAh == ppAh);
    }
    /** filter author */
    if (parameters.author) {
      matchingTextBeads = matchingTextBeads.filter(([_beadAh, beadInfo, _textLC]) => beadInfo.author == parameters.author) //
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


  /** TODO */
  async searchAndProbe(parameters: SearchParameters, limit: number): Promise<[ActionId, BeadInfo, string][]> {
    console.log("searchAndProbe()", parameters);
    let result: [ActionId, BeadInfo, string][] = [];

    /** Maybe initial search is enough */
    const initialResult = this.searchTextBeads(parameters);
    if (initialResult.length > limit) {
      return initialResult;
    }

    /** Full probe thread if possible */
    if (parameters.threadByName && this._perspective.threadsByName[parameters.threadByName]) {
      const ppAh = this._perspective.threadsByName[parameters.threadByName];
      await this.pullAllBeads(ppAh)
      result = this.searchTextBeads(parameters);
    } else {
      // TODO: progressive timeframe search
      /** Get beads on all threads within timeframe */
      for (const ppAh of this._perspective.threads.keys()) {
        await this.pullLatestBeads(ppAh, parameters.afterTs, parameters.beforeTs, limit);
      }
      result = this.searchTextBeads(parameters);
    }
    /** */
    return result;
  }


  /** -- Init -- */

  /** Query all entries from local source-chain */
  async initializePerspectiveOffline(): Promise<void> {
    console.log("threadsZvm.initializePerspectiveOffline() START");
    await this.zomeProxy.queryAll();
    console.log("threadsZvm.initializePerspectiveOffline() END");
  }


  /** */
  async initializePerspectiveOnline(): Promise<void> {
    console.log("threadsZvm.initializePerspectiveOnline() START");
    await this.zomeProxy.probeAllHiddens();
    await this.zomeProxy.pullAllSemanticTopics();
    await this.pullAppletIds();
    await this.pullAllSubjects();
    await this.zomeProxy.probeDmThreads();
    console.log("threadsZvm.initializePerspectiveOnline() END");
  }


  /** */
  probeAllInner() {
    this.probeAllInnerAsync();
  }


  /** */
  async probeAllInnerAsync() {
    console.log("threadsZvm.probeAllInner()", this._perspective.allSubjects.size)
    await this.initializePerspectiveOnline();
    /** Grab all threads of other subjects to see if there are new ones */
    let probes = []
    for (const subjectAdr of this._perspective.allSubjects.keys()) {
      probes.push(this.pullSubjectThreads(intoLinkableId(subjectAdr)));
    }
    await Promise.all(probes);

    /** Get last elements since last time (global probe log) */
    await this.probeAllLatest();
    await this.probeInbox();
    await this.pullFavorites();
  }


  /** */
  async probeInbox() {
    this._perspective.inbox.clear();
    await this.zomeProxy.probeInbox();
  }


  /** -- Probe: Query the DHT, and store the results (async) -- */

  /** */
  async pullAppletIds(): Promise<EntryId[]> {
    console.log("threadsZvm.probeAllAppletIds()")
    // const appletIds = await this.zomeProxy.getApplets();
    // this._allAppletIds = appletIds.map((eh) => encodeHashToBase64(eh));
    const entryB64s = await this.zomeProxy.pullApplets();
    this._perspective.allAppletIds = entryB64s.map((b64) => new EntryId(b64));
    console.log("threadsZvm.probeAllAppletIds() res", this._perspective.allAppletIds);
    this.notifySubscribers();
    return this._perspective.allAppletIds;
  }


  /** Get all Subjects from the RootAnchor */
  async pullAllSubjects(): Promise<AnyIdMap<SubjectMat>> {
    const subjects = await this.zomeProxy.pullAllSubjects();
    for (const subject of subjects) {
      const subjectMat = materializeSubject(subject);
      this._perspective.allSubjects.set(subjectMat.address.b64, subjectMat);
    }
    console.log("threadsZvm.pullAllSubjects()", this._perspective.allSubjects.size);
    this.notifySubscribers();
    return this._perspective.allSubjects;
  }

  // TODO: probeDnaSubjects()
  // TODO: probeEntryTypeSubjects()


  /** Get all Threads for a subject */
  async pullSubjectThreads(subjectId: LinkableId): Promise<ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]>> {
    console.log("threadsZvm.pullSubjectThreads()", subjectId);
    let res: ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]> = new ActionIdMap();
    const pps = await this.zomeProxy.probePpsFromSubjectHash(subjectId.hash);
    for (const [pp_ah, _linkTs] of pps) {
      const ppAh = new ActionId(pp_ah);
      const [pp, ts, author] = await this.zomeProxy.fetchPp(pp_ah);
      //this.storeThread(ppAh, pp, ts, encodeHashToBase64(author), false, false);
      res.set(ppAh, [pp, ts, new AgentId(author)]);
    }
    return res;
  }


  /** Get all SubjectTypes for a AppletId */
  async pullAppletSubjectTypes(appletId: EntryId): Promise<EntryIdMap<string>> {
    //const appletHash = decodeHashFromBase64(appletId);
    let subjectTypesRaw = await this.zomeProxy.findSubjectTypesForApplet(appletId.b64);
    let subjectTypes: EntryIdMap<string> = new EntryIdMap();
    console.log("pullAppletSubjectTypes()", subjectTypes);
    for (const [subjectType, pathHash] of subjectTypesRaw) {
      subjectTypes.set(new EntryId(pathHash), subjectType);
    }
    this._perspective.appletSubjectTypes.set(appletId, subjectTypes);
    this.notifySubscribers();
    return subjectTypes;
  }


  /** Get all subjects from a subjectType path */
  async findSubjects(appletId: EntryId, typePathHash: EntryId): Promise<[DnaId, LinkableId][]> {
    const maybeSubjectTypes = this._perspective.appletSubjectTypes.get(appletId)
    if (!maybeSubjectTypes || !maybeSubjectTypes.has(typePathHash)) {
      return Promise.reject("Unknown appletId or typePathHash");
    }
    const subjectType = this.getSubjectType(appletId, typePathHash);
    const subjects = await this.zomeProxy.findSubjectsByType({appletId: appletId.b64, subjectType});
    const subjectB64s: [DnaId, LinkableId][] = subjects.map(([dnaHash, subjectHash]) => [new DnaId(dnaHash), intoLinkableId(subjectHash)]);
    this._perspective.subjectsPerType.set(typePathHash, subjectB64s);
    this.notifySubscribers();
    return subjectB64s;
  }


  /** */
  async probeAllLatest(): Promise<void> {
    const latest = await this.zomeProxy.probeAllLatest(this._perspective.globalProbeLogTs);
    await this.commitGlobalProbeLog(latest.searchedInterval.end);

    /* newThreads (filter out my threads) */
    const newThreads: ActionIdMap<LinkableId> = new ActionIdMap();
    for (const [subject_hash, pp_ah] of latest.newThreadsBySubject) {
      const ppAh = new ActionId(pp_ah)
      //const _ppMat = await this.fetchPp(ppAh);
      let maybeThread = this._perspective.threads.get(ppAh);
      if (!maybeThread.author.equals(this.cell.agentId)) {
        newThreads.set(ppAh, intoLinkableId(subject_hash));
      }
    }
    //console.log("probeAllLatest:     newThreads", newThreads);
    this._perspective.newThreads = newThreads;

    /* unreadThreads: Map new beads to their threads */
    let unreadThreads: ActionIdMap<[LinkableId, ActionId[]]> = new ActionIdMap();
    latest.newBeadsByThread.map(async ([pp_ah, bl]) => {
      const ppAh =  new ActionId(pp_ah);
      let maybeThread = this._perspective.threads.get(ppAh);
      if (!maybeThread) {
        ///* _ppMat = */ await this.fetchPp(ppAh);
        maybeThread = this._perspective.threads.get(ppAh);
        if (!maybeThread) {
          console.warn("Thread not found", ppAh);
          return;
        }
      }
      if (bl.creationTime <= maybeThread.latestProbeLogTime ||
          enc64(bl.author) == this.cell.agentId.b64) {
        return;
      }
      const subjectHash = maybeThread.pp.subject.address
      if (!unreadThreads.get(ppAh)) {
        unreadThreads.set(ppAh, [subjectHash, []]);
      }
      unreadThreads.get(ppAh)[1].push(new ActionId(bl.beadAh));
    });
    console.log("threadsZvm.probeAllLatest() unreadThreads done", JSON.stringify(unreadThreads));
    this._perspective.unreadThreads = unreadThreads;

    /** Done */
    this.notifySubscribers();
  }


  /**  */
  async pullNotifSettings(ppAh: ActionId): Promise<[AgentId, NotifySetting, ActionId][]> {
    this._perspective.notifSettings.delete(ppAh);
    const notifSettings = await this.zomeProxy.pullPpNotifySettings(ppAh.hash);
    return notifSettings.map(([a, n, c]) => [new AgentId(a), n, new ActionId(c)]);
  }


  /**  */
  async pullFavorites() {
    const favorites = await this.zomeProxy.probeMyFavorites();
    this._perspective.favorites = [];
    for (const fav_ah of favorites) {
      const beadAh = new ActionId(fav_ah);
      //this._favorites.push(beadAh);
      await this.fetchUnknownBead(beadAh);
    }
  }


  /** Probe all emojis on this bead */
  async pullEmojiReactions(beadAh: ActionId) {
    //console.log("probeEmojiReactions()", beadAh);
    this._perspective.emojiReactions.set(beadAh, []);
    await this.zomeProxy.pullReactions(beadAh.hash);
    // let prevReactions = this._emojiReactions[beadAh];
    // if (!prevReactions) prevReactions = [];
    // const reactions: [AgentPubKeyB64, string][] = (await this.zomeProxy.getReactions(decodeHashFromBase64(beadAh)))
    //   .map(([key, emoji]) => [encodeHashToBase64(key), emoji]);
    // const notEqual = JSON.stringify(prevReactions) !== JSON.stringify(reactions);
    // //console.log("probeEmojiReactions() count", reactions.length, notEqual);
    // if (notEqual) {
    //   this._emojiReactions[beadAh] = reactions;
    //   this.notifySubscribers();
    // }
  }


  /** Get all beads from a thread */
  async pullAllBeads(ppAh: ActionId): Promise<BeadLink[]> {
    console.log("pullAllBeads()", ppAh)
    const thread = this._perspective.threads.get(ppAh);
    if (!thread) {
      console.warn("pullAllBeads() Failed. Unknown thread:", ppAh);
      return [];
    }
    /** Probe */
    const [interval, beadLinks] = await this.zomeProxy.findBeads(ppAh.hash);
    console.log("pullAllBeads()", TimeInterval.new(interval).toStringSec(), beadLinks)
    /** Fetch */
    await this.fetchBeads(ppAh, beadLinks, TimeInterval.new(interval));
    thread.setHasSearchedOldestBead();
    console.log("setSearchedOldestBead for", ppAh, thread.hasSearchedOldestBead);
    /** Done */
    return beadLinks;
  }


  /** Get all beads from "now" and back until `limit` is reached or `startTime` is reached */
  async pullLatestBeads(ppAh: ActionId, begin_time?: Timestamp, end_time?: Timestamp, target_limit?: number): Promise<BeadLink[]> {
    console.log("pullLatestBeads()", ppAh);
    let thread = this._perspective.threads.get(ppAh);
    if (!thread) {
      // try {
      //   await this.fetchPp(ppAh);
      // } catch(e) {
        console.error("pullLatestBeads() Failed. ParticipationProtocol not found");
        return [];
      //}
      //thread = this._threads.get(ppAh);
    }
    /** Probe the latest beads */
    const [searchedInterval, beadLinks] = await this.zomeProxy.findLatestBeads({
      pp_ah: ppAh.hash, begin_time, end_time, target_limit
    });
    /** Cache them */
    await this.fetchBeads(ppAh, beadLinks, TimeInterval.new(searchedInterval));
    /** Check if beginning of time reached */
    console.log("pullLatestBeads() begin", searchedInterval.begin, thread.creationTime);
    if (searchedInterval.begin <= thread.creationTime) {
      thread.setHasSearchedOldestBead();
    }
    /** Done */
    return beadLinks;
  }


  /** Try to get older beads from the currently known oldest bead of a thread */
  async probePreviousBeads(ppAh: ActionId, limit: number): Promise<BeadLink[]> {
    // if (this.reachedBeginning(ppAh)) {
    //   return [];
    // }
    const thread = this._perspective.threads.get(ppAh);
    console.log("probePreviousBeads", ppAh, thread);
    if (!thread) {
      return Promise.reject("No Thread data found for given ParticipationProtocol");
    }
    // const oldestTime = thread.beadLinksTree.begin.key;
    const oldestTime = thread.probedUnion? thread.probedUnion.begin : undefined;
    const endTime = oldestTime? oldestTime : Date.now() * 1000;
    return this.pullLatestBeads(ppAh, undefined, endTime, limit);
  }


  /** */
  async createNextBead(ppAh: ActionId, prevBeadAh?: ActionId): Promise<Bead> {
    console.log("createNextBead()", ppAh, prevBeadAh);
    /** Figure out last known bead for this thread */
    let thread = this._perspective.threads.get(ppAh);
    if (!thread) {
      // await this.fetchPp(ppAh);
      // thread = this._threads.get(ppAh);
      if (!thread) {
        return Promise.reject("Unknown thread: " + ppAh);
      }
    }
    if (!prevBeadAh) {
      const lastKnownBeadOnThread = thread.getLast(1);
      if (lastKnownBeadOnThread && lastKnownBeadOnThread.length > 0) {
        prevBeadAh = lastKnownBeadOnThread[0].beadAh;
      }
      if (!prevBeadAh) {
        prevBeadAh = ppAh;
      }
    }
    /** Make bead */
    const bead: Bead = {
      ppAh: ppAh.hash,
      prevBeadAh: prevBeadAh.hash,
    }
    //console.log("createNextBead() bead", prevKnownBeadAh? encodeHashToBase64(prevKnownBeadAh): undefined, ppAh);
    return bead;
  }


  /** -- Publish: Commit to source-chain (and possibly the DHT) and store it (async because the commit could fail) -- */

  /** */
  async publishTypedBead(type: BeadType, content: TypedContent | EncryptedBeadContent, ppAh: ActionId, author?: AgentId, prevBead?: ActionId) : Promise<[ActionId, string, number, TypedBead]> {
    const creation_time = Date.now() * 1000;
    const nextBead = await this.createNextBead(ppAh, prevBead);
    const beadAuthor = author? author : this.cell.agentId;
    const [ah, global_time_anchor, tm] = await this.publishTypedBeadAt(type, content, nextBead, creation_time, beadAuthor);
    return [ah, global_time_anchor, creation_time, tm];
  }


  /** */
  async publishTypedBeadAt(
    beadTypeEx: BeadType | "EntryBeadImport",
    content: TypedContent | EntryBeadMat | EncryptedBeadContent,
    nextBead: Bead,
    creationTime: Timestamp,
    author: AgentId)
    : Promise<[ActionId, string, TypedBead]>
  {
    //const ppAh = new ActionId(nextBead.ppAh);
    /** Commit Entry (& notify peers) */
    let typed: TypedBead;
    let global_time_anchor: string;
    let bucket_ts: Timestamp;
    let bead_ah: ActionHash;
    switch (beadTypeEx) {
      case ThreadsEntryType.TextBead:
        typed = {value: content as string, bead: nextBead} as TextBead;
        [bead_ah, global_time_anchor] = await this.zomeProxy.publishTextBeadAt({textBead: typed, creationTime});
        break;
      case ThreadsEntryType.EntryBead: {
        const input: AddEntryAsBeadInput = {
          eh: (content as EntryId).hash,
          bead: nextBead,
          zomeName: "zFiles", // FilesProxy.DEFAULT_ZOME_NAME,
          roleName: "rFiles", // FILES_CELL_NAME
          originalCreationTime: creationTime,
          originalAuthor: author.hash,
        };
        [bead_ah, typed, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEntryAsBead(input);
      }
      break;
      case "EntryBeadImport":
        const entryBead: EntryBead = dematerializeEntryBead(content as EntryBeadMat);
        entryBead.bead = nextBead;
        beadTypeEx = ThreadsEntryType.EntryBead;
        [bead_ah, typed, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEntryBead({entryBead, creationTime});
        break;
      case ThreadsEntryType.AnyBead:
        //const encHrl = encodeHrl(content as Hrl);
        const wurl = weaveUrlFromWal(content as WAL);
        const anyBead: AnyBead = {
          bead: nextBead,
          value: wurl,
          typeInfo: "wal",
        } as AnyBead;
        console.log("publishHrlBeadAt()", wurl, anyBead);
        [bead_ah, global_time_anchor, bucket_ts] = await this.zomeProxy.publishAnyBead({anyBead, creationTime});
        typed = anyBead;
        break;
      case ThreadsEntryType.EncryptedBead:
        const encContent = content as EncryptedBeadContent;
        beadTypeEx = ThreadsEntryType.EncryptedBead;
        typed = encContent.encBead;
        [bead_ah, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEncBead({encBead: encContent.encBead, otherAgent: encContent.otherAgent.hash, creationTime});
        break;
    }
    const beadId = new ActionId(bead_ah);
    /** Insert in ThreadInfo */
    console.log("publishTypedBeadAt() added bead", beadId.short, creationTime);
    /** Done */
    return [beadId, global_time_anchor, typed];
  }


  /** */
  async publishNotifSetting(ppAh: ActionId, setting: NotifySetting, agent?: AgentId) : Promise<void> {
    if (!ppAh) {
      return;
    }
    if (!agent) {
      agent = this.cell.agentId;
    }
    const _maybe_link_ah = await this.zomeProxy.publishNotifySetting({
      pp_ah: ppAh.hash,
      setting,
      agent: agent.hash,
    } as SetNotifySettingInput);
  }


  /** */
  async editSemanticTopic(old_eh: EntryId, title: string, preventStoring?: boolean) : Promise<EntryId> {
    const eh = await this.zomeProxy.updateSemanticTopic({eh: old_eh.hash, topic: {title}});
    const newEh = new EntryId(eh);
    this.unstoreSemanticTopic(old_eh);
    if (!preventStoring) {
      this.storeSemanticTopic(newEh, title);
    }
    console.log("editSemanticTopic()", title, newEh.short);
    console.log("editSemanticTopic()", this._perspective.allSemanticTopics);
    /** Done */
    this.notifySubscribers();
    return newEh;
  }


  /** */
  async publishSemanticTopic(title: string) : Promise<EntryId> {
    const eh = await this.zomeProxy.publishSemanticTopic({title});
    return new EntryId(eh);
  }


  /** */
  async publishParticipationProtocol(pp: ParticipationProtocol): Promise<[Timestamp, ActionId]> {
    const [pp_ah, ts] = await this.zomeProxy.publishParticipationProtocol(pp);
    return [ts, new ActionId(pp_ah)];
  }


    /** */
  async publishThreadFromSemanticTopic(appletId: EntryId, topicEh: EntryId, purpose: string): Promise<[number, ActionId]> {
    console.log("publishThreadFromSemanticTopic()", appletId);
    const subject: Subject = {
      address: topicEh.hash,
      typeName: SpecialSubjectType.SemanticTopic,
      appletId: appletId.b64,
      dnaHash: this.cell.dnaId.hash, // TODO: remove this useless field?
    };
    const semTopicTitle = this._perspective.allSemanticTopics.get(topicEh);
    const pp: ParticipationProtocol = {
      purpose,
      rules: "N/A",
      subject,
      subject_name: `${semTopicTitle}`
    }
    const [pp_ah, ts] = await this.zomeProxy.publishParticipationProtocol(pp);
    /** */
    return [ts, new ActionId(pp_ah)];
  }



  /** -- Fetch: Grab an entry from the DHT and store it -- */

  /** */
  async fetchPp(ppAh: ActionId): Promise<[ParticipationProtocolMat, Timestamp, AgentId]> {
    const maybeThread = this._perspective.threads.get(ppAh);
    console.log("ThreadsZvm.fetchPp()", ppAh, !!maybeThread);
    if (maybeThread) {
      return [maybeThread.pp, maybeThread.creationTime, maybeThread.author];
    }
    const [pp, ts, author] = await this.zomeProxy.fetchPp(ppAh.hash);
    if (pp === null) {
      Promise.reject("ParticipationProtocol not found at " + ppAh)
    }
    //await this.fetchThreadHideState(ppAh, pp, encodeHashToBase64(author));
    //return this.storeThread(ppAh, pp, ts, encodeHashToBase64(author), /*isHidden ,*/ false, preventNotify);
    return [materializeParticipationProtocol(pp), ts, new AgentId(author)];
  }


  // /** */
  // async fetchThreadHideState(ppAh: ActionId, pp: ParticipationProtocol, author: AgentPubKeyB64): Promise<boolean> {
  //   let hash;
  //   if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
  //     const other = author == this.cell.agentPubKey? pp.subject.hash : decodeHashFromBase64(author);
  //     hash = encodeHashToBase64(agent2eh(other));
  //   } else {
  //     hash = ppAh;
  //   }
  //   const isHidden = await this.zomeProxy.findHideLink(decodeHashFromBase64(hash)) != null;
  //   //this.storeHidden(hash, isHidden, false);
  //   return isHidden;
  // }


  /** */
  async fetchUnknownBead(beadAh: ActionId, /*canNotify: boolean, alternateCreationTime?: Timestamp*/): Promise<[TypedBead, BeadType, Timestamp, AgentId]> {
    console.log("fetchUnknownBead()", beadAh);
    if (this._perspective.beads.get(beadAh)) {
      const pair = this._perspective.beads.get(beadAh);
      return [dematerializeTypedBead(pair[1], pair[0].beadType), pair[0].beadType, pair[0].creationTime, pair[0].author];
    }
    let bead_ah = beadAh.hash;
    let creationTime: Timestamp;
    let author: AgentPubKey;
    let typed: TypedBead;
    let type: BeadType;

    const textTuple = await this.zomeProxy.fetchTextBeadOption(bead_ah);
    if (textTuple == null) {
      const entryTuple = await this.zomeProxy.fetchEntryBeadOption(bead_ah);
      if (entryTuple == null) {
        const anyTuple = await this.zomeProxy.fetchAnyBeadOption(bead_ah);
        if (anyTuple == null) {
          try {
            [creationTime, author, typed] = await this.zomeProxy.fetchEncBead(bead_ah);
            type = ThreadsEntryType.EncryptedBead;
          } catch (e) {
            //console.error(e);
            return Promise.reject(`Bead not found at hash ${beadAh} : ${e}`);
          }
        } else {
          type = ThreadsEntryType.AnyBead;
          [creationTime, author, typed] = anyTuple;
        }
      } else {
        type = ThreadsEntryType.EntryBead;
        [creationTime, author, typed] = entryTuple;
      }
    } else {
      type = ThreadsEntryType.TextBead;
      [creationTime, author, typed] = textTuple;
    }
    //const ts = alternateCreationTime? alternateCreationTime : creationTime;
    //await this.storeTypedBead(beadAh, materializeTypedBead(typed, type), type, ts, encodeHashToBase64(author), canNotify, false);
    return [typed, type, creationTime, new AgentId(author)];
  }


  /** */
  async fetchTypedBead(beadAh: ActionId, beadType: BeadType/*, canNotify: boolean, alternateCreationTime?: Timestamp*/): Promise<void> {
    if (this._perspective.beads.get(beadAh)) {
      return;
    }
    // let creationTime: Timestamp;
    // let author: AgentPubKey;
    // let typed: TypedBead;
    try {
      switch (beadType) {
        case ThreadsEntryType.TextBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchTextBead(beadAh.hash); break;
        case ThreadsEntryType.EntryBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchEntryBead(beadAh.hash); break;
        case ThreadsEntryType.AnyBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchAnyBead(beadAh.hash); break;
        case ThreadsEntryType.EncryptedBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchEncBead(beadAh.hash); break;
      }
      //const ts = alternateCreationTime? alternateCreationTime : creationTime;
      //await this.storeTypedBead(encodeHashToBase64(beadAh), materializeTypedBead(typed, beadType), beadType, ts, encodeHashToBase64(author), canNotify, false);
      //return typed;
    } catch(e) {
      console.error(e);
      Promise.reject("Bead not found at " + beadAh.short);
    }
  }


  /** */
  private async fetchBeads(ppAh: ActionId, beadLinks: BeadLink[], probedInterval: TimeInterval): Promise<void> {
    //console.log("fetchBeads() len = ", beadLinks.length, searchedInterval);
    if (beadLinks.length == 0) {
      return;
    }
    let thread = this._perspective.threads.get(ppAh);
    if (!thread) {
      console.warn("Fetching beads for unknown thread", ppAh);
      return;
      //await this.fetchPp(ppAh, true);
      //thread = this._threads.get(ppAh);
    }
    /** fetch each Bead */
    for (const bl of beadLinks) {
      console.log("fetchBeads()", bl.beadType)
      await this.fetchTypedBead(new ActionId(bl.beadAh), bl.beadType as BeadType/*, false, bl.creationTime*/);
    }
    thread.addProbedInterval(probedInterval);
  }


  /** */
  async hideDmThread(agent: AgentId) {
    const agentEh = EntryId.from(agent);
    await this.hideSubject(agentEh);
  }


  /** */
  async unhideDmThread(agent: AgentId) {
    const agentEh = EntryId.from(agent);
    await this.unhideSubject(agentEh);
  }


  /** */
  async hideSubject(subjectHash: LinkableId) {
    await this.zomeProxy.hideSubject(subjectHash.hash);
  }


  /** */
  async unhideSubject(subjectHash: LinkableId) {
    await this.zomeProxy.unhideSubject(subjectHash.hash);
  }


  /** */
  async deleteNotification(linkAh: ActionId): Promise<void> {
    await this.zomeProxy.unpublishNotification(linkAh.hash);
  }


  /** */
  async flushInbox(): Promise<void> {
    for (const linkAh of this._perspective.inbox.keys()) {
      await this.deleteNotification(linkAh);
    }
  }


  /** */
  async addFavorite(beadAh: ActionId): Promise<void> {
    await this.zomeProxy.publishFavorite(beadAh.hash);
  }


  /** */
  async removeFavorite(beadAh: ActionId): Promise<void> {
    await this.zomeProxy.unpublishFavorite(beadAh.hash);
  }


  /** get ppAh of Notif */
  async getPpFromNotification(notif: ThreadsNotification): Promise<ActionId> {
    console.log("getPpFromNotification()", notif.event);
    if (NotifiableEvent.Fork === notif.event || NotifiableEvent.NewDmThread === notif.event) {
      return notif.content;
    } else {

      const maybeBead = this._perspective.beads.get(notif.content);
      if (maybeBead) {
        return maybeBead[0].bead.ppAh;
      }
      const [typed, beadType, _ts, _author] = await this.fetchUnknownBead(notif.content);
      const [base, _baseType] = await this.getBaseTypedBead(typed, beadType, notif.author); // WARN: Assuming notif sender is also bead author
      return new ActionId(base.bead.ppAh);
    }
  }


  /** -- Store: Cache & index a materialized entry, and notify subscribers -- */

  /** */
  storeNotification(notif: ThreadsNotification, ppAh?: ActionId) {
    /** make sure we have the content signaled in the notification */
    if (!ppAh) {
      this.getPpFromNotification(notif).then((ppAh) => this.fetchPp(ppAh));
    } else {
      /*await*/ this.fetchPp(ppAh);
    }
    /* */
    console.log("storeNotification()", notif.event, ppAh);
    this._perspective.inbox.set(notif.createLinkAh, [ppAh, notif]);
  }


  /** */
  unstoreNotification(linkAh: ActionId) {
    this._perspective.inbox.delete(linkAh); // = undefined;
  }


  /** */
  storeHidden(hash: LinkableId, isHidden: boolean) {
    this._perspective.hiddens[hash.b64] = isHidden;
  }


  /** */
  storeSemanticTopic(eh: EntryId, title: string): void {
    this._perspective.allSemanticTopics.set(eh, title);
  }
  /** */
  unstoreSemanticTopic(eh: EntryId): void {
    this._perspective.allSemanticTopics.delete(eh);
  }


  /** */
  storeNotifSetting(ppAh: ActionId, agent: AgentId, setting: NotifySetting): void {
    if (!this._perspective.notifSettings.get(ppAh)) {
      this._perspective.notifSettings.set(ppAh, new AgentIdMap());
    }
    this._perspective.notifSettings.get(ppAh).set(agent, setting);
  }


  /** */
  storeFavorite(beadAh: ActionId): void {
    if (this._perspective.favorites.map((ah) => ah.b64).includes(beadAh.b64)) {
      return;
    }
    this._perspective.favorites.push(beadAh);
  }
  /** */
  unstoreFavorite(beadAh: ActionId): void {
    if (!this._perspective.favorites.map((ah) => ah.b64).includes(beadAh.b64)) {
      return;
    }
    this._perspective.favorites = this._perspective.favorites.filter(item => item.b64 !== beadAh.b64);
  }


  /** */
  storeThread(ppAh: ActionId, pp: ParticipationProtocol, creationTime: Timestamp, author: AgentId, isNew: boolean): ParticipationProtocolMat {
    /** Return already stored PP */
    if (this._perspective.threads.has(ppAh)) {
      return this._perspective.threads.get(ppAh).pp;
    }
    let ppMat = materializeParticipationProtocol(pp);
    const thread = new Thread(ppMat, this.cell.dnaModifiers.origin_time, creationTime, author);
    console.log(`storeThread() thread "${ppAh.short}" for subject "${ppMat.subject.address.short}"| creationTime: ${creationTime}"`);
    this._perspective.threads.set(ppAh, thread);
    /** Add already stored beads */
    for (const [beadAh, [info, _typed]] of this._perspective.beads.entries()) {
      if (info.bead.ppAh == ppAh) {
        this.storeBeadInThread(beadAh, ppAh, info.creationTime, false, info.beadType);
      }
    }
    if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
      /** DM thread */
      const agentId = AgentId.from(ppMat.subject.address);
      let otherAgent = author.b64 == this.cell.agentId.b64? agentId : author;
      console.log("storeThread() dmThread", otherAgent);
      this._perspective.dmAgents.set(otherAgent, ppAh);
    } else {
      /** isNew */
      if (isNew) {
        this._perspective.newThreads.set(ppAh, ppMat.subject.address);
      }
      /** threadsPerSubject */
      if (!this._perspective.threadsPerSubject.get(ppMat.subject.address.b64)) {
        this._perspective.threadsPerSubject.set(ppMat.subject.address.b64, []);
      }
      this._perspective.threadsPerSubject.get(ppMat.subject.address.b64).push(ppAh);

      /** All Subjects */
      if (!this._perspective.allSubjects.get(ppMat.subject.address.b64)) {
        this._perspective.allSubjects.set(ppMat.subject.address.b64, materializeSubject(pp.subject));
      }
    }
    //console.log("storePp()", ppMat.subjectHash, ppAh)
    /** Done */
    return ppMat;
  }


  /** */
  hasEmojiReaction(beadAh: ActionId, agent: AgentId, emoji: string): boolean {
    if (!this._perspective.emojiReactions.get(beadAh)) {
      return false;
    }
    /** Look for pair */
    const maybeAlready = Object.values(this._perspective.emojiReactions.get(beadAh)).find(([a, e]) => (agent == a && e == emoji));
    return maybeAlready && maybeAlready.length > 0;
  }


  /** */
  storeEmojiReaction(beadAh: ActionId, agent: AgentId, emoji: string) {
    if (this.hasEmojiReaction(beadAh, agent, emoji)) {
      return;
    }
    if (!this._perspective.emojiReactions.get(beadAh)) {
      this._perspective.emojiReactions.set(beadAh, []);
    }
    this._perspective.emojiReactions.get(beadAh).push([agent, emoji]);
  }


  /** */
  unstoreEmojiReaction(beadAh: ActionId, agent: AgentId, emoji: string) {
    if (!this._perspective.emojiReactions.get(beadAh)) {
      //this._emojiReactions[beadAh] = [];
      return;
    }
    const filtered = this._perspective.emojiReactions.get(beadAh).filter(([a, e]) => !(agent == a && e == emoji));
    if (filtered.length < this._perspective.emojiReactions.get(beadAh).length) {
      this._perspective.emojiReactions.set(beadAh, filtered);
      if (this._perspective.emojiReactions.get(beadAh).length == 0) {
        this._perspective.emojiReactions.delete(beadAh);
      }
    }
  }


  /** */
  storeGlobalLog(latestGlobalLogTime: Timestamp) {
    this._perspective.globalProbeLogTs = latestGlobalLogTime;
    this._perspective.unreadThreads.clear();
    this._perspective.newThreads.clear();
  }


  /** */
  storeThreadLog(log: ThreadLastProbeLog) {
    const ppAh = new ActionId(log.ppAh);
    const thread = this._perspective.threads.get(ppAh);
    if (!thread) {
      console.warn("Getting ThreadLastProbeLog for unknown thread", ppAh);
      return;
    }
    thread.setLatestProbeLogTime(log.ts);
    this._perspective.unreadThreads.delete(ppAh);
  }


  /** */
  async storeTypedBead(beadAh: ActionId, typedBead: TypedBeadMat, beadType: BeadType, creationTime: Timestamp, author: AgentId, isNew: boolean) {
    console.log("storeTypedBead()", beadAh);
    if (this._perspective.beads.get(beadAh)) {
      return;
    }
    if (!typedBead) {
      console.error("storeBead() Trying to store a null Bead");
      return;
    }
    if (beadType == ThreadsEntryType.EncryptedBead) {
      console.log("storeTypedBead() EncryptedBead", beadAh);
      /** Get inner */
      const [innerTyped, innerBeadType] = await this.getBaseTypedBead(dematerializeTypedBead(typedBead, beadType), beadType, author);
      /** Store inner Bead */
      const bead = innerTyped.bead;
      const innerBeadInfo = {creationTime, author, beadType: innerBeadType, bead: materializeBead(bead)} as BeadInfo;
      this._perspective.decBeads.set(beadAh, [innerBeadInfo, materializeTypedBead(innerTyped, innerBeadType) as TypedBaseBeadMat]);
      /** Store EncryptedBead */
      const beadInfo = {creationTime, author, beadType: ThreadsEntryType.EncryptedBead, bead: materializeBead(bead)} as BeadInfo;
      console.log("storeBead() encrypted", beadAh, typedBead, author);
      this._perspective.beads.set(beadAh, [beadInfo, typedBead]);
      this.storeBeadInThread(beadAh, new ActionId(bead.ppAh), creationTime, isNew, beadInfo.beadType);
    } else {
      /** Store normal base Bead */
      const bead = (typedBead as TypedBaseBeadMat).bead;
      const beadInfo = {creationTime, author, beadType, bead} as BeadInfo;
      console.log("storeBead()", beadAh, bead.ppAh, typedBead, author);
      this._perspective.beads.set(beadAh, [beadInfo, typedBead]);
      this.storeBeadInThread(beadAh, bead.ppAh, creationTime, isNew, beadInfo.beadType);
    }
  }


  /** -- -- */

  /** */
  async createDmThread(otherAgent: AgentId): Promise<ActionId> {
    if (otherAgent.b64 == this.cell.agentId.b64) {
      return Promise.reject("Can't DM self");
    }
    /** Give current if already exists */
    const pair = this._perspective.dmAgents.get(otherAgent);
    if (pair) {
      await this.unhideDmThread(otherAgent);
      return pair[0];
    }
    /** Create new Thread */
    const pp_ah = await this.zomeProxy.publishDmThread(otherAgent.hash);
    const ppAh = new ActionId(pp_ah);
    //let ppMat = await this.fetchPp(ppAh); // trigger storage
    await this.publishNotifSetting(ppAh, NotifySetting.AllMessages);
    /* */
    return ppAh;
  }


  /** */
  isThreadDm(ppAh: ActionId): AgentId | null {
    const thread = this._perspective.threads.get(ppAh);
    if (!thread) {
      return null;
    }
    if (thread.pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
      let other = thread.author;
      if (other.b64 == this.cell.agentId.b64) {
        other = AgentId.from(thread.pp.subject.address);
      }
      return other;
    }
  }


  /* Store Bead in its Thread */
  private storeBeadInThread(beadAh: ActionId, ppAh: ActionId, creationTime: Timestamp, isNew: boolean, beadType: BeadType) {
    console.log("storeBeadInThread()", beadType, beadAh, creationTime);
    const thread = this._perspective.threads.get(ppAh);
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
      if (!this._perspective.unreadThreads.get(ppAh)) {
        this._perspective.unreadThreads.set(ppAh, [thread.pp.subject.address, []]);
      }
      this._perspective.unreadThreads.get(ppAh)[1].push(beadAh);
    }
  }


  /** */
  async getBaseTypedBead(typedBead: TypedBead, beadType: BeadType, author: AgentId): Promise<[TypedBaseBead, BaseBeadType]> {
    if (beadType == ThreadsEntryType.EncryptedBead) {
      let innerBead: BaseBeadKind;
      if (author.b64 == this.cell.agentId.b64) {
        innerBead = await this.zomeProxy.decryptMyBead(typedBead as EncryptedBead);
      } else {
        innerBead = await this.zomeProxy.decryptBead({
          encBead: typedBead as EncryptedBead,
          otherAgent: author.hash,
        });
      }
      return base2typed(innerBead);
    }
    return [typedBead as TypedBaseBead, beadType];
  }


  /** -- commit search logs -- */

  /** */
  async commitAllProbeLogs(): Promise<void> {
    console.log("commitAllProbeLogs() start");
    await this.commitGlobalProbeLog();
    /** Commit each Thread Log */
    for (const ppAh of this._perspective.threads.keys()) {
      await this.commitThreadProbeLog(ppAh);
    }
  }


  /** Commit Global Log */
  async commitGlobalProbeLog(maybe_ts?: Timestamp): Promise<void> {
    const maybeLatest = this.getLatestThread();
    console.log("commitGlobalProbeLog() maybeLatest", maybeLatest);
    const input: CommitGlobalLogInput = {
      maybe_ts,
      maybe_last_known_pp_ah: maybeLatest? maybeLatest[0].hash : undefined,
    }
    let latestGlobalLogTime = await this.zomeProxy.commitGlobalLog(input);
    console.log("commitGlobalProbeLog()", prettyTimestamp(latestGlobalLogTime));
  }


  /** */
  async commitThreadProbeLog(ppAh: ActionId): Promise<void> {
    const thread = this._perspective.threads.get(ppAh);
    console.log(`commitThreadProbeLog() Thread "${thread.pp.purpose}":`, thread.probedUnion, thread.latestProbeLogTime, thread.beadLinksTree, thread.beadLinksTree.length);
    if (!thread || !thread.probedUnion || thread.probedUnion.end <= thread.latestProbeLogTime) {
      return;
    }
    const probeLog: ThreadLastProbeLog = {
      maybeLastKnownBeadAh: thread.beadLinksTree.end.value? thread.beadLinksTree.end.value.beadAh.hash : undefined,
      ts: thread.beadLinksTree.end.key,
      ppAh: ppAh.hash,
    }
    console.log(`commitThreadProbeLog() ppAh:`,ppAh);
    const _ah = await this.zomeProxy.commitThreadLog(probeLog);
  }


  /** -- Signaling / Notifying -- */


  /** Return true if sent synchronously */
  async castNotificationTip(linkAh: ActionId, agent: AgentId, notification: ThreadsNotification, extra: NotificationTipBeadData | NotificationTipPpData): Promise<void> {
    let ppAh = notification.content;
    if (NotifiableEvent.Mention === notification.event || NotifiableEvent.Reply === notification.event
      || NotifiableEvent.NewBead === notification.event) {
      const beadAh = notification.content;
      const beadInfo = this.getBeadInfo(beadAh);
      ppAh = beadInfo.bead.ppAh;
    }
    const notificationTip: ThreadsNotificationTip = {
      event: notification.event,
      author: notification.author,
      timestamp: notification.timestamp,
      content: notification.content,
      /** */
      link_ah: linkAh,
      pp_ah: ppAh,
      //data: Array.from(extra),
      data: extra,
    }
    console.log("castNotificationTip()", notificationTip, agent/*, notification.author*/);
    const serTip = encode(notificationTip);
    await this.broadcastTip({App: serTip}, [agent]);
    return;
  }


  /** -- Misc. -- */


  /** Dump perspective as JSON */
  exportPerspective(originalsZvm: AuthorshipZvm): string {
    // const exPersp = intoExportable(this._perspective, originalsZvm);
    // return JSON.stringify(exPersp, null, 2);
    return "FIXME"
  }


  /** */
  async importPerspective(json: string, canPublish: boolean, authorshipZvm: AuthorshipZvm) {
    // const external = JSON.parse(json) as ThreadsPerspectiveExportable;
    //
    // console.log("Importing perspective", external);
    //
    // if (canPublish) {
    //   await this.publishAllFromPerspective(external, authorshipZvm);
    //   return;
    // }
    // /** this._allAppletIds */
    // for (const appletId of Object.values(external.allAppletIds)) {
    //   this._perspective.allAppletIds.push(appletId);
    // }
    // /** this._appletSubjectTypes */
    // for (const [appletId, dict] of Object.entries(external.appletSubjectTypes)) {
    //   if (!this._perspective.appletSubjectTypes[appletId]) {
    //     this._perspective.appletSubjectTypes[appletId] = {};
    //   }
    //   for (const [pathHash, subjectType] of Object.entries(dict)) {
    //     this._perspective.appletSubjectTypes[appletId][pathHash] = subjectType
    //   }
    // }
    // /** this._allSemanticTopics */
    // for (const [topicEh, title] of Object.entries(external.allSemanticTopics)) {
    //   this.storeSemanticTopic(topicEh, title);
    // }
    // /** this._allSubjects */
    // for (const [subjectHash, subject] of Object.values(external.allSubjects)) {
    //   this._perspective.allSubjects.set(subjectHash, subject)
    // }
    // /** this._threads */
    // for (const [ppAh, ppMat, creationTime, _maybeOtherAgent] of Object.values(external.pps)) {
    //   const authorshipLog: [Timestamp, AgentId | null] = authorshipZvm.perspective.allLogs[ppAh] != undefined
    //     ? authorshipZvm.perspective.allLogs[ppAh]
    //     : [creationTime, this.cell.agentId.hash];
    //   this.storeThread(ppAh, dematerializeParticipationProtocol(ppMat), authorshipLog[0], authorshipLog[1], false);
    // }
    // /** this._beads */
    // for (const [beadAh, [beadInfo, typedBead]] of Object.entries(external.beads)) {
    //   const authorshipLog: [Timestamp, AgentId | null] = authorshipZvm.perspective.allLogs[beadAh] != undefined
    //     ? authorshipZvm.perspective.allLogs[beadAh]
    //     : [beadInfo.creationTime, beadInfo.author];
    //   /*await*/ this.storeTypedBead(beadAh, typedBead, beadInfo.beadType, authorshipLog[0], authorshipLog[1], true);
    // }
    // console.log("importPerspective() beads", this._perspective.beads);
    //
    // /** this._emojiReactions */
    // for (const [beadAh, pairs] of Object.entries(external.emojiReactions)) {
    //   if (!this._perspective.emojiReactions[beadAh]) {
    //     this._perspective.emojiReactions[beadAh] = [];
    //   }
    //   this._perspective.emojiReactions[beadAh] = this._perspective.emojiReactions[beadAh].concat(pairs);
    // }
    //
    // /** this._favorites */
    // this._perspective.favorites = this._perspective.favorites.concat(external.favorites);
    //
    //
    // /** Done */
    // this.notifySubscribers();
  }


  /** */
  async publishAllFromPerspective(impPersp: ThreadsPerspectiveSnapshot, authorshipZvm: AuthorshipZvm) {
    // /** this._allSemanticTopics */
    // for (const [_topicEh, title] of Object.entries(impPersp.allSemanticTopics)) {
    //   /* const newTopicEh = */ await this.publishSemanticTopic(title);
    // }
    // /** this._allSubjects */
    // const ppAhs = impPersp.pps.map((tuple) => tuple[0]);
    // const entryAsSubjects: Dictionary<ThreadsEntryType> = {};
    // for (const [subjectHash, _subject] of Object.values(impPersp.allSubjects)) {
    //   if (ppAhs.includes(subjectHash)) {
    //     entryAsSubjects[subjectHash] = ThreadsEntryType.ParticipationProtocol;
    //     continue;
    //   }
    //   const maybeBeadPair = impPersp.beads[subjectHash];
    //   if (maybeBeadPair) {
    //     entryAsSubjects[subjectHash] = maybeBeadPair[0].beadType as ThreadsEntryType;
    //     continue;
    //   }
    //   // FIXME: Figure out how to map ppAh used as subjectHash
    //   // Check if its an ActionHash?
    //   // or check on export if ppAh has "threads" link off of it and add that to the perspective?
    // }
    //
    // /** -- Threads & Beads -- */
    // const ppAhMapping: Record<ActionId, ActionId> = {}
    // /* Sort by creation time */
    // const sortedPps: [ActionId, ParticipationProtocolMat, Timestamp, AgentId][] = Object.values(impPersp.pps).sort(
    //   ([_ppAhA, _ppMatA, creationTimeA], [_ppAhB, _ppMatB, creationTimeB]) => {
    //     return creationTimeA - creationTimeB
    //   })
    // const beadAhMapping: Record<ActionId, ActionId> = {}
    // /* Sort beads so they can get their prev bead equivalent ah */
    // const sortedBeads: [string, [BeadInfo, TypedBeadMat]][] = Object.entries(impPersp.beads).sort(
    //   ([_beadAhA, [beadInfoA, _typedBeadA]], [_beadAhB, [beadInfoB, _typedBeadB]]) => {
    //     return beadInfoA.creationTime - beadInfoB.creationTime
    //   })
    //
    // /* loop until all beads & pps have been processed ; check if progress is made, otherwise abort */
    // let loopCount = 0;
    // while(Object.keys(ppAhMapping).length != sortedPps.length && Object.keys(beadAhMapping).length != sortedBeads.length ) {
    //   const totalStart = Object.keys(ppAhMapping).length + Object.keys(beadAhMapping).length;
    //   /* Threads */
    //   for (const [ppAh, ppMat, creationTime] of Object.values(sortedPps)) {
    //     if (ppAhMapping[ppAh]) {
    //       continue;
    //     }
    //     /* Grab subject mapping */
    //     const maybeEntrySubject = entryAsSubjects[ppMat.subject.hash];
    //     if (maybeEntrySubject) {
    //       if (maybeEntrySubject == ThreadsEntryType.ParticipationProtocol) {
    //         const newSubjectHash = ppAhMapping[ppMat.subject.hash];
    //         if (!newSubjectHash) {
    //           continue;
    //         }
    //         ppMat.subject.hash = newSubjectHash;
    //       } else {
    //         const newSubjectHash = beadAhMapping[ppMat.subject.hash];
    //         if (!newSubjectHash) {
    //           continue;
    //         }
    //         ppMat.subject.hash = newSubjectHash;
    //       }
    //     }
    //     /* publish pp */
    //     const pp = dematerializeParticipationProtocol(ppMat);
    //     const [pp_ah, _ts] = await this.zomeProxy.publishParticipationProtocol(pp);
    //     const newPpAh = encodeHashToBase64(pp_ah);
    //     ppAhMapping[ppAh] = newPpAh;
    //     const authorshipLog: [Timestamp, AgentId | null] = authorshipZvm.perspective.allLogs[ppAh] != undefined
    //       ? authorshipZvm.perspective.allLogs[ppAh]
    //       : [creationTime, this.cell.agentId.hash];
    //     /* store pp */
    //     this.storeThread(newPpAh, pp, authorshipLog[0], authorshipLog[1], false);
    //     /** commit authorshipLog for new pp */
    //     if (authorshipZvm.perspective.allLogs[ppAh] != undefined) {
    //       await authorshipZvm.ascribeTarget(ThreadsEntryType.ParticipationProtocol, newPpAh, authorshipLog[0], authorshipLog[1]);
    //     }
    //   }
    //   // FIXME: use Promise.AllSettled();
    //
    //   /* Beads */
    //   for (const [beadAh, [beadInfo, typedBead]] of Object.values(sortedBeads)) {
    //     if (beadAhMapping[beadAh]) {
    //       continue;
    //     }
    //     console.log("PubImp() Bead", prettyTimestamp(beadInfo.creationTime), beadAh);
    //     /* Grab pp mapping */
    //     if (!ppAhMapping[beadInfo.bead.ppAh]) {
    //       console.warn("PubImp() Pp not found in mapping", beadInfo.bead.ppAh);
    //       continue;
    //     }
    //     /* Grab prev bead mapping */
    //     let prevBeadAh = beadInfo.bead.ppAh;
    //     if (beadInfo.bead.prevBeadAh != beadInfo.bead.ppAh) {
    //       const prevKnownBeadAh = beadAhMapping[beadInfo.bead.prevBeadAh];
    //       if (!prevKnownBeadAh) {
    //         console.warn("PubImp() Missing prev Bead", beadInfo.bead.prevBeadAh);
    //         continue;
    //       }
    //     }
    //     /* Determine typed bead content */
    //     let content: TypedContent | EntryBeadMat | EncryptedBeadContent;
    //     switch(beadInfo.beadType) {
    //       case ThreadsEntryType.EncryptedBead: {
    //         const encBead = typedBead as EncryptedBead;
    //         const otherAgent = beadInfo.author.b64 != this.cell.agentId.b64? beadInfo.author : this._perspective.threads.get(beadInfo.bead.ppAh).pp.subject.hash;
    //         content = {encBead, otherAgent: decodeHashFromBase64(otherAgent)};
    //       } break;
    //       case ThreadsEntryType.TextBead: content = (typedBead as TextBeadMat).value; break;
    //       //case ThreadsEntryType.EntryBead: content = (typedBead as EntryBeadMat).sourceEh; break;
    //       case ThreadsEntryType.EntryBead: content = (typedBead as EntryBeadMat); break;
    //       case ThreadsEntryType.AnyBead:
    //         const typedAny = typedBead as AnyBeadMat;
    //         content = weaveUrlToWal(typedAny.value);
    //         break;
    //     }
    //     /* Publish */
    //     const newPpAh = decodeHashFromBase64(ppAhMapping[beadInfo.bead.ppAh]);
    //     console.log(`PubImp() Bead newPpAh: ${ppAhMapping[beadInfo.bead.ppAh]}`);
    //     const nextBead: Bead = {ppAh: newPpAh, prevBeadAh: decodeHashFromBase64(prevBeadAh)};
    //     const authorshipLog: [Timestamp, AgentId | null] = authorshipZvm.perspective.allLogs[beadAh] != undefined
    //       ? authorshipZvm.perspective.allLogs[beadAh]
    //       : [beadInfo.creationTime, this.cell.agentId.hash];
    //     const beadType = beadInfo.beadType == ThreadsEntryType.EntryBead ? "EntryBeadImport" : beadInfo.beadType as BeadType; // copy entry bead verbatim
    //     const [newBeadAh, _global_time_anchor, _newTm] = await this.publishTypedBeadAt(beadType, content, nextBead, authorshipLog[0], authorshipLog[1]);
    //     beadAhMapping[beadAh] = newBeadAh;
    //     /** commit authorshipLog for new beads */
    //     if (authorshipZvm.perspective.allLogs[beadAh] != undefined) {
    //       await authorshipZvm.ascribeTarget(beadInfo.beadType, newBeadAh, beadInfo.creationTime, beadInfo.author);
    //     }
    //     console.log(`PubImp() Bead ${beadAh} -> ${newBeadAh}`, authorshipLog[0]);
    //   }
    //   /* Break loop if no progress made */
    //   const totalEnd = Object.keys(ppAhMapping).length + Object.keys(beadAhMapping).length;
    //   if (totalEnd == totalStart) {
    //     console.warn("PubImp() Publish loop ended because no progress made: " + totalEnd + " / " + sortedPps.length + sortedBeads.length);
    //     break;
    //   }
    //   loopCount += 1
    // }
    // console.log(`PubImp() looped ${loopCount} times. pps: ${Object.keys(ppAhMapping).length} ; beads: ${Object.keys(beadAhMapping).length}`);
    // console.log("PubImp() beads", this.perspective.beads);
    //
    // /** this._emojiReactions */
    // for (const [beadAh, pairs] of Object.entries(impPersp.emojiReactions)) {
    //   for (const [author, emoji] of pairs) {
    //     if (!beadAhMapping[beadAh]) {
    //       console.warn("PubImp() Bead not found in mapping", beadAh);
    //       continue;
    //     }
    //     const bead_ah = decodeHashFromBase64(beadAhMapping[beadAh]);
    //     await this.zomeProxy.publishReaction({bead_ah, from: decodeHashFromBase64(author), emoji});
    //     /*const succeeded =*/ await this.storeEmojiReaction(beadAh, author, emoji);
    //   }
    // }
    //
    // /** favorites */
    // for (const oldBeadAh of impPersp.favorites) {
    //   const newBeadAh = beadAhMapping[oldBeadAh];
    //   if (!newBeadAh) {
    //     console.log("Favorite bead not found:", oldBeadAh, beadAhMapping);
    //     continue;
    //   }
    //   await this.addFavorite(newBeadAh);
    // }
    //
    // /** other */
    // await this.pullAllSubjects();
  }



  /** */
  async content2Typed(bead: Bead, content: TypedContent, beadType: BaseBeadType): Promise<TypedBaseBead> {
    switch (beadType) {
      case ThreadsEntryType.TextBead:
        return {value: content as string, bead} as TextBead;
        break;
      case ThreadsEntryType.EntryBead:
        const entryInfo: AddEntryAsBeadInput = {
          eh: (content as EntryId).hash,
          bead,
          zomeName: "zFiles", // FilesProxy.DEFAULT_ZOME_NAME,
          roleName: "rFiles", // FILES_CELL_NAME
          // creationTime,
          // author,
        };
        const [entry_bead, _creation_ts] = await this.zomeProxy.createEntryBead(entryInfo);
        return entry_bead;
        break;
      case ThreadsEntryType.AnyBead:
        //const encHrl = encodeHrl(content as Hrl);
        const wurl = weaveUrlFromWal(content as WAL);
        return {
          bead,
          value: wurl,
          typeInfo: "wal",
        } as AnyBead;
        break;
      default:
        throw Error("Unknown beadType: " + beadType);
        break;
    }
  }


  /** */
  protected async handleLinkPulse(pulse: LinkPulseMat, from: AgentId) {
    let tip: TipProtocol;
    switch(pulse.link_type) {
      case ThreadsLinkType.Inbox:
        this.handleInboxLink(pulse, from);
      break;
      case ThreadsLinkType.Hide:
        console.log("handleLinkPulse() hide", pulse.target);
        this.storeHidden(pulse.target, StateChangeType.Create == pulse.state);
      break;
      case ThreadsLinkType.Dm: {
        const targetAh = new ActionId(pulse.target.b64);
        await this.fetchPp(targetAh);
        /** Notify peer of DmThread */
        const peer = AgentId.from(pulse.base);
        if (!peer.equals(this.cell.agentId) && pulse.isNew) {
          await this.zomeProxy.notifyPeer({content: targetAh.hash, who: peer.hash, event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.NewDmThread)});
        }
      }
      break;
      case ThreadsLinkType.EmojiReaction: {
        const baseAh = new ActionId(pulse.base.b64);
        if (StateChangeType.Create == pulse.state) {
          const decoder = new TextDecoder('utf-8');
          const emoji = decoder.decode(pulse.tag);
          //console.warn("EmojiReaction CreateLink:", link.tag, emoji);
          await this.storeEmojiReaction(baseAh, pulse.author, emoji);
          if (pulse.isNew && from.b64 == this.cell.agentId.b64) {
            const link = dematerializeLinkPulse(pulse, Object.values(ThreadsLinkType)).link;
            tip = {Link: {link, state: {Create: true}}} as TipProtocolVariantLink;
          }
        }
        if (StateChangeType.Delete == pulse.state) {
          const decoder = new TextDecoder('utf-8');
          const emoji = decoder.decode(pulse.tag);
          //console.warn("EmojiReaction DeleteLink:", link.tag, emoji);
          await this.unstoreEmojiReaction(baseAh, pulse.author, emoji);
          if (pulse.isNew && from.b64 == this.cell.agentId.b64) {
            const link = dematerializeLinkPulse(pulse, Object.values(ThreadsLinkType)).link;
            tip = {Link: {link, state: {Delete: true}}} as TipProtocolVariantLink;
          }
        }
      }
      break;
      case ThreadsLinkType.NotifySetting: {
        const baseAh = new ActionId(pulse.base.b64);
        if (StateChangeType.Create == pulse.state) {
          const index = pulse.tag[0];
          const setting = getVariantByIndex(NotifySetting, index) as NotifySetting;
          //console.warn("NotifySetting CreateLink:", link.tag, setting, index);
          const peer = AgentId.from(pulse.target);
          this.storeNotifSetting(baseAh, peer, setting);
        }
        // if (StateChangeType.Delete in state) {
        //   this.unstoreNotifSetting(encodeHashToBase64(intoAgentPubKey(decodeHashFromBase64(target))));
        // }
      }
      break;
      case ThreadsLinkType.Favorite: {
        console.log("handleLinkPulse() Favorite", pulse.target.short);
        const targetAh = new ActionId(pulse.target.b64);
        if (StateChangeType.Create == pulse.state) {
          this.storeFavorite(targetAh);
        }
        if (StateChangeType.Delete == pulse.state) {
          this.unstoreFavorite(targetAh);
        }
      }
      break;
    }
    /** */
    if (tip) {
      await this.broadcastTip(tip);
    }
  }


  /** */
  protected async handleEntryPulse(pulse: EntryPulseMat, from: AgentId) {
    console.log("ThreadsZvm.handleEntryPulse()", pulse, from.short);
    const isFromSelf = from.b64 == this.cell.agentId.b64;
    switch(pulse.entryType) {
      case ThreadsEntryType.AnyBead:
      case ThreadsEntryType.EntryBead:
      case ThreadsEntryType.TextBead:
      case ThreadsEntryType.EncryptedBead:
        const encBead = decode(pulse.bytes) as TypedBead;
        if (StateChangeType.Create == pulse.state) {
          await this.handleBeadEntry(pulse, encBead, pulse.entryType, pulse.isNew, from);
        }
        break;
      case ThreadsEntryType.SemanticTopic:
        const semTopic = decode(pulse.bytes) as SemanticTopic;
        if (StateChangeType.Create == pulse.state) {
          this.storeSemanticTopic(pulse.eh, semTopic.title);
        }
        break;
      case ThreadsEntryType.ParticipationProtocol:
        const pp= decode(pulse.bytes) as ParticipationProtocol;
        if (StateChangeType.Create == pulse.state) {
          this.storeThread(pulse.ah, pp, pulse.ts, pulse.author, pulse.isNew);
          if (pulse.isNew) {
            if (isFromSelf) {
              /** Notify Subject author */
              if (this.cell.dnaId.equals(pp.subject.dnaHash)) {
                //if (subject_hash == AnyDhtHash::try_from(pp.subject.hash) {
                let author = await this.zomeProxy.getRecordAuthor(pp.subject.address);
                if (!this.cell.agentId.equals(author)) {
                  await this.zomeProxy.notifyPeer({
                    content: pulse.ah.hash,
                    who: author,
                    event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.Fork),
                  });
                }
                //}
              }
            } else {
              if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
                /* Set NotifSetting for new DmThread */
                console.log("NewDmThread.publishNotifSetting() signal", pulse.ah);
                await this.publishNotifSetting(pulse.ah, NotifySetting.AllMessages);
              }
            }
          }
        }
        break;
      case ThreadsEntryType.GlobalLastProbeLog: {
        const globalLog = decode(pulse.bytes) as GlobalLastProbeLog;
        this.storeGlobalLog(globalLog.ts);
      }
        break;
      case ThreadsEntryType.ThreadLastProbeLog: {
        const threadLog = decode(pulse.bytes) as ThreadLastProbeLog;
        this.storeThreadLog(threadLog);
      }
        break;
    }
  }


  /** */
  private async handleInboxLink(pulse: LinkPulseMat, from: AgentId) {
    const base = AgentId.from(pulse.base);

    if (StateChangeType.Update == pulse.state) {
      console.error("Not possible to Update a link");
      return;
    }
    if (StateChangeType.Delete == pulse.state) {
      //const isNew = linkInfo.state.Delete;
      console.log("handleInboxSignal() Delete", base, this.cell.agentId.short);
      if (base.b64 == this.cell.agentId.b64) {
        await this.unstoreNotification(pulse.create_link_hash);
      }
      return;
    }
    /** Create */
    const index = pulse.tag[0];
    const event = getVariantByIndex(NotifiableEvent, index) as NotifiableEvent;
    console.log("handleInboxSignal() Create", pulse.isNew, event, pulse.tag);
    const notif: ThreadsNotification = {
      event,
      author: pulse.author,
      timestamp: pulse.timestamp,
      createLinkAh: pulse.create_link_hash,
      content: ActionId.from(pulse.target),
    };
    /** I got notified by a peer */
    if (base.b64 == this.cell.agentId.b64) {
      /** Store Notification */
      this.storeNotification(notif);
      /** Publish a NotifySetting.AllMessages for this thread if non exists */
      if (NotifiableEvent.NewDmThread === event && pulse.isNew) {
        const ppAh = new ActionId(notif.content.b64);
        console.log("NewDmThread in inbox:", ppAh);
        const notifSettings = this.getPpNotifSettings(ppAh);
        const notifSetting = notifSettings[this.cell.agentId.b64];
        if (!notifSetting) {
          await this.publishNotifSetting(ppAh, NotifySetting.AllMessages);
          console.log("NewDmThread.publishNotifSetting() inbox", ppAh);
        }
      }
    } else {
      if (!pulse.isNew) {
        return;
      }
      /** I notified a peer */
      /** Tip peer that we send them a notification */
      let extra: NotificationTipBeadData | NotificationTipPpData;
      if (NotifiableEvent.NewDmThread === event || NotifiableEvent.Fork === event) {
        console.log("Signaling new PP notification to peer", base, pulse.target);
        const ppAh = new ActionId(pulse.target.b64);
        const thread = this._perspective.threads.get(ppAh);
        const ppData: NotificationTipPpData = {pp: dematerializeParticipationProtocol(thread.pp), creationTime: thread.creationTime};
        extra = ppData;
      } else {
        /** NewBead, Mention, Reply */
        console.log("Signaling new Bead notification to peer", base, pulse.target);
        const beadAh = new ActionId(pulse.target.b64);
        const beadPair = this._perspective.beads.get(beadAh);
        const beadData: NotificationTipBeadData = {typed: beadPair[1], beadType: beadPair[0].beadType, creationTime: beadPair[0].creationTime};
        extra = beadData;
      }
      await this.castNotificationTip(pulse.create_link_hash, base, notif, extra);
    }
  }


  /** */
  private async handleBeadEntry(pulse: EntryPulseMat, typed: TypedBead, beadType: BeadType, isNew: boolean, from: AgentId): Promise<void> {
    const beadAh = pulse.ah;
    const typedMat = materializeTypedBead(typed, beadType);
    console.log("handleBeadEntry()", beadType, pulse.ah.short, typedMat);
    /** Store Bead */;
    await this.storeTypedBead(beadAh, typedMat, beadType, pulse.ts, pulse.author, isNew);
    /** Check if need to notify */;
    let notifs: NotifyPeerInput[] = [];
    if (isNew && from.b64 == this.cell.agentId.b64) {
      /** Get base info */
      let ppAh: ActionId;
      let prevBeadAh: ActionId;
      if (beadType == ThreadsEntryType.EncryptedBead) {
        console.log("handleBeadEntry() create new EncryptedBead", beadAh.short);
        const decBeadPair = this._perspective.decBeads.get(beadAh);
        ppAh = decBeadPair[0].bead.ppAh;
        prevBeadAh = decBeadPair[0].bead.prevBeadAh;
      } else {
        const baseBead = typedMat as unknown as TypedBaseBeadMat;
        ppAh = baseBead.bead.ppAh;
        prevBeadAh = baseBead.bead.prevBeadAh;
        /* Notify Mentions */
        if (beadType == ThreadsEntryType.TextBead) {
          const textBead = typed as TextBead;
          const mentionees = parseMentions(textBead.value, (this._dvmParent as any).profilesZvm);
          for (const mentionee of mentionees) {
            notifs.push({
              content: beadAh.hash,
              who: mentionee.hash,
              event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.Mention),
            });
          }
        }
      }
      /** Notify Reply */
      /** Notify reply if prevBead in Bead is different from last known bead for pp and not in a DM thread */
      if (!prevBeadAh.equals(ppAh)) { // Thread's first bead has ppAh == prevBeadAh
        const isDmThread = this.isThreadDm(ppAh);
        const lastKnownBead = this._perspective.threads.get(ppAh).getLast(2); // new bead is already stored in thread, get the one before that
        const hasJumpedBead = lastKnownBead.length > 1 && !lastKnownBead[0].beadAh.equals(prevBeadAh);
        //console.log("handleBeadEntry() hasJumpedBead", hasJumpedBead, isDmThread, lastKnownBead, prevBeadAh);
        if (hasJumpedBead && !isDmThread) {
          let reply_author = await this.zomeProxy.getRecordAuthor(prevBeadAh.hash);
          notifs.push({content: beadAh.hash, who: reply_author, event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.Reply)});
        }
      }
      await this.notifyPeers(ppAh, beadAh, notifs);
    }
  }


  /** */
  handleAppTip(appTip: Uint8Array, from: AgentId): ZomeSignalProtocol | undefined {
    const notifTip = decode(appTip) as ThreadsNotificationTip;
    let ppAh: ActionId;
    let signal: ZomeSignalProtocol;
    /** Store received Entry */
    if (NotifiableEvent.Mention == notifTip.event || NotifiableEvent.Reply == notifTip.event || NotifiableEvent.NewBead == notifTip.event) {
      const {typed, beadType, creationTime} = notifTip.data as NotificationTipBeadData;
      const beadAh = notifTip.content;
      ppAh = notifTip.pp_ah;
      console.log(`Received NotificationSignal of type ${JSON.stringify(notifTip.event)}:`, beadAh, typed);
      const entryPulse: EntryPulse = {
        ah: notifTip.content.hash,
        eh: EntryId.empty().hash,
        ts: creationTime,
        author: from.hash,
        state: {Create: true},
        def: {
          entry_index: getIndexByVariant(ThreadsEntryType, beadType),
          zome_index: 42,
          visibility: "Public",
        },
        bytes: encode(typed),
      };
      signal = {Entry: entryPulse};
    }
    if (NotifiableEvent.NewDmThread == notifTip.event || NotifiableEvent.Fork === notifTip.event) {
      const {pp, creationTime} = notifTip.data as NotificationTipPpData;
      const entryPulse: EntryPulse = {
        ah: notifTip.content.hash,
        eh: EntryId.empty().hash,
        ts: creationTime,
        author: from.hash,
        state: {Create: true},
        def: {
          entry_index: getIndexByVariant(ThreadsEntryType, ThreadsEntryType.ParticipationProtocol),
          zome_index: 42,
          visibility: "Public",
        },
        bytes: encode(pp),
      };
      signal = {Entry: entryPulse};
    }

    /* Brutal way to make sure we have the content signaled in the notification */
    //await this.probeAllLatest();
    /** */
    const notif: ThreadsNotification = {
      event: notifTip.event,
      author: notifTip.author,
      timestamp: notifTip.timestamp,
      content: ActionId.from(notifTip.content),
      createLinkAh: notifTip.link_ah,
    }
    /** */
    this.storeNotification(notif, ppAh);
    return signal;
  }


  /** */
  private async notifyPeers(ppAh: ActionId, content: LinkableId, notifs: NotifyPeerInput[]) {
    console.log("notifyPeers()", ppAh, notifs);
    /** Get latest notif settings */
    let settings = await this.pullNotifSettings(ppAh);
    /** Get alls & nevers */
    let nevers = [];
    let alls = [];
    for (const [agent, setting, _ah] of settings) {
      const peer = agent;
      switch (setting) {
        case NotifySetting.Never: nevers.push(peer); break;
        case NotifySetting.AllMessages: alls.push(peer); break;
        default: break;
      }
    }
    /** Keep only notifiable peers */
    const notifieds = [];
    const notifies = notifs
      .filter((notif) => !nevers.map((hash) => enc64(hash)).includes(enc64(notif.who)))
      .map((notif) => {
        notifieds.push(notif.who);
        return this.zomeProxy.notifyPeer(notif);
      });
    /** notify peers with AllMessage notifSetting */
    for (const peer of alls) {
      if (notifieds.includes(peer)) {
        continue;
      }
      const newNotif: NotifyPeerInput = {
        content: content.hash,
        who: peer,
        event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.NewBead),
      }
      notifies.push(this.zomeProxy.notifyPeer(newNotif));
    }
    /** */
    await Promise.all(notifies);
  }
}
