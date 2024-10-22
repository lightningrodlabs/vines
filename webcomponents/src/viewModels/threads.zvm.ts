import {AgentPubKeyB64, Timestamp} from "@holochain/client";
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
  GetLatestBeadsInput,
  GlobalLastProbeLog,
  NotifyPeerInput,
  NotifySetting,
  ParticipationProtocol,
  PublishTopicInput,
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
  ActionIdMap,
  AgentId,
  AnyId,
  AnyIdMap,
  DhtId,
  DnaId,
  enc64,
  EntryId,
  EntryPulse,
  EntryPulseMat,
  getIndexByVariant,
  getVariantByIndex,
  HoloHashType,
  holoIdReviver,
  intoAnyId,
  intoDhtId,
  intoLinkableId,
  LinkableId,
  LinkPulseMat,
  StateChangeType,
  ZomeSignalProtocol,
  ZomeViewModelWithSignals,
} from "@ddd-qc/lit-happ";
import {
  AnyBeadMat,
  base2typed,
  BaseBeadType,
  BeadInfo,
  BeadType,
  dematerializeEntryBead,
  dematerializeTypedBead,
  EncryptedBeadContent,
  EntryBeadMat,
  materializeBead,
  materializeTypedBead,
  NotifiableEvent,
  NotificationTipBeadData,
  NotificationTipPpData,
  TextBeadMat,
  ThreadsAppTip,
  ThreadsNotification,
  ThreadsNotificationTip,
  TypedBaseBead,
  TypedBaseBeadMat,
  TypedBead,
  TypedBeadMat,
  TypedContent,
} from "./threads.materialize";
import {TimeInterval} from "./timeInterval";
import {WAL, weaveUrlFromWal} from "@theweave/api";
//import {prettyTimestamp} from "@ddd-qc/files";
import {Decoder, Encoder} from "@msgpack/msgpack";
import {getThisAppletId, parseMentions, weaveUrlToWal} from "../utils";
import {AuthorshipZvm} from "./authorship.zvm";
import {ThreadsLinkType} from "../bindings/threads.integrity";
import {SpecialSubjectType} from "../events";
import {ThreadsPerspective, ThreadsPerspectiveMutable, ThreadsSnapshot} from "./threads.perspective";
import {Dictionary, HOLOCHAIN_ID_EXT_CODEC} from "@ddd-qc/cell-proxy";
import {MAIN_SEMANTIC_TOPIC, MAIN_TOPIC_ID} from "../utils_feed";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {ThreadsDvm} from "./threads.dvm";
import {THIS_APPLET_ID} from "../contexts";


//generateSearchTest();


/** Better way to catch and handle "throttled" error */
function catchThrottled<T>(promise: Promise<T>): Promise<[undefined, T] | [Error]> {
  return promise
    .then(data => [undefined, data] as [undefined, T])
    .catch(error => {
      if (error.throttled) {
        return [error];
      }
      throw error;
    })
}


/**
 *
 */
export class ThreadsZvm extends ZomeViewModelWithSignals {

  static override readonly ZOME_PROXY = ThreadsProxy;
  get zomeProxy(): ThreadsProxy {return this._zomeProxy as ThreadsProxy;}

  private _encoder= new Encoder(HOLOCHAIN_ID_EXT_CODEC);
  private _decoder= new Decoder(HOLOCHAIN_ID_EXT_CODEC);


  /** -- Perspective -- */

  private _perspective: ThreadsPerspectiveMutable = new ThreadsPerspectiveMutable();

  /* */
  get perspective(): ThreadsPerspective {
    return this._perspective.readonly;
  }

  override comparable(): Object {
    return this.perspective.comparable();
  }


  /** Dump perspective as JSON (caller should call getAllPublicManifest() first) */
  export(authorshipZvm: AuthorshipZvm): string {
    this.storeAttributions(authorshipZvm);
    const snapshot = this._perspective.makeSnapshot();
    return JSON.stringify(snapshot, null, 2);
  }


  /** */
  import(json: string, canPublish: boolean, authorshipZvm: AuthorshipZvm) {
    const snapshot = JSON.parse(json, holoIdReviver) as ThreadsSnapshot;
    console.log("Importing perspective", snapshot);
    if (canPublish) {
      this._canNotify = false;
      /*await*/ this.publishAllFromSnapshot(snapshot, authorshipZvm).then(() => {
        this._canNotify = true;
        this.notifySubscribers();
        (this._dvmParent as ThreadsDvm).importDone();
      });
      return;
    }
    /** Done */
    this._perspective.restore(snapshot, authorshipZvm, this.cell);
    this.notifySubscribers();
    (this._dvmParent as ThreadsDvm).importDone();
  }


  /** Store all attributions in authorship zvm */
  private storeAttributions(originalsZvm: AuthorshipZvm) {
    /** subjects */
    for (const subjectAhB64 of this._perspective.subjects.keys()) {
      const anyId = intoAnyId(subjectAhB64);
      if (anyId.hashType != HoloHashType.Agent) {
        /*await*/ originalsZvm.ascribeTarget("Subject", intoLinkableId(anyId.b64), 0/*TODO: get creationTime of Subject*/, AgentId.empty(), true);
      }
    };
    /** pps */
    for (const [ppAh, thread] of this._perspective.threads.entries()) {
      /*await*/ originalsZvm.ascribeTarget(ThreadsEntryType.ParticipationProtocol, ppAh, thread.creationTime, thread.author, true);
    };
    /** beads */
    for(const [beadAh, [beadInfo, _typed]] of this._perspective.beads.entries()) {
      /*await*/ originalsZvm.ascribeTarget(beadInfo.beadType, beadAh, beadInfo.creationTime, beadInfo.author, true);
    };
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



  // /** TODO */
  // async searchAndProbe(parameters: SearchParameters, limit: number): Promise<[ActionId, BeadInfo, string][]> {
  //   console.log("searchAndProbe()", parameters);
  //   let result: [ActionId, BeadInfo, string][] = [];
  //
  //   /** Maybe initial search is enough */
  //   const initialResult = this._perspective.searchTextBeads(parameters);
  //   if (initialResult.length > limit) {
  //     return initialResult;
  //   }
  //
  //   /** Full probe thread if possible */
  //   if (parameters.threadByName && this._perspective.getPpByName(parameters.threadByName)) {
  //     const ppAh = this._perspective.getPpByName(parameters.threadByName);
  //     await this.pullAllBeads(ppAh)
  //     result = this._perspective.searchTextBeads(parameters);
  //   } else {
  //     // TODO: progressive timeframe search
  //     /** Get beads on all threads within timeframe */
  //     for (const ppAh of this._perspective.getAllPps()) {
  //       await this.pullLatestBeads(ppAh, parameters.afterTs, parameters.beforeTs, limit);
  //     }
  //     result = this._perspective.searchTextBeads(parameters);
  //   }
  //   /** */
  //   return result;
  // }


  /** -- Init -- */

  /** Query all entries from local source-chain */
  override async initializePerspectiveOffline(): Promise<void> {
    console.debug("threadsZvm.initializePerspectiveOffline() START");
    await this.zomeProxy.queryAll();
    console.debug("threadsZvm.initializePerspectiveOffline() END");
  }


  /** */
  override async initializePerspectiveOnline(): Promise<void> {
    console.debug("threadsZvm.initializePerspectiveOnline() START");
    await this.zomeProxy.probeAllHiddens();
    await this.zomeProxy.pullAllSemanticTopics();
    await this.pullAppletIds();
    await this.pullAllSubjects();
    await this.zomeProxy.probeDmThreads();
    await this.zomeProxy.probeInbox();
    await this.pullFavorites();
    /** Grab all threads of other subjects to see if there are new ones */
    let probes: Promise<ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]>>[] = [];
    for (const [subjectAdr, _sub] of this._perspective.getAllSubjects()) {
      probes.push(this.pullSubjectThreads(intoAnyId(subjectAdr)));
    }
    await Promise.all(probes);
    console.debug("threadsZvm.initializePerspectiveOnline() END");
  }


  /** */
  override probeAllInner() {
    this.probeAllInnerAsync();
  }


  /** */
  async probeAllInnerAsync() {
    console.debug("threadsZvm.probeAllInner()", this._perspective.getAllSubjects().length)
    await this.initializePerspectiveOnline();
    /** Get last elements since last time (global probe log) */
    /** WARN: this can commit an entry */
    await this.probeAllLatest();
    this._perspective.print();
  }


  /** -- */

  /** Feed App specific */
  storeMainTopic() {
    this._perspective.storeSemanticTopic(MAIN_TOPIC_ID, MAIN_SEMANTIC_TOPIC, this.cell.address.agentId);
  }


  /** -- Probe: Query the DHT, and store the results (async) -- */

  /** */
  async pullAppletIds(): Promise<EntryId[]> {
    console.log("threadsZvm.probeAllAppletIds()")
    // const appletIds = await this.zomeProxy.getApplets();
    // this._allAppletIds = appletIds.map((eh) => encodeHashToBase64(eh));
    const entryB64s = await this.zomeProxy.pullApplets();
    const list = entryB64s.map((b64) => new EntryId(b64));
    this._perspective.storeAllAppletIds(list);
    console.log("threadsZvm.probeAllAppletIds() list", list);
    this.notifySubscribers();
    return list;
  }

  storeSubject(subject: Subject) {
    this._perspective.storeSubject(subject);
  }

  /** Get all Subjects from the RootAnchor */
  async pullAllSubjects(): Promise<void> {
    const subjects = await this.zomeProxy.pullAllSubjects();
    this._perspective.storeAllSubjects(subjects);
    console.log("threadsZvm.pullAllSubjects()", subjects.length);
    this.notifySubscribers();
  }

  // TODO: probeDnaSubjects()
  // TODO: probeEntryTypeSubjects()


  /** Get all Threads for a subject */
  async pullSubjectThreads(subjectId: AnyId): Promise<ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]>> {
    //console.log("threadsZvm.pullSubjectThreads() start", subjectId);
    /** Skip Agent as it has dm link type to get its pps */
    if (subjectId.hashType == HoloHashType.Agent) {
      return new ActionIdMap();
    }
    /** */
    let merged: ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]> = new ActionIdMap();
    const subjectIds = this._perspective.getAllSubjectVersions(subjectId);
    //console.log("threadsZvm.pullSubjectThreads() subjectIds", subjectIds.length);
    for (const subjectId of subjectIds) {
      const [throttleError, tuples] = await catchThrottled(this.pullSubjectVersionThreads(subjectId));
      if (throttleError) {
        continue; // pullSubjectThreads() might be called multiple times for the same subject
      }
      //console.log("threadsZvm.pullSubjectThreads() subjectId", tuples.size);
      merged = new ActionIdMap([...merged, ...tuples]);
    }
    //console.log("threadsZvm.pullSubjectThreads() end", merged.size);
    return merged;
  }


  /** */
  async pullSubjectVersionThreads(subjectId: AnyId): Promise<ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]>> {
    let res: ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]> = new ActionIdMap();
    const pps = await this.zomeProxy.probePpsFromSubjectHash(subjectId.hash);
    for (const [pp_ah, _linkTs] of pps) {
      const ppAh = new ActionId(pp_ah);
      //console.log("threadsZvm.pullSubjectVersionThreads() subjectId", subjectId.short);
      const [throttleError, maybe] = await catchThrottled(this.zomeProxy.fetchPp(pp_ah));
      if (throttleError) {
        continue;
      }
      if (maybe) {
        const [pp, ts, author] = maybe;
        res.set(ppAh, [pp, ts, new AgentId(author)]);
      } else {
        console.warn("ParticipationProtocol not found", ppAh.b64);
      }
    }
    return res;
  }


  /** Get all SubjectTypes for a AppletId */
  async pullAppletSubjectTypes(appletId: EntryId): Promise<void> {
    //const appletHash = decodeHashFromBase64(appletId);
    let subjectTypesRaw = await this.zomeProxy.findSubjectTypesForApplet(appletId.b64);
    this._perspective.storeSubjectTypesForApplet(appletId, subjectTypesRaw);
    this.notifySubscribers();
  }


  /** Get all subjects from a subjectType path */
  async findSubjects(appletId: EntryId, typePathEh: EntryId): Promise<[DnaId, AnyId][]> {
    const subjectType = this._perspective.getSubjectType(appletId, typePathEh);
    if (!subjectType) {
      throw Promise.reject("Unknown appletId or typePathHash");
    }
    const subjects = await this.zomeProxy.findSubjectsByType({appletId: appletId.b64, subjectType});
    const subjectB64s: [DnaId, AnyId][] = subjects.map(([dnaHash, subjectHash]) => [new DnaId(dnaHash), intoAnyId(subjectHash)]);
    this._perspective.storeSubjectsWithType(typePathEh, subjectB64s);
    this.notifySubscribers();
    return subjectB64s;
  }


  /** */
  async probeAllLatest(): Promise<void> {
    const latest = await this.zomeProxy.probeAllLatest(this._perspective.globalProbeLogTs);
    await this.commitUpdateGlobalLog(latest.searchedInterval.end);

    /* newThreads (filter out my threads) */
    const newThreads: [ActionId, AnyId][] = [];
    for (const [subject_hash, pp_ah] of latest.newThreadsBySubject) {
      const ppAh = new ActionId(pp_ah)
      //const _ppMat = await this.fetchPp(ppAh);
      let maybeThread = this._perspective.threads.get(ppAh);
      if (maybeThread && !maybeThread.author.equals(this.cell.address.agentId)) {
        newThreads.push([ppAh, intoAnyId(subject_hash)]);
      }
    }
    //console.log("probeAllLatest:     newThreads", newThreads);
    this._perspective.storeAllNewThreads(newThreads);

    /* unreadThreads: Map new beads to their threads */
    let unreadThreads: ActionIdMap<[AnyId, ActionId[]]> = new ActionIdMap();
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
      if (bl.creationTime <= maybeThread.latestProbeLogTime || this.cell.address.agentId.equals(bl.author)) {
        return;
      }
        const subjectAddr = intoAnyId(maybeThread.pp.subject.address);
        if (!unreadThreads.get(ppAh)) {
          unreadThreads.set(ppAh, [subjectAddr, []]);
        }
        unreadThreads.get(ppAh)![1].push(new ActionId(bl.beadAh));
    });
    console.log("threadsZvm.probeAllLatest() unreadThreads done", JSON.stringify(unreadThreads));
    this._perspective.storeAllUnreadThreads(unreadThreads);

    /** Done */
    this.notifySubscribers();
  }


  /** TODO: maybe cache value ; check when pulling latest is actually necessary  */
  async pullNotifSettings(ppAh: ActionId): Promise<[AgentId, NotifySetting, ActionId][]> {
    //this._perspective.notifSettings.delete(ppAh);
    const [throttleError, notifSettings] = await catchThrottled(this.zomeProxy.pullPpNotifySettings(ppAh.hash));
    if (throttleError) {
      return [];
    }
    return notifSettings.map(([a, n, c]) => [new AgentId(a), n, new ActionId(c)]);
  }


  /**  */
  async pullFavorites() {
    const favorites = await this.zomeProxy.probeMyFavorites();
    for (const fav_ah of favorites) {
      const beadAh = new ActionId(fav_ah);
      await this.fetchUnknownBead(beadAh);
    }
  }


  /** Probe all emojis on this bead */
  async pullEmojiReactions(beadAh: ActionId) {
    await catchThrottled(this.zomeProxy.pullReactions(beadAh.hash));
  }


  /** Get all beads from a thread */
  async pullAllBeads(ppAh: ActionId): Promise<BeadLink[]> {
    console.log("pullAllBeads()", ppAh);
    const thread = this._perspective.threads.get(ppAh);
    if (!thread) {
      console.warn("pullAllBeads() Failed. Unknown thread:", ppAh);
      return [];
    }
    /** Probe */
    const [throttleError, maybe] = await catchThrottled(this.zomeProxy.findBeads(ppAh.hash));
    if (throttleError) {
      return [];
    }
    const [interval, beadLinks] = maybe;
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
      // } catch(e:any) {
        console.error("pullLatestBeads() Failed. ParticipationProtocol not found");
        return [];
      //}
      //thread = this._threads.get(ppAh);
    }
    /** Probe the latest beads */
    try {
      const [searchedInterval, beadLinks] = await this.zomeProxy.findLatestBeads(
        {pp_ah: ppAh.hash, begin_time, end_time, target_limit} as GetLatestBeadsInput);
      /** Cache them */
      await this.fetchBeads(ppAh, beadLinks, TimeInterval.new(searchedInterval));
      /** Check if beginning of time reached */
      console.log("pullLatestBeads() begin", searchedInterval.begin, thread.creationTime);
      if (searchedInterval.begin <= thread.creationTime) {
        thread.setHasSearchedOldestBead();
      }
      /** Done */
      return beadLinks;
    } catch(e:any) {
      if (!e.throttled) {
        return Promise.reject(e);
      }
      return [];
    }
  }


  /** Try to get older beads from the currently known oldest bead of a thread */
  async probePreviousBeads(ppAh: ActionId, limit: number): Promise<BeadLink[]> {
    const thread = this._perspective.threads.get(ppAh);
    console.log("probePreviousBeads", ppAh, thread);
    if (!thread) {
      throw Promise.reject("No Thread data found for given ParticipationProtocol");
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
      //if (!thread) {
      throw Promise.reject("Unknown thread: " + ppAh);
      //}
    }
    if (!prevBeadAh) {
      const lastKnownBeadOnThread = thread.getLast(1);
      if (lastKnownBeadOnThread && lastKnownBeadOnThread.length > 0) {
        prevBeadAh = lastKnownBeadOnThread[0]!.beadAh;
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
    const beadAuthor = author? author : this.cell.address.agentId;
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
    // @ts-ignore
    let bucket_ts: Timestamp;
    let bead_ah: Uint8Array;
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
      agent = this.cell.address.agentId;
    }
    /*const _maybe_link_ah =*/ await this.zomeProxy.publishNotifySetting({
      pp_ah: ppAh.hash,
      setting,
      agent: agent.hash,
    } as SetNotifySettingInput);
  }


  /** */
  async editSemanticTopic(old_ah: ActionId, title: string/*, preventStoring?: boolean*/) : Promise<ActionId> {
    const ah = await this.zomeProxy.updateSemanticTopic({ah: old_ah.hash, topic: {title}});
    const newAh = new ActionId(ah);
    // this._perspective.unstoreSemanticTopic(old_eh);
    // if (!preventStoring) {
    //   this._perspective.storeSemanticTopic(newAh, title);
    // }
    // console.log("editSemanticTopic()", title, newAh.short);
    // //console.log("editSemanticTopic()", this._perspective.allSemanticTopics);
    // /** Done */
    // this.notifySubscribers();
    return newAh;
  }


  /** */
  async publishSemanticTopic(title: string) : Promise<ActionId> {
    const input: PublishTopicInput ={
      appletId: THIS_APPLET_ID.b64,
      topic: {title},
    };
    const eh = await this.zomeProxy.publishSemanticTopic(input);
    return new ActionId(eh);
  }


  /** */
  async publishParticipationProtocol(pp: ParticipationProtocol): Promise<[Timestamp, ActionId]> {
    const [pp_ah, ts] = await this.zomeProxy.publishParticipationProtocol(pp);
    return [ts, new ActionId(pp_ah)];
  }


    /** */
  async publishThreadFromSemanticTopic(appletId: EntryId, topicAh: ActionId, purpose: string): Promise<[number, ActionId]> {
    console.log("publishThreadFromSemanticTopic()", appletId);
    const [semTopicTitle, _semAuthor] = this._perspective.semanticTopics.get(topicAh)!;
    const subject: Subject = {
      address: topicAh.b64,
      name: semTopicTitle,
      typeName: SpecialSubjectType.SemanticTopic,
      appletId: appletId.b64,
      dnaHashB64: this.cell.address.dnaId.b64,
    };
    const pp: ParticipationProtocol = {
      purpose,
      rules: "N/A",
      subject,
    }
    const [pp_ah, ts] = await this.zomeProxy.publishParticipationProtocol(pp);
    /** */
    return [ts, new ActionId(pp_ah)];
  }


  /** -- Fetch -- */

  /** */
  async fetchPp(ppAh: ActionId): Promise<[ParticipationProtocol, Timestamp, AgentId] | null> {
    const maybeThread = this._perspective.threads.get(ppAh);
    console.log("ThreadsZvm.fetchPp()", ppAh, !!maybeThread);
    if (maybeThread) {
      return [maybeThread.pp, maybeThread.creationTime, maybeThread.author];
    }
    const [throttleError, maybe] = await catchThrottled(this.zomeProxy.fetchPp(ppAh.hash));
    if (throttleError) {
      return null;
    }
    if (!maybe) {
      console.warn(`ParticipationProtocol not found at hash ${ppAh.b64}`);
      return null;
    }
    const [pp, ts, author] = maybe;
    console.log("ThreadsZvm.fetchPp() pp", pp);
    //await this.fetchThreadHideState(ppAh, pp, encodeHashToBase64(author));
    return [pp, ts, new AgentId(author)];
  }


  /** */
  async fetchUnknownBead(beadAh: ActionId, /*canNotify: boolean, alternateCreationTime?: Timestamp*/): Promise<[TypedBead, BeadType, Timestamp, AgentId] | null> {
    console.log("fetchUnknownBead()", beadAh.short);
    const beadInfo = this._perspective.getBeadInfo(beadAh);
    /** Return info if bead already stored */
    if (beadInfo) {
      const typed = this._perspective.getBead(beadAh);
      return [dematerializeTypedBead(typed!, beadInfo.beadType), beadInfo.beadType, beadInfo.creationTime, beadInfo.author];
    }
    /** */
    let bead_ah = beadAh.hash;
    let creationTime: Timestamp;
    let author: Uint8Array;
    let typed: TypedBead;
    let type: BeadType;

    const textTuple = await this.zomeProxy.fetchTextBead(bead_ah);
    if (textTuple == null) {
      const entryTuple = await this.zomeProxy.fetchEntryBead(bead_ah);
      if (entryTuple == null) {
        const anyTuple = await this.zomeProxy.fetchAnyBead(bead_ah);
        if (anyTuple == null) {
          const maybe = await this.zomeProxy.fetchEncBead(bead_ah);
          if (!maybe) {
            console.warn(`Bead not found at hash ${beadAh.b64}`);
            return null;
          }
          [creationTime, author, typed] = maybe;
          type = ThreadsEntryType.EncryptedBead;
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
    return [typed, type, creationTime, new AgentId(author)];
  }


  /** */
  async fetchTypedBead(beadAh: ActionId, beadType: BeadType/*, canNotify: boolean, alternateCreationTime?: Timestamp*/): Promise<void> {
    if (this._perspective.getBeadInfo(beadAh)) {
      return;
    }
    try {
      switch (beadType) {
        case ThreadsEntryType.TextBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchTextBead(beadAh.hash); break;
        case ThreadsEntryType.EntryBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchEntryBead(beadAh.hash); break;
        case ThreadsEntryType.AnyBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchAnyBead(beadAh.hash); break;
        case ThreadsEntryType.EncryptedBead: /*[creationTime, author, typed] =*/ await this.zomeProxy.fetchEncBead(beadAh.hash); break;
      }
    } catch(e:any) {
      console.error(e);
      throw Promise.reject("Bead not found at " + beadAh.short);
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
    console.log("deleteNotification()", linkAh.short, this._perspective.inbox, this._perspective.inboxByThread);
    /** Delete all new bead notifications from same author in same thread */
    const [ppAh, notif] = this._perspective.inbox.get(linkAh)!;
    if (notif.event == NotifiableEvent.NewBead) {
      const notifs = this._perspective.inboxByThread.get(ppAh)!;
      for (const [_author, createLinkAh] of notifs) {
        const prev = this._perspective.inbox.get(createLinkAh)![1];
        if (prev.event == NotifiableEvent.NewBead && prev.author.equals(notif.author) && !linkAh.equals(createLinkAh)) {
          console.log("deleteNotification() unpublish similar", createLinkAh.short);
          await this.zomeProxy.unpublishNotification(createLinkAh.hash);
        }
      }
    }
    /** */
    console.log("deleteNotification() unpublish", linkAh.short);
    await this.zomeProxy.unpublishNotification(linkAh.hash);
  }


  /** */
  async flushInbox(): Promise<void> {
    for (const [linkAh, _pair] of this._perspective.getAllNotifications()) {
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
  async fetchPpAhFromNotification(notif: ThreadsNotification): Promise<ActionId | null> {
    console.log("getPpFromNotification()", notif.event);
    if (NotifiableEvent.Fork === notif.event || NotifiableEvent.NewDmThread === notif.event) {
      return notif.content;
    } else {
      const maybeBeadInfo = this._perspective.getBeadInfo(notif.content);
      if (maybeBeadInfo) {
        return maybeBeadInfo.bead.ppAh;
      }
      const maybe = await this.fetchUnknownBead(notif.content);
      if (!maybe) {
        return null;
      }
      const [typed, beadType, _ts, _author] = maybe;
      const [base, _baseType] = await this.getBaseTypedBead(notif.content, typed, beadType, notif.author); // WARN: Assuming notif sender is also bead author
      return new ActionId(base.bead.ppAh);
    }
  }


  /** -- -- */

  /** */
  async createDmThread(otherAgent: AgentId, weServices?: WeServicesEx): Promise<ActionId> {
    if (this.cell.address.agentId.equals(otherAgent)) {
      throw Promise.reject("Can't DM self");
    }
    /** Give current if already exists */
    const maybePpAh = this._perspective.dmAgents.get(otherAgent);
    if (maybePpAh) {
      await this.unhideDmThread(otherAgent);
      return maybePpAh;
    }
    /** Create new Thread */
    const pp_ah = await this.zomeProxy.publishDmThread({otherAgent: otherAgent.hash, appletId: getThisAppletId(weServices)});
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
      if (this.cell.address.agentId.equals(other)) {
        other = new AgentId(intoAnyId(thread.pp.subject.address).b64);
      }
      return other;
    }
    return null;
  }


  /** */
  async storeTypedBead(beadAh: ActionId, typedBead: TypedBeadMat, beadType: BeadType, creationTime: Timestamp, author: AgentId, isNew: boolean) {
    console.debug("ThreadsZvm.storeTypedBead()", beadAh.short);
    /** pre */
    if (this._perspective.getBeadInfo(beadAh)) {
      return;
    }
    if (!typedBead) {
      console.error("storeTypedBead() Trying to store a null Bead");
      return;
    }
    /** Check if encrypted */
    let beadInfo: BeadInfo;
    let innerPair: [BeadInfo, TypedBaseBeadMat] | undefined = undefined;
    if (beadType == ThreadsEntryType.EncryptedBead) {
      console.debug("ThreadsZvm.storeTypedBead() EncryptedBead", beadAh.short);
      /** Get inner */
      const [innerTyped, innerBeadType] = await this.getBaseTypedBead(beadAh, dematerializeTypedBead(typedBead, beadType), beadType, author);
      /** Store inner Bead */
      const bead = innerTyped.bead;
      const innerBeadInfo = {creationTime, author, beadType: innerBeadType, bead: materializeBead(bead)} as BeadInfo;
      beadInfo = {creationTime, author, beadType: ThreadsEntryType.EncryptedBead, bead: materializeBead(bead)} as BeadInfo;
      innerPair = [innerBeadInfo, materializeTypedBead(innerTyped, innerBeadType) as TypedBaseBeadMat];
    } else {
      const bead = (typedBead as TypedBaseBeadMat).bead;
      beadInfo = {creationTime, author, beadType, bead} as BeadInfo;
      console.log("storeBead()", beadAh, bead.ppAh, typedBead, author);
    }
    /** Store in perspective */
    this._perspective.storeTypedBead(beadAh, beadInfo, typedBead, isNew, innerPair);
  }


  /** */
  _decCache: ActionIdMap<BaseBeadKind> = new ActionIdMap<BaseBeadKind>(); // Cache result to avoid throttle
  async getBaseTypedBead(beadAh: ActionId, typedBead: TypedBead, beadType: BeadType, author: AgentId): Promise<[TypedBaseBead, BaseBeadType]> {
    console.log("getBaseTypedBead()", beadAh.short);
    if (beadType == ThreadsEntryType.EncryptedBead) {
      if (this._decCache.get(beadAh)) {
        return base2typed(this._decCache.get(beadAh)!);
      }
      let innerBead: BaseBeadKind;
      if (author.equals(this.cell.address.agentId)) {
        innerBead = await this.zomeProxy.decryptMyBead(typedBead as EncryptedBead);
      } else {
        innerBead = await this.zomeProxy.decryptBead({
          encBead: typedBead as EncryptedBead,
          otherAgent: author.hash,
        });
      }
      this._decCache.set(beadAh, innerBead);
      return base2typed(innerBead);
    }
    return [typedBead as TypedBaseBead, beadType];
  }


  /** -- commit search logs -- */

  /** */
  async commitAllProbeLogs(): Promise<void> {
    console.log("commitAllProbeLogs() start");
    await this.commitUpdateGlobalLog();
    /** Commit each Thread Log */
    for (const ppAh of this._perspective.getAllPps()) {
      await this.commitThreadProbeLog(ppAh);
    }
  }


  /** Commit Global Log */
  async commitUpdateGlobalLog(maybe_ts?: Timestamp): Promise<void> {
    const maybeLatest = this.perspective.getLatestThread();
    console.log("commitUpdateGlobalLog() maybeLatest", maybeLatest);
    const input: any = {};
    if (maybe_ts) input.maybe_ts = maybe_ts;
    if (maybeLatest) input.maybe_last_known_pp_ah = maybeLatest[0].hash;
    await this.zomeProxy.commitUpdateGlobalLog(input as CommitGlobalLogInput);
  }


  /** */
  async commitThreadProbeLog(ppAh: ActionId): Promise<void> {
    const thread = this._perspective.threads.get(ppAh);
    if (!thread || !thread.probedUnion || thread.probedUnion.end <= thread.latestProbeLogTime) {
      return;
    }
    console.log(`commitThreadProbeLog() Thread "${thread.pp.purpose}":`, thread.probedUnion, thread.latestProbeLogTime, thread.beadLinksTree, thread.beadLinksTree.length);
    const probeLog: ThreadLastProbeLog = {ppAh: ppAh.hash, ts: 0};
    if (thread.beadLinksTree.end.value) probeLog.maybeLastKnownBeadAh = thread.beadLinksTree.end.value.beadAh.hash;
    if (thread.beadLinksTree.end.key) probeLog.ts = thread.beadLinksTree.end.key;
    console.log(`commitThreadProbeLog() probeLog:`, probeLog);
    await this.zomeProxy.commitThreadLog(probeLog);
  }


  /** -- Misc. -- */

  /** */
  async publishAllFromSnapshot(snapshot: ThreadsSnapshot, authorshipZvm: AuthorshipZvm) {
    console.debug("PubImp() START");

    /** Reset */
    this._perspective = new ThreadsPerspectiveMutable();

    /** -- SemanticTopics -- */
    const topicMapping: ActionIdMap<ActionId> = new ActionIdMap();
    /** Publish each Latest Topic */
    for (const [topicAhB64, title] of Object.values(snapshot.semanticTopics)) {
      const newTopicAh =  await this.publishSemanticTopic(title);
      topicMapping.set(new ActionId(topicAhB64), newTopicAh);
    }

    /** -- Subjects -- */
    /** Create mapping between subject hash and subject type */
    const ppAhs = snapshot.pps.map((tuple) => tuple[0]);
    const entryAsSubjects: Dictionary<ThreadsEntryType> = {};
    for (const [subjectHash, _subject] of Object.values(snapshot.subjects)) {
      if (ppAhs.includes(subjectHash)) {
        entryAsSubjects[subjectHash] = ThreadsEntryType.ParticipationProtocol;
        continue;
      }
      const maybeBeadIndex = snapshot.beads.findIndex(([a, _b, _c]) => a == subjectHash);
      if (maybeBeadIndex > -1) {
        const tuple = snapshot.beads[maybeBeadIndex]!;
        entryAsSubjects[subjectHash] = tuple[1].beadType as ThreadsEntryType;
        continue;
      }
      if (topicMapping.get(ActionId.from(subjectHash))) {
        entryAsSubjects[subjectHash] = ThreadsEntryType.SemanticTopic;
        continue;
      }
      // FIXME: Figure out how to map ppAh used as subjectHash
      // Check if its an ActionHash?
      // or check on export if ppAh has "threads" link off of it and add that to the perspective?
    }
    console.debug("PubImp() entryAsSubjects", entryAsSubjects);

    /** -- Threads & Beads -- */
    const ppAhMapping: ActionIdMap<ActionId> = new ActionIdMap();
    const beadAhMapping: ActionIdMap<ActionId> = new ActionIdMap();
    /* Sort PPs by creation time */
    const sortedPps: [ActionId, ParticipationProtocol, Timestamp, AgentId][] = Object.values(snapshot.pps)
      .sort(([_ppAhA, _ppA, creationTimeA], [_ppAhB, _ppB, creationTimeB]) => {return creationTimeA - creationTimeB})
      .map(([a, b, c, d]) => [new ActionId(a), b, c, new AgentId(d)])
    /* Sort Beads by creation time, so they can get their prev bead mapped ah */
    const sortedBeads: [string, BeadInfo, TypedBeadMat][] = Object.values(snapshot.beads).sort(
      ([_beadAhA, beadInfoA, _typedBeadA], [_beadAhB, beadInfoB, _typedBeadB]) => {
        return beadInfoA.creationTime - beadInfoB.creationTime
      })
    /* loop until all beads & pps have been processed ; check if progress is made, otherwise abort */
    let loopCount = 0;
    while(ppAhMapping.size != sortedPps.length || beadAhMapping.size != sortedBeads.length) {
      const totalStart = ppAhMapping.size + beadAhMapping.size;
      console.debug(`PubImp() Loop ${loopCount}: PP: ${ppAhMapping.size}/${sortedPps.length} | Beads: ${beadAhMapping.size}/${sortedBeads.length}`);
      /* Threads: Publish & Map */
      for (const [ppAh, pp, creationTime, _a] of Object.values(sortedPps)) {
        if (ppAhMapping.get(ppAh)) {
          continue;
        }
        /* Grab subject mapping */
        const maybeEntrySubject = entryAsSubjects[pp.subject.address];
        if (maybeEntrySubject) {
          const subjectAh = new ActionId(pp.subject.address);
          switch (maybeEntrySubject) {
            case ThreadsEntryType.ParticipationProtocol: {
              const newSubjectHash = ppAhMapping.get(subjectAh);
              if (!newSubjectHash) {
                continue;
              }
              pp.subject.address = newSubjectHash.b64;
            }
            break;
            case ThreadsEntryType.SemanticTopic: {
              const newSubjectHash = topicMapping.get(subjectAh);
              if (!newSubjectHash) {
                continue;
              }
              pp.subject.address = newSubjectHash.b64;
            }
            break;
            default: {
              const newSubjectHash = beadAhMapping.get(subjectAh);
              if (!newSubjectHash) {
                continue;
              }
              pp.subject.address = newSubjectHash.b64;
            }
          }
        }
        /* Publish pp */
        const [throttleError, maybePair] = await catchThrottled(this.zomeProxy.publishParticipationProtocol(pp));
        if (throttleError) {
          continue;
        }
        const [pp_ah, _ts] = maybePair
        const newPpAh = new ActionId(pp_ah);
        ppAhMapping.set(ppAh, newPpAh);
        /* Publish author of new ppAh */
        let authorshipLog = authorshipZvm.perspective.getAuthor(ppAh);
        if (authorshipLog) {
          await authorshipZvm.ascribeTarget(ThreadsEntryType.ParticipationProtocol, newPpAh, authorshipLog[0], authorshipLog[1]);
        } else {
          authorshipLog = [creationTime, this.cell.address.agentId];
        }
        /* Store pp */
        this._perspective.storeThread(this.cell, newPpAh, pp, authorshipLog[0], authorshipLog[1], false);
        console.log(`PubImp() PP ${ppAh.short} -> ${newPpAh.short}`, authorshipLog[0]);
      }
      // FIXME: use Promise.AllSettled();

      /* Beads */
      for (const [beadAhB64, beadInfo, typedBead] of Object.values(sortedBeads)) {
        const beadAh = new ActionId(beadAhB64);
        if (beadAhMapping.get(beadAh)) {
          continue;
        }
        //console.debug("PubImp() Bead", prettyTimestamp(beadInfo.creationTime), beadAh.short);
        /* Grab pp mapping */
        const newPpAh = ppAhMapping.get(beadInfo.bead.ppAh);
        if (!newPpAh) {
          console.warn("PubImp() bead aborted. Pp mapping not found.", beadInfo.bead.ppAh);
          continue;
        }
        //console.debugdebug(`PubImp() Bead newPpAh: ${newPpAh.short}`);
        /* Grab prev bead mapping */
        let newPrevBeadAh: ActionId | undefined = undefined;
        if (beadInfo.bead.prevBeadAh.equals(beadInfo.bead.ppAh)) {
          newPrevBeadAh = newPpAh;
        } else {
          newPrevBeadAh = beadAhMapping.get(beadInfo.bead.prevBeadAh);
        }
        if (!newPrevBeadAh) {
          console.warn("PubImp() Missing prev Bead", beadInfo.bead.prevBeadAh);
          continue;
        }
        const nextBead: Bead = {ppAh: newPpAh.hash, prevBeadAh: newPrevBeadAh.hash};
        /* Determine Bead content */
        let content: TypedContent | EntryBeadMat | EncryptedBeadContent;
        switch(beadInfo.beadType) {
          case ThreadsEntryType.EncryptedBead: {
            /** Don't do encrypted beads */
            continue;
            // const encBead = typedBead as EncryptedBead;
            // const otherAgent: AgentId = beadInfo.author.b64 != this.cell.address.agentId.b64
            //   ? beadInfo.author
            //   : new AgentId(this._perspective.threads.get(beadInfo.bead.ppAh)!.pp.subject.address);
            // content = {encBead, otherAgent};
          } break;
          case ThreadsEntryType.TextBead: content = (typedBead as TextBeadMat).value; break;
          //case ThreadsEntryType.EntryBead: content = (typedBead as EntryBeadMat).sourceEh; break;
          case ThreadsEntryType.EntryBead: content = (typedBead as EntryBeadMat); break;
          case ThreadsEntryType.AnyBead:
            const typedAny = typedBead as AnyBeadMat;
            try {
              content = weaveUrlToWal(typedAny.value);
            } catch(e) {
              console.warn("weaveUrlToWal() failed during import & publish:", e);
              continue;
            }
            break;
        }
        /* Publish bead */
        let authorshipLog = authorshipZvm.perspective.getAuthor(beadAh);
        if (!authorshipLog) {
          authorshipLog = [beadInfo.creationTime, this.cell.address.agentId];
        }
        const beadType = beadInfo.beadType == ThreadsEntryType.EntryBead ? "EntryBeadImport" : beadInfo.beadType as BeadType; // copy entry bead verbatim
        const [newBeadAh, _global_time_anchor, _newTm] = await this.publishTypedBeadAt(beadType, content, nextBead, authorshipLog[0], authorshipLog[1]);
        beadAhMapping.set(beadAh, newBeadAh);
        /** Publish authorship for new bead */
        if (authorshipZvm.perspective.getAuthor(beadAh) != undefined) {
          await authorshipZvm.ascribeTarget(beadInfo.beadType, newBeadAh, beadInfo.creationTime, beadInfo.author);
        }
        console.debug(`PubImp() Bead ${beadAh.short} -> ${newBeadAh.short}`, authorshipLog[0]);
      }
      /* Break loop if no progress made */
      const totalEnd = ppAhMapping.size + beadAhMapping.size;
      if (totalEnd == totalStart) {
        console.warn("PubImp() Publish loop ended because no progress made: " + totalEnd + " / " + (sortedPps.length + sortedBeads.length));
        break;
      }
      loopCount += 1
    }
    console.debug(`PubImp() looped ${loopCount} times. pps: ${ppAhMapping.size}/${sortedPps.length} ; beads: ${beadAhMapping.size}`);
    //console.log("PubImp() beads", this.perspective.beads);

    /** -- EmojiReactions -- */
    /** Publish each reaction link with bead mapping */
    for (const [beadAhB64, pairs] of Object.values(snapshot.emojiReactions)) {
      const beadAh = new ActionId(beadAhB64);
      for (const [author, emojis] of pairs) {
        const newBeadAh = beadAhMapping.get(beadAh);
        if (!newBeadAh) {
          console.warn("PubImp() Bead not found in mapping", beadAh);
          continue;
        }
        const new_bead_ah = newBeadAh!.hash;
        const from = new AgentId(author).hash;
        for (const emoji of emojis) {
          await this.zomeProxy.publishReaction({bead_ah: new_bead_ah, from, emoji});
          ///*const succeeded =*/await this.storeEmojiReaction(beadAh, author, emoji);
        }
      }
    }

    /** -- Favorites -- */
    /** Publish each Favorite link with bead mapping */
    for (const oldBeadAh of snapshot.favorites) {
      const newBeadAh = beadAhMapping.get(new ActionId(oldBeadAh));
      if (!newBeadAh) {
        console.log("Favorite bead not found:", oldBeadAh, beadAhMapping);
        continue;
      }
      await this.addFavorite(newBeadAh);
    }

    /** -- Hidden -- */
    /** Publish each hidden link with mapping if it's an EntryHash */
    for (const anyHashB64 of snapshot.hiddens) {
      const anyHash = intoDhtId(anyHashB64);
      if (anyHash.hashType == HoloHashType.Entry) {
        await this.hideSubject(anyHash);
      } else {
        const ah = new ActionId(anyHashB64);
        const newPpAh = ppAhMapping.get(ah);
        if (!newPpAh) {
          console.log("Hidden subject unknown:", ah);
          continue;
        }
        await this.hideSubject(newPpAh);
      }
    }

    /** other */
    await this.pullAllSubjects(); // ?? better to call probeAll ??
  }


  /** Form TypedBasedBead from content and bead */
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


  /** -- Signaling / Notifying -- */

  /** */
  async castNotificationTip(linkAh: ActionId, agent: AgentId, notification: ThreadsNotification, extra: NotificationTipBeadData | NotificationTipPpData): Promise<void> {
    let ppAh = notification.content;
    if (NotifiableEvent.Mention === notification.event || NotifiableEvent.Reply === notification.event
      || NotifiableEvent.NewBead === notification.event) {
      const beadAh = notification.content;
      const beadInfo = this._perspective.getBeadInfo(beadAh);
      ppAh = beadInfo!.bead.ppAh;
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
    const notifTip: ThreadsAppTip = {type: "notification", data: notificationTip};
    const serTip = this._encoder.encode(notifTip);
    await this.broadcastTip({App: serTip}, [agent]);
    return;
  }


  /** */
  protected override async handleLinkPulse(pulse: LinkPulseMat, from: AgentId) {
    //const isSignalFromSelf = this.cell.address.agentId.equals(from);
    const isAuthorSelf = this.cell.address.agentId.equals(pulse.author);

    switch(pulse.link_type) {
      case ThreadsLinkType.Inbox:
        this.handleInboxLink(pulse, from);
      break;
      case ThreadsLinkType.Hide:
        if (!isAuthorSelf) {
          return;
        }
        console.log("handleLinkPulse() hide", pulse.target);
        this._perspective.storeHidden(pulse.target, StateChangeType.Create == pulse.state);
      break;
      case ThreadsLinkType.Dm: {
        console.log("handleLinkPulse() Dm", pulse.base.short);
        const targetAh = new ActionId(pulse.target.b64);
        const forPeer = AgentId.from(pulse.base);
        const isForMe = forPeer.equals(this.cell.address.agentId);
        if (!isAuthorSelf && !isForMe) {
          return;
        }
        await this.fetchPp(targetAh);
        /** Notify peer of DmThread */
        if (!isForMe && pulse.isNew) {
          await this.zomeProxy.notifyPeer({content: targetAh.hash, who: forPeer.hash, event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.NewDmThread)});
        }
      }
      break;
      case ThreadsLinkType.EmojiReaction: {
        const baseAh = new ActionId(pulse.base.b64);
        if (StateChangeType.Create == pulse.state) {
          const decoder = new TextDecoder('utf-8');
          const emoji = decoder.decode(pulse.tag);
          //console.warn("EmojiReaction CreateLink:", link.tag, emoji);
          this._perspective.storeEmojiReaction(baseAh, pulse.author, emoji);
        }
        if (StateChangeType.Delete == pulse.state) {
          const decoder = new TextDecoder('utf-8');
          const emoji = decoder.decode(pulse.tag);
          //console.warn("EmojiReaction DeleteLink:", link.tag, emoji);
          this._perspective.unstoreEmojiReaction(baseAh, pulse.author, emoji);
        }
      }
      break;
      case ThreadsLinkType.NotifySetting: {
        console.log("handleLinkPulse() NotifySetting", pulse.base.short);
        const baseAh = new ActionId(pulse.base.b64);
        if (StateChangeType.Create == pulse.state) {
          const index = pulse.tag[0] as number;
          const setting = getVariantByIndex(NotifySetting, index) as NotifySetting;
          //console.warn("NotifySetting CreateLink:", link.tag, setting, index);
          const peer = AgentId.from(pulse.target);
          this._perspective.storeNotifSetting(baseAh, peer, setting);
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
          this._perspective.storeFavorite(targetAh);
        }
        if (StateChangeType.Delete == pulse.state) {
          this._perspective.unstoreFavorite(targetAh);
        }
      }
      break;
    }
  }


  _authorCache: AnyIdMap<AgentId> = new AnyIdMap<AgentId>();

  /** */
  async getRecordAuthor(dh: DhtId): Promise<AgentId> {
    const maybe = this._authorCache.get(dh.b64);
    if (maybe) {
      return maybe;
    }
    const a = await this.zomeProxy.getRecordAuthor(dh.hash);
    const id = new AgentId(a);
    this._authorCache.set(dh.b64, id);
    return id;
  }


  /** */
  protected override async handleEntryPulse(pulse: EntryPulseMat, from: AgentId) {
    console.log("ThreadsZvm.handleEntryPulse()", pulse, from.short);
    //const isSignalFromSelf = this.cell.address.agentId.equals(from);
    const isEntryFromSelf = this.cell.address.agentId.equals(pulse.author);

    switch(pulse.entryType) {
      case ThreadsEntryType.EncryptedBead:
      case ThreadsEntryType.AnyBead:
      case ThreadsEntryType.EntryBead:
      case ThreadsEntryType.TextBead:
        const encBead = this._decoder.decode(pulse.bytes) as TypedBead;
        if (StateChangeType.Create == pulse.state) {
          try {
            await this.handleBeadEntryPulse(pulse, encBead, from);
          } catch(_e) {
            /** skip encryptedBead not for me */
          }
        }
        break;
      case ThreadsEntryType.SemanticTopic:
        const semTopic = this._decoder.decode(pulse.bytes) as SemanticTopic;
        if (StateChangeType.Create == pulse.state) {
          this._perspective.storeSemanticTopic(pulse.ah, semTopic.title, pulse.author);
        }
        if (StateChangeType.Update == pulse.state) {
          console.log("Update SemanticTopic", pulse);
          this._perspective.updateSemanticTopic(pulse.ah, pulse.origAh!, semTopic.title, pulse.author);
        }
        break;
      case ThreadsEntryType.ParticipationProtocol:
        const pp= this._decoder.decode(pulse.bytes) as ParticipationProtocol;
        /** Skip DM PP's for other agents */
        if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
          const forAgent = new AgentId(pp.subject.address);
          if (!isEntryFromSelf && !this.cell.address.agentId.equals(forAgent)) {
            console.debug("DM PP not for  me");
            return;
          }
        }
        /** */
        if (StateChangeType.Create == pulse.state) {
          this._perspective.storeThread(this.cell, pulse.ah, pp, pulse.ts, pulse.author, pulse.isNew);
          if (pulse.isNew && this._canNotify) {
            if (isEntryFromSelf) {
              /** Notify Subject author */
              if (this.cell.address.dnaId.b64 == pp.subject.dnaHashB64 && pp.subject.typeName != DM_SUBJECT_TYPE_NAME) {
                let author = await this.getRecordAuthor(intoDhtId(pp.subject.address));
                if (!this.cell.address.agentId.equals(author)) {
                  await this.zomeProxy.notifyPeer({
                    content: pulse.ah.hash,
                    who: author.hash,
                    event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.Fork),
                  });
                }
              }
            }
            // Should be set when receiving inbox item
            // else {
            //   if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
            //     /* Set NotifSetting for new DmThread */
            //     console.log("NewDmThread.publishNotifSetting() signal", pulse.ah);
            //     await this.publishNotifSetting(pulse.ah, NotifySetting.AllMessages);
            //   }
            // }
          }
        }
        break;
      case ThreadsEntryType.GlobalLastProbeLog: {
        const globalLog = this._decoder.decode(pulse.bytes) as GlobalLastProbeLog;
        this._perspective.storeGlobalLog(globalLog.ts);
      }
        break;
      case ThreadsEntryType.ThreadLastProbeLog: {
        const threadLog = this._decoder.decode(pulse.bytes) as ThreadLastProbeLog;
        this._perspective.storeThreadLog(threadLog);
      }
        break;
    }
  }


  /** */
  private async handleInboxLink(pulse: LinkPulseMat, from: AgentId) {
    const forAgent = AgentId.from(pulse.base);
    const isLinkFromMe = this.cell.address.agentId.equals(pulse.author);
    const isSignalFromMe = this.cell.address.agentId.equals(from);
    const isForMe = this.cell.address.agentId.equals(forAgent);

    console.log("handleInboxSignal()", isLinkFromMe, isSignalFromMe, isForMe);

    if (!isForMe && !isLinkFromMe) {
      return;
    }

    /** */
    if (StateChangeType.Update == pulse.state) {
      console.error("Not possible to Update a link");
      return;
    }
    if (StateChangeType.Delete == pulse.state) {
      //const isNew = linkInfo.state.Delete;
      console.log("handleInboxSignal() Delete", forAgent.short, this.cell.address.agentId.short);
      if (isForMe) {
        await this._perspective.unstoreNotification(pulse.create_link_hash);
      }
      return;
    }
    /** Create */
    const index = pulse.tag[0] as number;
    const event = getVariantByIndex(NotifiableEvent, index) as NotifiableEvent;
    console.log("handleInboxSignal() Create", pulse.isNew, event, pulse.tag, forAgent.short);
    const notif: ThreadsNotification = {
      event,
      author: pulse.author,
      timestamp: pulse.timestamp,
      createLinkAh: pulse.create_link_hash,
      content: ActionId.from(pulse.target),
    };
    /** I got notified by a peer */
    if (isForMe) {
      /** Store Notification */
      const ppAh = await this.fetchPpAhFromNotification(notif);
      /** make sure we have the content signaled in the notification */
      if (ppAh) {
         /*await*/ this.fetchPp(ppAh); // We should probably fetch it for futur use
        /** Publish a NotifySetting.AllMessages for this thread if non exists */
        if (NotifiableEvent.NewDmThread === event && pulse.isNew) {
          const ppAh = new ActionId(notif.content.b64);
          console.log("NewDmThread notif:", ppAh, notif.createLinkAh);
          const notifSettings = this._perspective.notifSettings.get(ppAh);
          if (notifSettings) {
            const notifSetting = notifSettings.get(this.cell.address.agentId);
            if (!notifSetting) {
              await this.publishNotifSetting(ppAh, NotifySetting.AllMessages);
              console.log("NewDmThread.publishNotifSetting()", ppAh);
            }
          }
          ///* auto delete since we don't want it to show up in UI */
          //await this.deleteNotification(notif.createLinkAh);
        } else {
          this._perspective.storeNotification(notif, ppAh);
        }
      }
      return;
    }

    if (!pulse.isNew || !isLinkFromMe) {
      return;
    }
    /** I notified a peer */
    /** Tip peer that we send them a notification */
    let extra: NotificationTipBeadData | NotificationTipPpData;
    if (NotifiableEvent.NewDmThread === event || NotifiableEvent.Fork === event) {
      console.log("Signaling new PP notification to peer", forAgent, pulse.target);
      const ppAh = new ActionId(pulse.target.b64);
      const thread = this._perspective.threads.get(ppAh)!;
      const ppData: NotificationTipPpData = {pp: thread.pp, creationTime: thread.creationTime};
      extra = ppData;
    } else {
      /** NewBead, Mention, Reply */
      console.log("Signaling new Bead notification to peer", forAgent, pulse.target);
      const beadAh = new ActionId(pulse.target.b64);
      const beadInfo = this._perspective.getBeadInfo(beadAh);
      const typed = this._perspective.getBead(beadAh);
      const beadData: NotificationTipBeadData = {typed: dematerializeTypedBead(typed!, beadInfo!.beadType), beadType: beadInfo!.beadType, creationTime: beadInfo!.creationTime};
      extra = beadData;
    }
    await this.castNotificationTip(pulse.create_link_hash, forAgent, notif, extra);
  }


  /** */
  private async handleBeadEntryPulse(pulse: EntryPulseMat, typed: TypedBead, from: AgentId): Promise<void> {
    const beadAh = pulse.ah;
    const beadType = pulse.entryType as BeadType;
    const typedMat = materializeTypedBead(typed, beadType);
    console.log("handleBeadEntry()", beadType, pulse.ah.short, typedMat);
    /** Store Bead */
    const maybe = await this.zomeProxy.getOriginalAuthor(beadAh.hash);
    const author = maybe? new AgentId(maybe[1]) : pulse.author;
    await this.storeTypedBead(beadAh, typedMat, beadType, pulse.ts, author, pulse.isNew);
    /** Check if I need to notify peers */
    let notifs: NotifyPeerInput[] = [];
    if (pulse.isNew && this.cell.address.agentId.equals(from)) {
      /** Get base info */
      let ppAh: ActionId;
      let prevBeadAh: ActionId;
      if (beadType == ThreadsEntryType.EncryptedBead) {
        console.log("handleBeadEntry() create new EncryptedBead", beadAh.short);
        const decBeadPair = this._perspective.decBeads.get(beadAh)!;
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
      if (this._canNotify && !prevBeadAh.equals(ppAh)) { // Thread's first bead has ppAh equals prevBeadAh
        const isDmThread = this.isThreadDm(ppAh);
        const thread = this._perspective.threads.get(ppAh);
        if (!thread) {
          throw Promise.reject("Missing thread for BeadEntry");
        }
        const lastKnownBead = thread.getLast(2); // new bead is already stored in thread, get the one before that
        const hasJumpedBead = lastKnownBead.length > 1 && !lastKnownBead[0]!.beadAh.equals(prevBeadAh);
        //console.log("handleBeadEntry() hasJumpedBead", hasJumpedBead, isDmThread, lastKnownBead, prevBeadAh);
        if (hasJumpedBead && !isDmThread) {
          let reply_author = await this.getRecordAuthor(prevBeadAh);
          notifs.push({content: beadAh.hash, who: reply_author.hash, event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.Reply)});
        }
      }
      await this.notifyPeers(ppAh, beadAh, notifs);
    }
  }


  /** */
  override handleAppTip(serTip: Uint8Array, from: AgentId): ZomeSignalProtocol | undefined {
    const appTip = this._decoder.decode(serTip) as ThreadsAppTip;
    if (appTip.type != "notification") {
      return;
    }
    const notifTip = appTip.data;
    console.log(`Received notifTip of type ${JSON.stringify(notifTip.event)}:`, notifTip, from);
    let ppAh: ActionId = notifTip.pp_ah;
    let signal: ZomeSignalProtocol | undefined = undefined;
    /** Store received Entry */
    if (NotifiableEvent.Mention == notifTip.event || NotifiableEvent.Reply == notifTip.event || NotifiableEvent.NewBead == notifTip.event) {
      const {typed, beadType, creationTime} = notifTip.data as NotificationTipBeadData;
      const beadAh = notifTip.content;
      console.log(`notifTip ${JSON.stringify(notifTip.event)}:`, beadAh, typed);
      const entryPulse: EntryPulse = {
        ah: beadAh.hash,
        eh: EntryId.empty().hash,
        ts: creationTime,
        author: from.hash,
        state: {Create: true},
        def: {
          entry_index: getIndexByVariant(ThreadsEntryType, beadType),
          zome_index: 42,
          visibility: "Public",
        },
        bytes: this._encoder.encode(typed),
      };
      signal = {Entry: entryPulse};
    }
    if (NotifiableEvent.NewDmThread == notifTip.event || NotifiableEvent.Fork === notifTip.event) {
      const {pp, creationTime} = notifTip.data as NotificationTipPpData;
      console.log(`notifTip ${JSON.stringify(notifTip.event)}:`, creationTime, pp);
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
        bytes: this._encoder.encode(pp),
      };
      signal = {Entry: entryPulse};
    }

    ///* Brutal way to make sure we have the content signaled in the notification */
    //await this.probeAllLatest();
    /** */
    const notif: ThreadsNotification = {
      event: notifTip.event,
      author: notifTip.author,
      timestamp: notifTip.timestamp,
      content: notifTip.content,
      createLinkAh: notifTip.link_ah,
    }
    console.log(`handleAppTip() storeNotification:`, notif);
    /** make sure we have the content signaled in the notification */
    /*await*/ this.fetchPp(ppAh);
    /** */
    if (NotifiableEvent.NewDmThread != notifTip.event) {
      this._perspective.storeNotification(notif, ppAh);
    }
    return signal;
  }


  /** */
  private async notifyPeers(ppAh: ActionId, content: LinkableId, notifs: NotifyPeerInput[]) {
    console.log("notifyPeers()", ppAh, notifs);
    /** Get latest notif settings */
    let settings = await this.pullNotifSettings(ppAh);
    /** Get alls & nevers */
    let nevers: AgentId[] = [];
    let alls: AgentId[] = [];
    for (const [agent, setting, _ah] of settings) {
      const peer = agent;
      switch (setting) {
        case NotifySetting.Never: nevers.push(peer); break;
        case NotifySetting.AllMessages: alls.push(peer); break;
        default: break;
      }
    }
    /** Keep only notifiable peers */
    const notifieds: AgentPubKeyB64[] = [];
    const notifies = notifs
      .filter((notif) => !nevers.map((agentId) => agentId.b64).includes(enc64(notif.who)))
      .map((notif) => {
        notifieds.push(new AgentId(notif.who).b64);
        return this.zomeProxy.notifyPeer(notif);
      });
    /** notify peers with AllMessage notifSetting */
    for (const peer of alls) {
      if (notifieds.includes(peer.b64)) {
        continue;
      }
      const newNotif: NotifyPeerInput = {
        content: content.hash,
        who: peer.hash,
        event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.NewBead),
      }
      notifies.push(this.zomeProxy.notifyPeer(newNotif));
    }
    /** */
    await Promise.all(notifies);
  }
}
