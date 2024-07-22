import {ActionHashB64, AgentPubKeyB64, EntryHashB64, Timestamp} from "@holochain/client";
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
  NotifySetting, ThreadsEntryType,
} from "../bindings/threads.types";
import {AnyIdMap} from "../utils";
import {
  BeadInfo,
  ParticipationProtocolMat,
  SubjectMat,
  ThreadsNotification,
  TypedBaseBeadMat, TypedBead,
  TypedBeadMat
} from "./threads.materialize";
import {AuthorshipZvm} from "./authorship.zvm";
import {AnyLinkableHashB64} from "@ddd-qc/path-explorer/dist/utils";


/** */
export interface ThreadsSnapshot {
  /** */
  allAppletIds: EntryHashB64[],
  /** Store of all Subjects: hash -> Subject */
  allSubjects: [AnyLinkableHashB64, SubjectMat][],
  /** Store of all SemTopic: eh -> TopicTitle */
  allSemanticTopics: [EntryHashB64, string][],
  hiddens: AnyLinkableHashB64[],
  /** ppAh -> ppMat */
  pps: [ActionHashB64, ParticipationProtocolMat, Timestamp, AgentPubKeyB64][],
  /** beadAh -> [BeadInfoMat, TypedBeadMat] */
  beads: [ActionHashB64, BeadInfo, TypedBeadMat][],

  /** bead_ah -> [agent, emoji[]][] */
  emojiReactions: [ActionHashB64, [AgentPubKeyB64, string[]][]][],

  /** AppletId -> (PathEntryHash -> subjectType) */
  appletSubjectTypes: [EntryHashB64, [EntryHashB64, string][]][],

  favorites: ActionHashB64[],
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


  /** -- Memento -- */

  /** TODO: deep copy */
  makeSnapshot( originalsZvm: AuthorshipZvm): ThreadsSnapshot {
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



