import {AgentPubKeyB64, Timestamp, HoloHashType} from "@holochain/client";
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
    GetAhInput,
    GetLatestBeadsInput,
    GlobalLastProbeLog,
    Limitations,
    Moderation,
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
    delay,
    DhtId,
    DnaId,
    enc64,
    EntryId,
    EntryPulseMat,
    getIndexByVariant,
    getVariantByIndex,
    holoIdReviver,
    intoAnyId,
    intoDhtId,
    intoLinkableId,
    LinkableId,
    LinkPulseMat,
    StateChangeType,
    ValidatedBy,
    ZomeSignalProtocol,
    ZomeViewModelWithSignals,
} from "@ddd-qc/lit-happ";
import {
    AnyBeadMat,
    base2typed,
    BaseBeadType,
    BeadInfo,
    BeadType,
    defaultModeration,
    dematerializeEntryBead,
    dematerializeTypedBead,
    EncryptedBeadContent,
    EntryBeadMat,
    FileContent,
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
import {getThisAppletId, MAIN_SEMANTIC_TOPIC, MAIN_TOPIC_ID, parseMentions, weaveUrlToWal} from "../utils";
import {AuthorshipZvm} from "./authorship.zvm";
import {ThreadsLinkType} from "../bindings/threads.integrity";
import {SpecialSubjectType} from "../events";
import {ThreadsPerspective, ThreadsPerspectiveMutable, ThreadsSnapshot} from "./threads.perspective";
import {HOLOCHAIN_ID_EXT_CODEC, MyDictionary} from "@ddd-qc/cell-proxy";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {ThreadsDvm} from "./threads.dvm";
import {THIS_APPLET_ID} from "../contexts";
import {GetStrategy} from "@holochain-open-dev/core-types";
//import {msg} from "@lit/localize";


//generateSearchTest();


/** Better way to catch and handle "throttled" error */
export function catchThrottled<T>(promise: Promise<T>): Promise<[undefined, T] | [Error]> {
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

    get zomeProxy(): ThreadsProxy {
        return this._zomeProxy as ThreadsProxy;
    }

    private _encoder = new Encoder(HOLOCHAIN_ID_EXT_CODEC);
    private _decoder = new Decoder(HOLOCHAIN_ID_EXT_CODEC);


    //threadsDvm(): ThreadsDvm { return this._dvmParent as ThreadsDvm }


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
            /*await*/
            this.publishAllFromSnapshot(snapshot, authorshipZvm).then(() => {
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
                /*await*/
                originalsZvm.ascribeTarget("Subject", intoLinkableId(anyId.b64), 0/*TODO: get creationTime of Subject*/, AgentId.empty(), true);
            }
        }
        ;
        /** pps */
        for (const [ppAh, thread] of this._perspective.threads.entries()) {
            /*await*/
            originalsZvm.ascribeTarget(ThreadsEntryType.ParticipationProtocol, ppAh, thread.creationTime, thread.author, true);
        }
        ;
        /** beads */
        for (const [beadAh, [beadInfo, _typed]] of this._perspective.beads.entries()) {
            /*await*/
            originalsZvm.ascribeTarget(beadInfo.beadType, beadAh, beadInfo.creationTime, beadInfo.author, true);
        }
        ;
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
    override async initializePerspectiveFromLocal(): Promise<void> {
        console.debug("threadsZvm.initializePerspectiveFromLocal() START");
        await this.zomeProxy.queryAll();
        await this.probeAllInnerAsync(GetStrategy.Local);
        console.debug("threadsZvm.initializePerspectiveFromLocal() END");
    }


    /** */
    override async initializePerspectiveFromNetwork(): Promise<void> {
        console.debug("threadsZvm.initializePerspectiveFromNetwork() START");
        await this.probeAllInnerAsync(GetStrategy.Network);
        console.debug("threadsZvm.initializePerspectiveFromNetwork() END");
    }


    async probeAllInnerAsync(strategy: GetStrategy): Promise<void> {
        console.debug("threadsZvm.probeAllInner() subjects counts:", this._perspective.getAllSubjects().length)
        await this.zomeProxy.probeAllHiddens(strategy);
        await this.zomeProxy.pullAllSemanticTopics(strategy);
        await this.pullAppletIds(strategy);
        await this.pullAllSubjects(strategy);
        await this.zomeProxy.probeDmThreads(strategy);
        await this.zomeProxy.probeInbox(strategy);
        await this.pullFavorites(strategy);
        /** Grab all threads of other subjects to see if there are new ones */
        let probes: Promise<ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]>>[] = [];
        for (const [subjectAdr, _sub] of this._perspective.getAllSubjects()) {
            probes.push(this.pullSubjectThreads(intoAnyId(subjectAdr), strategy));
        }
        await Promise.all(probes);
        if (strategy == GetStrategy.Network) {
            /** Get last elements since last time (global probe log) */
            /** WARN: this can commit an entry */
            await this.probeAllLatest();
            this._perspective.print();
        }
    }

    /** */
    override probeAllInner() {
        this.probeAllInnerAsync(GetStrategy.Network).then(
            () => { console.trace("ThreadsZvm.probeAllInner() DONE") },
            (e) => { console.error("ThreadsZvm.probeAllInner() failed", e) },
            );
    }


    /** -- */

    /** */
    storeMainTopic() {
        //const author = this.cell.address.agentId;
        const author = AgentId.empty();
        this._perspective.storeSemanticTopic(MAIN_TOPIC_ID, MAIN_SEMANTIC_TOPIC, author);
    }


    /** -- Probe: Query the DHT, and store the results (async) -- */

    /** */
    async pullAppletIds(strategy: GetStrategy): Promise<EntryId[]> {
        console.log("threadsZvm.probeAllAppletIds()")
        // const appletIds = await this.zomeProxy.getApplets();
        // this._allAppletIds = appletIds.map((eh) => encodeHashToBase64(eh));
        const entryB64s = await this.zomeProxy.pullApplets(strategy);
        const list = entryB64s.map((b64) => new EntryId(b64));
        this._perspective.storeAllAppletIds(list);
        console.log("threadsZvm.probeAllAppletIds() list", list);
        this.notifySubscribers();
        return list;
    }

    storeSubject(subject: Subject) {
        this._perspective.storeSubject(subject);
    }

    /** Merge to MAIN_TOPIC */
    async mergeToMainTopic(source: ActionId): Promise<void> {
        console.log("threadsZvm.mergeToMainTopic()", source.b64);
        await this.mergeSubject(source, MAIN_TOPIC_ID);
    }

    /** Merge */
    async mergeSubject(source: ActionId, target: ActionId): Promise<void> {
        console.log("threadsZvm.mergeSubject()", source.b64, target.b64);
        // TODO: Enable if mergeSubject zfn added to DNA
        // await this.zomeProxy.mergeSubject({subjectSource: source.hash, subjectTarget: target.hash});
    }

    /** Get all Subjects from the RootAnchor */
    async pullAllSubjects(strategy: GetStrategy): Promise<void> {
        const subjects = await this.zomeProxy.pullAllSubjects(strategy);
        this._perspective.storeAllSubjects(subjects);
        console.log("threadsZvm.pullAllSubjects()", subjects.length);
        this.notifySubscribers();
    }

    // TODO: probeDnaSubjects()
    // TODO: probeEntryTypeSubjects()

    /** Get all Threads for a subject */
    async pullSubjectThreads(subjectId: AnyId, strategy: GetStrategy): Promise<ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]>> {
        console.log("threadsZvm.pullSubjectThreads() start", subjectId);
        /** Skip Agent as it has dm link type to get its pps */
        if (subjectId.hashType == HoloHashType.Agent) {
            return new ActionIdMap();
        }
        /** */
        let merged: ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]> = new ActionIdMap();
        const subjectIds = this._perspective.getAllSubjectVersions(subjectId);
        //console.log("threadsZvm.pullSubjectThreads() subjectIds", subjectIds.length, subjectId.short);
        for (const curSubjId of subjectIds) {
            const [throttleError, tuples] = await catchThrottled(this.pullSubjectVersionThreads(curSubjId, strategy));
            if (throttleError) {
                //console.log("threadsZvm.pullSubjectThreads() throttleError", throttleError, curSubjId);
                continue; // pullSubjectThreads() might be called multiple times for the same subject
            }
            //console.log("threadsZvm.pullSubjectThreads() subjectId", tuples.size, subjectId.short);
            merged = new ActionIdMap([...merged, ...tuples]);
        }
        console.log("threadsZvm.pullSubjectThreads() end", merged.size, subjectId.short);
        return merged;
    }


    /** */
    async pullSubjectVersionThreads(subjectId: AnyId, strategy: GetStrategy): Promise<ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]>> {
        let res: ActionIdMap<[ParticipationProtocol, Timestamp, AgentId]> = new ActionIdMap();
        const pps = await this.zomeProxy.probePpsFromSubjectHash({lh: subjectId.hash, strategy});
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
        console.debug("pullAppletSubjectTypes() appletId", appletId);
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
    unstoreNewThread(ah: ActionId | undefined | null) {
        if (ah && this._perspective.newThreads.has(ah)) {
            this._perspective.unstoreNewThread(ah);
            this.notifySubscribers();
        }
    }


    /** */
    async probeAllLatest(): Promise<void> {
        //console.log("ThreadsZvm.probeAllLatest()");
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
        console.log("probeAllLatest() newThreads", newThreads.length);
        this._perspective.storeAllNewThreads(newThreads);

        /* unreadThreads: Map new beads to their threads */
        let unreadsByThread: ActionIdMap<[AnyId, [ActionId, Timestamp][]]> = new ActionIdMap();
        latest.newBeadsByThread.map(async ([pp_ah, bl]) => {
            const ppAh = new ActionId(pp_ah);
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
            if (!unreadsByThread.get(ppAh)) {
                unreadsByThread.set(ppAh, [subjectAddr, []]);
            }
            unreadsByThread.get(ppAh)![1].push([new ActionId(bl.beadAh), bl.creationTime]);
        });
        console.log("threadsZvm.probeAllLatest() unreadThreads done", JSON.stringify(unreadsByThread));
        this._perspective.storeAllUnreads(unreadsByThread);

        /** Done */
        this.notifySubscribers();
    }


    private _cacheNotifSettings: ActionIdMap<[Timestamp, [AgentId, NotifySetting, ActionId][]]> = new ActionIdMap();

    /** Cache value for a minute */
    async pullNotifSettings(ppAh: ActionId): Promise<[AgentId, NotifySetting, ActionId][]> {
        const now = Date.now();
        const oneMinuteAgo = new Date(now - 60 * 1000).getTime();
        //console.debug("pullNotifSettings()", ppAh, oneMinuteAgo, now);
        const maybe = this._cacheNotifSettings.get(ppAh);
        if (maybe && oneMinuteAgo < maybe[0]) {
            //console.debug("pullNotifSettings() from cache", ppAh);
            return maybe[1];
        }
        //this._perspective.notifSettings.delete(ppAh);
        const [throttleError, notifSettings] = await catchThrottled(this.zomeProxy.pullPpNotifySettings(ppAh.hash));
        if (throttleError) {
            return [];
        }
        const threadNotifSettings: [AgentId, NotifySetting, ActionId][] = notifSettings.map(([a, n, c]) => [new AgentId(a), n, new ActionId(c)]);
        this._cacheNotifSettings.set(ppAh, [now, threadNotifSettings]);
        return threadNotifSettings;
    }


    /**  */
    async pullFavorites(strategy: GetStrategy): Promise<void> {
        const favorites = await this.zomeProxy.probeMyFavorites(strategy);
        for (const fav_ah of favorites) {
            const beadAh = new ActionId(fav_ah);
            await this.fetchUnknownBead(beadAh, strategy);
        }
    }


    /** Probe all emojis on this bead */
    async pullEmojiReactions(beadAh: ActionId, strategy: GetStrategy) {
        await catchThrottled(this.zomeProxy.pullReactions({ah: beadAh.hash, strategy}));
    }


    /** Get all beads from a thread */
    async pullAllBeads(ppAh: ActionId, strategy: GetStrategy): Promise<BeadLink[]> {
        console.log("pullAllBeads()", ppAh);
        const thread = this._perspective.threads.get(ppAh);
        if (!thread) {
            console.warn("pullAllBeads() Failed. Unknown thread:", ppAh);
            return [];
        }
        /** Probe bans if manual rules */
        const [throttleError0, _] = await catchThrottled(this.pullThreadModeration(ppAh, strategy));
        if (throttleError0) {
            return [];
        }
        /** Probe */
        const [throttleError, maybe] = await catchThrottled(this.zomeProxy.findBeads(ppAh.hash));
        if (throttleError) {
            return [];
        }
        const [interval, beadLinks] = maybe;
        console.log("pullAllBeads()", beadLinks.length, TimeInterval.new(interval).toStringSec(), beadLinks)
        /** Fetch */
        await this.fetchBeads(ppAh, beadLinks, TimeInterval.new(interval), strategy);
        thread.setHasSearchedOldestBead();
        console.log("setSearchedOldestBead for", ppAh, thread.hasSearchedOldestBead);
        /** Done */
        return beadLinks;
    }


    /** */
    async pullThreadModeration(ppAh: ActionId, strategy: GetStrategy) {
        let thread = this._perspective.threads.get(ppAh);
        /** Probe bans if moderation is enabled */
        if (thread!.pp.moderation.moderators.length > 0) {
            console.log("pullThreadModeration()", ppAh.short);
            const input: GetAhInput = {
                ah: ppAh.hash,
                strategy,
            };
            await this.zomeProxy.probeAllBanned(input);
            await this.zomeProxy.probeAllFlagged(input);
        }
    }


    /** Get all beads from "now" and back until `limit` is reached or `startTime` is reached */
    async pullLatestBeads(ppAh: ActionId, begin_time?: Timestamp, end_time?: Timestamp, target_limit?: number): Promise<BeadLink[]> {
        console.log("pullLatestBeads()", ppAh);
        const strategy: GetStrategy = GetStrategy.Local; // TODO figure out GetStrategy
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
        await this.pullThreadModeration(ppAh, strategy);
        /** Probe the latest beads */
        try {
            const input: GetLatestBeadsInput = {
                pp_ah: ppAh.hash, begin_time, end_time, target_limit, strategy,
            };
            const [searchedInterval, beadLinks] = await this.zomeProxy.findLatestBeads(input);
            /** Cache them */
            await this.fetchBeads(ppAh, beadLinks, TimeInterval.new(searchedInterval), strategy);
            /** Check if beginning of time reached */
            console.log("pullLatestBeads() begin", searchedInterval.begin, thread.creationTime);
            if (searchedInterval.begin <= thread.creationTime) {
                thread.setHasSearchedOldestBead();
            }
            /** Done */
            return beadLinks;
        } catch (e: any) {
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
        const oldestTime = thread.probedUnion ? thread.probedUnion.begin : undefined;
        const endTime = oldestTime ? oldestTime : Date.now() * 1000;
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
            throw Promise.reject("Unknown thread: " + ppAh.short);
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


    /** -- Edit -- */

    /** */
    async publishEditThread(beadAh: ActionId): Promise<[Timestamp, ActionId]> {
        console.log("publishEditThread()", beadAh);
        const beadInfo = this._perspective.getBeadInfo(beadAh)!;
        const subject: Subject = {
            address: beadAh.b64,
            name: "",
            typeName: SpecialSubjectType.TextBead,
            appletId: THIS_APPLET_ID.b64,
            dnaHashB64: this.cell.address.dnaId.b64,
        };
        let limitations = this._perspective.threads.get(beadInfo.bead.ppAh)!.pp.limitations;
        limitations.allowedAgents = [beadInfo.author.hash];
        const pp: ParticipationProtocol = {
            purpose: "EDIT",
            limitations,
            moderation: defaultModeration(),
            subject,
        }
        console.debug("ThreadsZvm.publishEditThread() appletId", pp.subject.appletId);
        const [pp_ah, ts] = await this.zomeProxy.publishParticipationProtocol(pp);
        /** */
        return [ts, new ActionId(pp_ah)];
    }


    /** */
    async editMyTextBead(beadAh: ActionId, value: string) {
        console.log("threadsZvm.editMyTextBead()", beadAh, value);
        /** make sure it's my text bead */
        const beadInfo = this._perspective.getBeadInfo(beadAh);
        if (!beadInfo || beadInfo.beadType != ThreadsEntryType.TextBead || !beadInfo.author.equals(this.cell.address.agentId)) {
            throw Error("Invalid bead to update");
        }
        /** Grab bead's "edit" thread */
        const pair = this._perspective.getEditThread(beadAh);
        /** if none, create one and manually publish first bead */
        if (!pair) {
            const [_ts, ppAh] = await this.publishEditThread(beadAh);
            const bead: Bead = {
                ppAh: ppAh.hash,
                prevBeadAh: ppAh.hash,
            }
            /*const tuple =*/
            await this.publishTypedBeadAt(ThreadsEntryType.TextBead, value, bead, Date.now() * 1000, this.cell.address.agentId);
            return;
        }
        /** publish bead to edit thread */
        await this.publishTypedBead(ThreadsEntryType.TextBead, value, pair[0]);
    }


    /** -- Publish: Commit to source-chain (and possibly the DHT) and store it (async because the commit could fail) -- */


    /** */
    async publishTypedBead(type: BeadType, content: TypedContent | EncryptedBeadContent, ppAh: ActionId, author?: AgentId, prevBead?: ActionId): Promise<[ActionId, string, number, TypedBead]> {
        console.log("ThreadsZvm.publishTypedBead()", content);
        const creation_time = Date.now() * 1000;
        const nextBead = await this.createNextBead(ppAh, prevBead);
        const beadAuthor = author ? author : this.cell.address.agentId;
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
        : Promise<[ActionId, string, TypedBead]> {
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
                const fileContent = content as FileContent;
                const input: AddEntryAsBeadInput = {
                    eh: fileContent.eh.hash,
                    bead: nextBead,
                    zomeName: "zFiles", // FilesProxy.DEFAULT_ZOME_NAME,
                    roleName: "rFiles", // FILES_CELL_NAME
                    originalCreationTime: creationTime,
                    originalAuthor: author.hash,
                    subType: fileContent.type,
                    size: fileContent.size,
                };
                [bead_ah, typed, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEntryAsBead(input);
            }
                break;
            case "EntryBeadImport":
                const entryBead: EntryBead = dematerializeEntryBead(content as EntryBeadMat);
                entryBead.bead = nextBead;
                beadTypeEx = ThreadsEntryType.EntryBead;
                [bead_ah, typed, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEntryBead({
                    entryBead,
                    creationTime
                });
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
                [bead_ah, global_time_anchor, bucket_ts] = await this.zomeProxy.publishEncBead({
                    encBead: encContent.encBead,
                    otherAgent: encContent.otherAgent.hash,
                    creationTime
                });
                break;
        }
        const beadId = new ActionId(bead_ah);
        /** Insert in ThreadInfo */
        console.log("publishTypedBeadAt() added bead", beadId.short, creationTime);
        /** Done */
        return [beadId, global_time_anchor, typed];
    }


    /** */
    async publishNotifSetting(ppAh: ActionId, setting: NotifySetting, agent?: AgentId): Promise<void> {
        if (!ppAh) {
            return;
        }
        if (!agent) {
            agent = this.cell.address.agentId;
        }
        /*const _maybe_link_ah =*/
        await this.zomeProxy.publishNotifySetting({
            pp_ah: ppAh.hash,
            setting,
            agent: agent.hash,
        } as SetNotifySettingInput);
    }


    /** */
    async editThreadTitle(ppAh: ActionId, title: string/*, preventStoring?: boolean*/): Promise<void> {
        /*const link_ah =*/
        await this.zomeProxy.updatePpTitle({ppAh: ppAh.hash, newTitle: title});
    }

    /** */
    async editSemanticTopic(old_ah: ActionId, title: string/*, preventStoring?: boolean*/): Promise<ActionId> {
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
    async publishSemanticTopic(title: string): Promise<ActionId> {
        const input: PublishTopicInput = {
            appletId: THIS_APPLET_ID.b64,
            topic: {title},
        };
        const eh = await this.zomeProxy.publishSemanticTopic(input);
        return new ActionId(eh);
    }


    /** */
    async publishParticipationProtocol(pp: ParticipationProtocol): Promise<[Timestamp, ActionId]> {
        console.log("publishParticipationProtocol() appletId", pp.subject.appletId);
        const [pp_ah, ts] = await this.zomeProxy.publishParticipationProtocol(pp);
        return [ts, new ActionId(pp_ah)];
    }


    /** */
    async publishThreadFromSemanticTopic(appletId: EntryId, topicAh: ActionId, purpose: string, limitations: Limitations, moderation: Moderation): Promise<[Timestamp, ActionId]> {
        console.log("publishThreadFromSemanticTopic() appletId", appletId.b64, purpose, limitations, moderation);
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
            limitations,
            moderation,
            subject,
        }
        const [pp_ah, ts] = await this.zomeProxy.publishParticipationProtocol(pp);
        /** */
        return [ts, new ActionId(pp_ah)];
    }


    /** -- Fetch -- */

    /** */
    async fetchPp(ppAh: ActionId): Promise<[ParticipationProtocol, string, Timestamp, AgentId] | null> {
        const maybeThread = this._perspective.threads.get(ppAh);
        console.log("ThreadsZvm.fetchPp()", ppAh, !!maybeThread);
        if (maybeThread) {
            return [maybeThread.pp, maybeThread.title, maybeThread.creationTime, maybeThread.author];
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
        /** grab latest title */
        const [throttleError2, title] = await catchThrottled(this.zomeProxy.getPpTitle({ah: ppAh.hash, strategy: GetStrategy.Local}));
        if (throttleError2) {
            return null;
        }
        /** */
        return [pp, title!, ts, new AgentId(author)];
    }


    /** */
    async fetchUnknownBead(beadAh: ActionId, strategy: GetStrategy/*canNotify: boolean, alternateCreationTime?: Timestamp*/): Promise<void> {
        console.log("fetchUnknownBead()", beadAh.b64);
        /** Return info if bead already stored */
        if (this._perspective.getBeadInfo(beadAh) && this._perspective.isPersistent(beadAh.b64)) {
            return;
        }
        const input: GetAhInput = {
            ah:  beadAh.hash,
            strategy,
        };
        /** */
        const textTuple = await catchThrottled(this.zomeProxy.fetchTextBead(input));
        if (textTuple == null) {
            const entryTuple = await catchThrottled(this.zomeProxy.fetchEntryBead(input));
            if (entryTuple == null) {
                const anyTuple = await catchThrottled(this.zomeProxy.fetchAnyBead(input));
                if (anyTuple == null) {
                    const maybe = await catchThrottled(this.zomeProxy.fetchEncBead(input));
                    if (!maybe) {
                        console.warn(`Bead not found at hash ${beadAh.b64}`);
                    }
                }
            }
        }
    }


    /** */
    async mustFetchUnknownBead(beadAh: ActionId, strategy: GetStrategy): Promise<[TypedBead, BeadType, Timestamp, AgentId] | null> {
        console.log("mustFetchUnknownBead()", beadAh.short);
        const beadInfo = this._perspective.getBeadInfo(beadAh);
        /** Return info if bead already stored */
        if (beadInfo && this._perspective.isPersistent(beadAh.b64)) {
            const typed = this._perspective.getBead(beadAh);
            return [dematerializeTypedBead(typed!, beadInfo.beadType), beadInfo.beadType, beadInfo.creationTime, beadInfo.author];
        }
        /** */
        let creationTime: Timestamp;
        let author: Uint8Array;
        let typed: TypedBead;
        let type: BeadType;

        const input: GetAhInput = {
            ah:  beadAh.hash,
            strategy,
        };

        const textTuple = await this.zomeProxy.fetchTextBead(input);
        if (textTuple == null) {
            const entryTuple = await this.zomeProxy.fetchEntryBead(input);
            if (entryTuple == null) {
                const anyTuple = await this.zomeProxy.fetchAnyBead(input);
                if (anyTuple == null) {
                    const maybe = await this.zomeProxy.fetchEncBead(input);
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
    async fetchTypedBead(beadAh: ActionId, beadType: BeadType, strategy: GetStrategy/*, canNotify: boolean, alternateCreationTime?: Timestamp*/): Promise<void> {
        if (this._perspective.getBeadInfo(beadAh) && this._perspective.isPersistent(beadAh.b64)) {
            return;
        }
        const input: GetAhInput = {
            ah:  beadAh.hash,
            strategy,
        };
        try {
            switch (beadType) {
                case ThreadsEntryType.TextBead:
                    await catchThrottled(this.zomeProxy.fetchTextBead(input));
                    break;
                case ThreadsEntryType.EntryBead:
                    await catchThrottled(this.zomeProxy.fetchEntryBead(input));
                    break;
                case ThreadsEntryType.AnyBead:
                    await catchThrottled(this.zomeProxy.fetchAnyBead(input));
                    break;
                case ThreadsEntryType.EncryptedBead:
                    await catchThrottled(this.zomeProxy.fetchEncBead(input));
                    break;
            }
        } catch (e: any) {
            console.error(e);
            throw Promise.reject("Bead not found at " + beadAh.short);
        }
    }


    /** */
    private async fetchBeads(ppAh: ActionId, beadLinks: BeadLink[], probedInterval: TimeInterval, strategy: GetStrategy): Promise<void> {
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
            //console.log("fetchBeads()", bl.beadType)
            await this.fetchTypedBead(new ActionId(bl.beadAh), bl.beadType as BeadType, strategy/*, false, bl.creationTime*/);
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
        if (!this._perspective.inbox.get(linkAh)) {
            return;
        }
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
        this.notifySubscribers();
    }


    /** */
    async flushInbox(): Promise<void> {
        for (const [linkAh, _pair] of this._perspective.getAllNotifications()) {
            await this.deleteNotification(linkAh);
        }
    }


    flushNewAndUnreads() {
        this._perspective.unreads.clear();
        this._perspective.newThreads.clear();
        this.notifySubscribers();
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
            const maybe = await this.mustFetchUnknownBead(notif.content, GetStrategy.Local);
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
        const pp_ah = await this.zomeProxy.publishDmThread({
            otherAgent: otherAgent.hash,
            appletId: getThisAppletId(weServices)
        });
        const ppAh = new ActionId(pp_ah);
        //let ppMat = await this.fetchPp(ppAh); // trigger storage
        await this.publishNotifSetting(ppAh, NotifySetting.AllMessages);
        /* */
        return ppAh;
    }


    isEditThreadFromPeer(ppAh: ActionId): boolean | null {
        const thread = this._perspective.threads.get(ppAh);
        if (!thread) {
            return null;
        }
        if (thread.pp.subject.typeName == SpecialSubjectType.TextBead && thread.title == "EDIT") {
            return !this.cell.address.agentId.equals(thread.author);
        }
        return false;
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
    async storeTypedBead(beadAh: ActionId, typedBead: TypedBeadMat, beadType: BeadType, creationTime: Timestamp, author: AgentId, isPersistent: boolean, isNew: boolean) {
        console.debug("ThreadsZvm.storeTypedBead()", beadAh.short);
        /** pre */
        if (this._perspective.getBeadInfo(beadAh)) {
            if (!this._perspective.isPersistent(beadAh.b64) && isPersistent) {
                this._perspective.setPersistent(beadAh.b64);
            }
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
            const innerBeadInfo = {
                creationTime,
                author,
                beadType: innerBeadType,
                bead: materializeBead(bead)
            } as BeadInfo;
            beadInfo = {
                creationTime,
                author,
                beadType: ThreadsEntryType.EncryptedBead,
                bead: materializeBead(bead)
            } as BeadInfo;
            innerPair = [innerBeadInfo, materializeTypedBead(innerTyped, innerBeadType) as TypedBaseBeadMat];
            /** Check and fetch prevBead */
            const prev = this._perspective.beads.get(innerBeadInfo.bead.prevBeadAh);
            if (!prev && !innerBeadInfo.bead.prevBeadAh.equals(innerBeadInfo.bead.ppAh)) {
                this.fetchUnknownBead(innerBeadInfo.bead.prevBeadAh, GetStrategy.Local); // TODO: Figure out best strategy
            }
        } else {
            const bead = (typedBead as TypedBaseBeadMat).bead;
            beadInfo = {creationTime, author, beadType, bead} as BeadInfo;
            console.log("storeTypedBead()", beadAh, bead.ppAh, typedBead, author);
            /** Check and fetch prevBead */
            const prev = this._perspective.beads.get(beadInfo.bead.prevBeadAh);
            if (!prev && !beadInfo.bead.prevBeadAh.equals(beadInfo.bead.ppAh)) {
                this.fetchUnknownBead(beadInfo.bead.prevBeadAh, GetStrategy.Local); // TODO: Figure out best strategy
            }
        }
        /** Store in perspective */
        this._perspective.storeTypedBeadWithMeta(beadAh, beadInfo, typedBead, isNew, isPersistent, isNew && !author.equals(this.cell.address.agentId), innerPair);
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
            if (topicAhB64 == MAIN_TOPIC_ID.b64) {
                this.storeMainTopic();
                continue;
            }
            const newTopicAh = await this.publishSemanticTopic(title);
            console.debug("PubImp() topic", topicAhB64, title, newTopicAh.short);
            topicMapping.set(new ActionId(topicAhB64), newTopicAh);
        }

        /** -- Subjects -- */
        /** Create mapping between subject hash and subject type */
        const ppAhs = snapshot.pps.map((tuple) => tuple[0]);
        const entryAsSubjects: MyDictionary<ThreadsEntryType> = {};
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
        const sortedPps: [ActionId, ParticipationProtocol, string, Timestamp, AgentId][] = Object.values(snapshot.pps)
            .sort(([_ppAhA, _ppA, _title, creationTimeA, _author], [_ppAhB, _ppB, _titleB, creationTimeB, _authorB]) => {
                return creationTimeA - creationTimeB
            })
            .map(([a, b, c, d, e]) => [new ActionId(a), b, c, d, new AgentId(e)])
        /* Sort Beads by creation time, so they can get their prev bead mapped ah */
        const sortedBeads: [string, BeadInfo, TypedBeadMat][] = Object.values(snapshot.beads).sort(
            ([_beadAhA, beadInfoA, _typedBeadA], [_beadAhB, beadInfoB, _typedBeadB]) => {
                return beadInfoA.creationTime - beadInfoB.creationTime
            })
        /* loop until all beads & pps have been processed ; check if progress is made, otherwise abort */
        let loopCount = 0;
        while (ppAhMapping.size != sortedPps.length || beadAhMapping.size != sortedBeads.length) {
            const totalStart = ppAhMapping.size + beadAhMapping.size;
            console.debug(`PubImp() Loop ${loopCount}: PP: ${ppAhMapping.size}/${sortedPps.length} | Beads: ${beadAhMapping.size}/${sortedBeads.length}`);
            /* Threads: Publish & Map */
            for (const [ppAh, pp, title, creationTime, _a] of Object.values(sortedPps)) {
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
                /** Publish title update */
                if (title != pp.purpose) {
                    await this.editThreadTitle(newPpAh, title);
                }
                /* Store pp */
                this._perspective.storeThread(this.cell, newPpAh, pp, title, authorshipLog[0], authorshipLog[1], true, false);
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
                switch (beadInfo.beadType) {
                    case ThreadsEntryType.EncryptedBead: {
                        /** Don't do encrypted beads */
                        continue;
                        // const encBead = typedBead as EncryptedBead;
                        // const otherAgent: AgentId = beadInfo.author.b64 != this.cell.address.agentId.b64
                        //   ? beadInfo.author
                        //   : new AgentId(this._perspective.threads.get(beadInfo.bead.ppAh)!.pp.subject.address);
                        // content = {encBead, otherAgent};
                    }
                        break;
                    case ThreadsEntryType.TextBead:
                        content = (typedBead as TextBeadMat).value;
                        break;
                    //case ThreadsEntryType.EntryBead: content = (typedBead as EntryBeadMat).sourceEh; break;
                    case ThreadsEntryType.EntryBead:
                        content = (typedBead as EntryBeadMat);
                        break;
                    case ThreadsEntryType.AnyBead:
                        const typedAny = typedBead as AnyBeadMat;
                        try {
                            content = weaveUrlToWal(typedAny.value);
                        } catch (e) {
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
        await this.pullAllSubjects(GetStrategy.Local); // ?? better to call probeAll ??
    }


    /** Form TypedBasedBead from content and bead */
    async content2Typed(bead: Bead, content: TypedContent, beadType: BaseBeadType): Promise<TypedBaseBead> {
        switch (beadType) {
            case ThreadsEntryType.TextBead:
                return {value: content as string, bead} as TextBead;
                break;
            case ThreadsEntryType.EntryBead:
                const fileContent = content as FileContent;
                const entryInfo: AddEntryAsBeadInput = {
                    eh: fileContent.eh.hash,
                    bead,
                    zomeName: "zFiles", // FilesProxy.DEFAULT_ZOME_NAME,
                    roleName: "rFiles", // FILES_CELL_NAME
                    // creationTime,
                    // author,
                    subType: fileContent.type,
                    size: fileContent.size,
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
    unstoreUnreadThread(threadHash: ActionId) {
        this._perspective.unstoreUnreadThread(threadHash);
        this.notifySubscribers();
    }


    /** */
    isSelfModerator(ppAh: ActionId): boolean {
        //console.log("isSelfModerator()", ppAh);
        const thread = this._perspective.threads.get(ppAh);
        if (!thread) {
            return false;
        }
        if (thread.pp.moderation.moderators.length > 0) {
            const moderators: AgentPubKeyB64[] = thread.pp.moderation.moderators.map((m) => new AgentId(m).b64);
            return moderators.includes(this.cell.address.agentId.b64);
        }
        return false;
    }


    /** */
    async flagBead(beadAh: ActionId) {
        await this.zomeProxy.flagBead(beadAh.hash);
    }


    /** */
    private async attemptBan(ppAh: ActionId, author: AgentId) {
        console.log("AttemptBan()", ppAh.short, author.short);
        /* Grab rules */
        const thread = this._perspective.threads.get(ppAh);
        if (!thread) {
            return;
        }
        if (thread.pp.moderation.moderators.length > 0) {
            /* count flags */
            let infringements: Uint8Array[] = [];
            const flags = this._perspective.flags.get(ppAh);
            if (!flags) {
                return;
            }
            for (const [linkAh, curBeadAh] of flags) {
                const info = this._perspective.beads.get(curBeadAh);
                if (info && author.equals(info[0].author)) {
                    infringements.push(linkAh.hash);
                }
            }
            /* ban if limit reached */
            console.log("AttemptBan() count", infringements.length, thread.pp.moderation.allowedFlags);
            if (infringements.length > thread.pp.moderation.allowedFlags) {
                await this.zomeProxy.banAgent({vilain: author.hash, pp_ah: ppAh.hash, infringements});
            }
        }
    }


    /** */
    canParticipate(ppAh: ActionId, agent: AgentId): boolean {
        const isBanned = this._perspective.hasBan(ppAh, agent);
        const thread = this._perspective.threads.get(ppAh)!;
        const isAllowed = thread.pp.limitations.allowedAgents.length == 0
            || thread.pp.limitations.allowedAgents.map((hash) => new AgentId(hash).b64).includes(agent.b64)
        return isAllowed && !isBanned;
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
        await this.broadcastTip({AppCustom: serTip}, [agent]);
        return;
    }


    /** */
    protected override async handleLinkPulse(pulse: LinkPulseMat, from: AgentId) {
        //const isSignalFromSelf = this.cell.address.agentId.equals(from);
        const isAuthorSelf = this.cell.address.agentId.equals(pulse.author);

        switch (pulse.link_type) {
            case ThreadsLinkType.Inbox:
                //delay(1000).then(() => {this.handleInboxLink(pulse, from); this.notifySubscribers();});
                this.handleInboxLink(pulse, from);
                break;
            case ThreadsLinkType.Hide:
                if (!isAuthorSelf) {
                    return;
                }
                console.debug("handleLinkPulse() hide", pulse.target);
                this._perspective.storeHidden(pulse.target, StateChangeType.Create == pulse.state);
                break;
            case ThreadsLinkType.Dm: {
                console.debug("handleLinkPulse() Dm", pulse.base.short);
                const targetAh = new ActionId(pulse.target.b64);
                const forPeer = AgentId.from(pulse.base);
                const isForMe = forPeer.equals(this.cell.address.agentId);
                if (!isAuthorSelf && !isForMe) {
                    return;
                }
                await this.fetchPp(targetAh);
                /** Notify peer of DmThread */
                if (this.isMainView && !isForMe && pulse.isNew) {
                    await this.zomeProxy.notifyPeer({
                        content: targetAh.hash,
                        who: forPeer.hash,
                        event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.NewDmThread)
                    });
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
                    if (pulse.validatedBy != ValidatedBy.None) {
                        this._perspective.setPersistent(pulse.create_link_hash.b64);
                    }
                }
                if (StateChangeType.Delete == pulse.state) {
                    const decoder = new TextDecoder('utf-8');
                    const emoji = decoder.decode(pulse.tag);
                    //console.warn("EmojiReaction DeleteLink:", link.tag, emoji);
                    this._perspective.unstoreEmojiReaction(baseAh, pulse.author, emoji);
                }
            }
                break;
            case ThreadsLinkType.Banned: {
                const ppAh = new ActionId(pulse.base.b64);
                const agent = AgentId.from(pulse.target.b64);
                if (StateChangeType.Create == pulse.state) {
                    this._perspective.storeBan(ppAh, agent);
                    if (pulse.validatedBy != ValidatedBy.None) {
                        this._perspective.setPersistent(pulse.create_link_hash.b64);
                    }
                    if (pulse.isNew && isAuthorSelf) {
                        /** Notify bead author that they have been banned */
                        if (this._canNotify && !this.cell.address.agentId.equals(agent)) {
                            await this.zomeProxy.notifyPeer({
                                content: ppAh.hash,
                                who: agent.hash,
                                event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.Banned),
                            });
                        }
                    }
                }
            }
                break;
            case ThreadsLinkType.Flagged: {
                const ppAh = new ActionId(pulse.base.b64);
                const beadAh = new ActionId(pulse.target.b64);
                /** Delete */
                // TODO
                // if (StateChangeType.Delete == pulse.state) {
                //   this._perspective.unstoreFlag(ppAh, targetAh);
                // }
                /** Create */
                if (StateChangeType.Create == pulse.state) {
                    this._perspective.storeFlag(ppAh, beadAh, pulse.create_link_hash);
                    if (pulse.validatedBy != ValidatedBy.None) {
                        this._perspective.setPersistent(pulse.create_link_hash.b64);
                    }
                    if (pulse.isNew && isAuthorSelf) {
                        let author = await this.getRecordAuthor(intoDhtId(beadAh.b64), GetStrategy.Local); // TODO: Figure out best strategy
                        /** Notify bead author that it has been flagged */
                        if (this._canNotify && !this.cell.address.agentId.equals(author)) {
                            await this.zomeProxy.notifyPeer({
                                content: beadAh.hash,
                                who: author.hash,
                                event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.Flagged),
                            });
                        }
                        /** Check if self should ban author */
                        await this.attemptBan(ppAh, author);
                    }
                }
            }
                break;
            case ThreadsLinkType.NotifySetting: {
                console.debug("handleLinkPulse() NotifySetting", pulse.base.short);
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
                // console.debug("handleLinkPulse() Favorite", pulse.target.short);
                if (pulse.author.equals(this.cell.address.agentId)) {
                    const targetAh = new ActionId(pulse.target.b64);
                    if (StateChangeType.Create == pulse.state) {
                        this._perspective.storeFavorite(targetAh);
                    }
                    if (StateChangeType.Delete == pulse.state) {
                        this._perspective.unstoreFavorite(targetAh);
                    }
                }
            }
                break;
            case ThreadsLinkType.TitleFix: {
                console.log("handleLinkPulse() TitleFix", pulse.target.short);
                const ppAh = new ActionId(pulse.target.b64);
                if (StateChangeType.Create == pulse.state) {
                    const decoder = new TextDecoder('utf-8');
                    const title = decoder.decode(pulse.tag);
                    const maybe = this._perspective.threads.get(ppAh);
                    if (maybe) {
                        maybe.setTitle(title)
                    } else {
                        this._channelTitleCache.set(ppAh, title); // title for unknown thread, cache it for now
                    }
                }
                // if (StateChangeType.Delete == pulse.state) {
                //   this._perspective.unstoreFavorite(targetAh);
                // }
            }
                break;
        }
    }

    _channelTitleCache: ActionIdMap<string> = new ActionIdMap<string>();


    /** */
    _authorCache: AnyIdMap<AgentId> = new AnyIdMap<AgentId>();

    async getRecordAuthor(dh: DhtId, strategy: GetStrategy): Promise<AgentId> {
        /* Skip MAIN_TOPIC_ID */
        if (dh.equals(MAIN_TOPIC_ID)) {
            return this.cell.address.agentId;
        }
        /* */
        const maybe = this._authorCache.get(dh.b64);
        if (maybe) {
            return maybe;
        }
        const a = strategy == GetStrategy.Local
            ? await this.zomeProxy.getRecordAuthorLocal(dh.hash)
            : await this.zomeProxy.getRecordAuthorNetwork(dh.hash)
        const id = new AgentId(a);
        this._authorCache.set(dh.b64, id);
        return id;
    }


    /** */
    protected override async handleEntryPulse(pulse: EntryPulseMat, from: AgentId) {
        //console.debug("ThreadsZvm.handleEntryPulse()", pulse, pulse.ah.b64, from.b64);
        //const isSignalFromSelf = this.cell.address.agentId.equals(from);
        const isEntryFromSelf = this.cell.address.agentId.equals(pulse.author);

        switch (pulse.entryType) {
            case ThreadsEntryType.EncryptedBead:
            case ThreadsEntryType.AnyBead:
            case ThreadsEntryType.EntryBead:
            case ThreadsEntryType.TextBead:
                const encBead = this._decoder.decode(pulse.bytes) as TypedBead;
                if (StateChangeType.Create == pulse.state) {
                    try {
                        await this.handleBeadEntryPulse(pulse, encBead, from);
                    } catch (_e) {
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
                    console.log("ThreadsZvm Update SemanticTopic", pulse);
                    this._perspective.updateSemanticTopic(pulse.ah, pulse.origAh!, semTopic.title, pulse.author);
                }
                break;
            case ThreadsEntryType.ParticipationProtocol:
                const pp = this._decoder.decode(pulse.bytes) as ParticipationProtocol;
                /** Skip signal only pp */
                if (pulse.validatedBy == ValidatedBy.None) {
                    console.debug("ThreadsZvm PP received via signal. Don't show and look for gossip");
                    delay(2000).then(async () => {
                        await this.probeAllInner();
                    });
                    return;
                }
                /** Skip DM PP's for other agents */
                if (pp.subject.typeName == DM_SUBJECT_TYPE_NAME) {
                    const forAgent = new AgentId(pp.subject.address);
                    if (!isEntryFromSelf && !this.cell.address.agentId.equals(forAgent)) {
                        console.debug("DM PP not for me");
                        return;
                    }
                }
                /** */
                if (StateChangeType.Create == pulse.state) {
                    const maybeTitle = this._channelTitleCache.get(pulse.ah);
                    // @ts-ignore
                    this._perspective.storeThread(this.cell, pulse.ah, pp, maybeTitle, pulse.ts, pulse.author, pulse.validatedBy != ValidatedBy.None, pulse.isNew);
                    /** grab latest title edit */
                    this.zomeProxy.getPpTitle({ah: pulse.ah.hash, strategy: GetStrategy.Local}).catch(() => { // TODO: Figure out best strategy
                    });
                    /** grab latest textbead edit if it's an EDIT thread */
                    if (pp.purpose == "EDIT") {
                        /*await*/
                        this.pullLatestBeads(pulse.ah, pulse.ts);
                    }
                    /** */
                    if (pulse.isNew && this._canNotify) {
                        if (isEntryFromSelf) {
                            /** Notify Subject author */
                            if (this.cell.address.dnaId.b64 == pp.subject.dnaHashB64 && pp.subject.typeName != DM_SUBJECT_TYPE_NAME) {
                                let author = await this.getRecordAuthor(intoDhtId(pp.subject.address), GetStrategy.Local); // TODO: Figure out best strategy
                                if (!this.cell.address.agentId.equals(author)) {
                                    await this.zomeProxy.notifyPeer({
                                        content: pulse.ah.hash,
                                        who: author.hash,
                                        event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.Fork),
                                    });
                                }
                            }
                            ///** Dev test: Signal a fake 2nd thread */
                            //pulse.ah = await ActionId.random();
                            //pulse.eh = await EntryId.random();
                            //await this.broadcastTip({Entry: dematerializeEntryPulse(pulse, Object.values(ThreadsEntryType))});
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
        const isForMe = this.cell.address.agentId.equals(forAgent);

        console.debug("handleInboxLink()", isLinkFromMe, this.cell.address.agentId.equals(from), isForMe, pulse.validatedBy, pulse.create_link_hash.b64);

        if (!isForMe && !isLinkFromMe || pulse.validatedBy == ValidatedBy.None) {
            return;
        }

        /** */
        if (StateChangeType.Update == pulse.state) {
            console.error("Not possible to Update a link");
            return;
        }
        if (StateChangeType.Delete == pulse.state) {
            //const isNew = linkInfo.state.Delete;
            console.log("handleInboxLink() Delete", forAgent.short, this.cell.address.agentId.short);
            if (isForMe) {
                await this._perspective.unstoreNotification(pulse.create_link_hash);
            }
            return;
        }
        /** Check & Clear if was requested by AppTip */
        if (this._missingLinkAhs.size > 0) {
            console.debug!("handleInboxLink() this._missingLinkAhs", pulse.create_link_hash.b64, this._missingLinkAhs);
            const maybe = this._missingLinkAhs.get(pulse.create_link_hash)
            if (maybe) {
                console.debug!("handleInboxLink() remove missing");
                (this._dvmParent as ThreadsDvm).addSignaledNotif(maybe);
                this._missingLinkAhs.delete(pulse.create_link_hash);
            }
            if (this._missingLinkAhs.size == 0) {
                console.debug!("handleInboxLink() clearInterval");
                clearInterval(this._notifLoopIntervalId);
                this._notifLoopIntervalId = undefined;
            }
        }
        /** Form ThreadsNotification */
        const index = pulse.tag[0] as number;
        const event = getVariantByIndex(NotifiableEvent, index) as NotifiableEvent;
        console.log("handleInboxSignal() Create ThreadsNotification", pulse.isNew, event, pulse.tag, forAgent.short);
        const notif: ThreadsNotification = {
            event,
            author: pulse.author,
            timestamp: pulse.timestamp,
            createLinkAh: pulse.create_link_hash,
            content: ActionId.from(pulse.target),
        };
        /** I got notified by a peer */
        if (isForMe && this.isMainView) {
            /** Store Notification */
            const ppAh = await this.fetchPpAhFromNotification(notif);
            /** make sure we have the content signaled in the notification */
            if (ppAh) {
                /*await*/
                this.fetchPp(ppAh); // We should probably fetch it for futur use
                /** Publish a NotifySetting.AllMessages for this thread if non exists */
                if (NotifiableEvent.NewDmThread === event && pulse.isNew) {
                    if (this.isMainView) {
                        const ppAh = new ActionId(notif.content.b64);
                        console.log("NewDmThread notif:", ppAh, notif.createLinkAh);
                        const notifSettings = this._perspective.notifSettings.get(ppAh);
                        if (notifSettings) {
                            const notifSetting = notifSettings.get(this.cell.address.agentId);
                            if (!notifSetting) {
                                await this.publishNotifSetting(ppAh, NotifySetting.AllMessages);
                                console.log("NewDmThread.publishNotifSetting()", ppAh);
                            }
                        } else { // Not sure but should probably publish setting if we didn't find any
                            await this.publishNotifSetting(ppAh, NotifySetting.AllMessages);
                            console.log("NewDmThread.publishNotifSetting() None found", ppAh);
                        }
                        ///* auto delete since we don't want it to show up in UI */
                        //await this.deleteNotification(notif.createLinkAh);
                    }
                } else {
                    this._perspective.storeNotification(notif, ppAh);
                }
            }
            return;
        }
        /** */
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
            const beadData: NotificationTipBeadData = {
                typed: dematerializeTypedBead(typed!, beadInfo!.beadType),
                beadType: beadInfo!.beadType,
                creationTime: beadInfo!.creationTime
            };
            extra = beadData;
        }
        await this.castNotificationTip(pulse.create_link_hash, forAgent, notif, extra);
    }


    private _cacheOriginalAuthor = new ActionIdMap<[Timestamp, Uint8Array] | null>();

    /** */
    async getOriginalAuthor(ah: ActionId): Promise<[Timestamp, Uint8Array] | null> {
        const cached = this._cacheOriginalAuthor.get(ah);
        if (cached != undefined) {
            return cached;
        }
        const res = await this.zomeProxy.getOriginalAuthor(ah.hash);
        this._cacheOriginalAuthor.set(ah, res);
        return res;
    }

    /** */
    private async handleBeadEntryPulse(pulse: EntryPulseMat, typed: TypedBead, from: AgentId): Promise<void> {
        const beadAh = pulse.ah;
        const beadType = pulse.entryType as BeadType;
        const typedMat = materializeTypedBead(typed, beadType);
        console.debug("handleBeadEntry()", pulse.validatedBy, beadType, pulse.ah.b64, typedMat);
        /** Store Bead */
        const maybe = await this.getOriginalAuthor(beadAh);
        const author = maybe ? new AgentId(maybe[1]) : pulse.author;
        await this.storeTypedBead(beadAh, typedMat, beadType, pulse.ts, author, pulse.validatedBy != ValidatedBy.None, pulse.isNew);
        // /** Dev test: Signal a 2nd entry */
        // if (pulse.isNew && this.cell.address.agentId.equals(from) && pulse.visibility == "Public") {
        //   pulse.ah = await ActionId.random();
        //   pulse.eh = await EntryId.random();
        //   await this.broadcastTip({Entry: dematerializeEntryPulse(pulse, Object.values(ThreadsEntryType))});
        // }
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
                    let reply_author = await this.getRecordAuthor(prevBeadAh, GetStrategy.Local); // TODO: Figure out best strategy
                    notifs.push({
                        content: beadAh.hash,
                        who: reply_author.hash,
                        event_index: getIndexByVariant(NotifiableEvent, NotifiableEvent.Reply)
                    });
                }
            }
            await this.notifyPeers(ppAh, beadAh, notifs);
        }
    }


    /** Handle AppCustomTip */
    private _missingLinkAhs: ActionIdMap<ThreadsNotificationTip> = new ActionIdMap();
    private _notifLoopIntervalId: any | undefined = undefined;

    override handleCustomTip(serTip: Uint8Array, from: AgentId): ZomeSignalProtocol | undefined {
        const appTip = this._decoder.decode(serTip) as ThreadsAppTip;
        if (appTip.type != "notification") {
            return;
        }
        /** Handle Notification Tip */
        const notifTip = appTip.data;
        console.log(`Received notifTip of type ${JSON.stringify(notifTip.event)}:`, notifTip, from, this._missingLinkAhs, this._notifLoopIntervalId);
        /** Poll with an interval until we get it from the DHT */
        if (this.isMainView && !this._missingLinkAhs.has(notifTip.link_ah)) {
            this._missingLinkAhs.set(notifTip.link_ah, notifTip);
            if (!this._notifLoopIntervalId) {
                this.zomeProxy.probeInbox(GetStrategy.Network).then(() =>
                    this._notifLoopIntervalId = setInterval(async () => {
                        console.log("Polling Inbox for Missing links...");
                        try {
                            await this.zomeProxy.probeInbox(GetStrategy.Network);
                        } catch (e) {
                            console.error("Error when calling probeInbox() stopping the call loop.", e);
                            clearInterval(this._notifLoopIntervalId);
                            this._notifLoopIntervalId = undefined;
                        }
                    }, 5000)
                )
            }
        }

        return;

        //let ppAh: ActionId = notifTip.pp_ah;
        // let signal: ZomeSignalProtocol | undefined = undefined;
        // /** Store received Entry */
        // if (NotifiableEvent.Mention == notifTip.event || NotifiableEvent.Reply == notifTip.event || NotifiableEvent.NewBead == notifTip.event) {
        //   const {typed, beadType, creationTime} = notifTip.data as NotificationTipBeadData;
        //   const beadAh = notifTip.content;
        //   console.log(`notifTip ${JSON.stringify(notifTip.event)}:`, beadAh, typed);
        //   const entryPulse: EntryPulse = {
        //     ah: beadAh.hash,
        //     eh: EntryId.empty().hash,
        //     ts: creationTime,
        //     author: from.hash,
        //     state: {Create: true},
        //     def: {
        //       entry_index: getIndexByVariant(ThreadsEntryType, beadType),
        //       zome_index: 42,
        //       visibility: "Public",
        //     },
        //     bytes: this._encoder.encode(typed),
        //   };
        //   signal = {Entry: entryPulse};
        // }
        // if (NotifiableEvent.NewDmThread == notifTip.event || NotifiableEvent.Fork === notifTip.event) {
        //   const {pp, creationTime} = notifTip.data as NotificationTipPpData;
        //   console.log(`notifTip ${JSON.stringify(notifTip.event)}:`, creationTime, pp);
        //   const entryPulse: EntryPulse = {
        //     ah: notifTip.content.hash,
        //     eh: EntryId.empty().hash,
        //     ts: creationTime,
        //     author: from.hash,
        //     state: {Create: true},
        //     def: {
        //       entry_index: getIndexByVariant(ThreadsEntryType, ThreadsEntryType.ParticipationProtocol),
        //       zome_index: 42,
        //       visibility: "Public",
        //     },
        //     bytes: this._encoder.encode(pp),
        //   };
        //   signal = {Entry: entryPulse};
        // }
        //
        // ///* Brutal way to make sure we have the content signaled in the notification */
        // //await this.probeAllLatest();
        // /** */
        // const notif: ThreadsNotification = {
        //   event: notifTip.event,
        //   author: notifTip.author,
        //   timestamp: notifTip.timestamp,
        //   content: notifTip.content,
        //   createLinkAh: notifTip.link_ah,
        // }
        // console.log(`handleAppTip() storeNotification:`, notif);
        // /** make sure we have the content signaled in the notification */
        // /*await*/ this.fetchPp(ppAh);
        // /** */
        // if (NotifiableEvent.NewDmThread != notifTip.event) {
        //   this.probeAllLatest()
        //   //this._perspective.storeNotification(notif, ppAh);
        // }
        // return signal;
    }


    /** */
    private async notifyPeers(ppAh: ActionId, content: LinkableId, notifs: NotifyPeerInput[]) {
        console.log("notifyPeers()", ppAh, notifs, this.isMainView);
        if (!this.isMainView) {
            // Only MainView can notify
            return;
        }
        /** Get latest notif settings */
        let settings = await this.pullNotifSettings(ppAh);
        /** Get alls & nevers */
        let nevers: AgentId[] = [];
        let alls: AgentId[] = [];
        for (const [agent, setting, _ah] of settings) {
            const peer = agent;
            switch (setting) {
                case NotifySetting.Never:
                    nevers.push(peer);
                    break;
                case NotifySetting.AllMessages:
                    alls.push(peer);
                    break;
                default:
                    break;
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
