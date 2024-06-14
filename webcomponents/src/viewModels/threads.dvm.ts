import {delay, Dictionary, DnaViewModel} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "./threads.zvm";
import {
  ActionHash,
  ActionHashB64, AgentPubKey,
  AgentPubKeyB64, AnyLinkableHash,
  AppSignal,
  AppSignalCb,
  decodeHashFromBase64,
  encodeHashToBase64,
  EntryHashB64, Timestamp
} from "@holochain/client";
import {
  NotifiableEvent,
  NotifySetting,
  ParticipationProtocol,
  Subject,
  ThreadsEntryType,
  ThreadsProperties,
  VINES_DEFAULT_ROLE_NAME,
  WeaveNotification,
  ThreadsSignal,
  ThreadsSignalProtocol,
  ThreadsNotification,
  ThreadsSignalProtocolType,
  EntryInfo,
  LinkInfo,
  ThreadsLinkType,
  EncryptedBead,
  TipProtocol,
  ThreadsEntry,
  StateChangeType,
  ThreadsEntryVariantAnyBead,
  ThreadsEntryVariantEntryBead,
  ThreadsEntryVariantTextBead,
  ThreadsEntryVariantEncryptedBead,
  ThreadsEntryVariantSemanticTopic,
  ThreadsEntryVariantParticipationProtocol,
  ThreadsEntryVariantGlobalLastProbeLog,
  ThreadsEntryVariantThreadLastProbeLog,
  TipProtocolVariantUpdateSemanticTopic,
  TipProtocolVariantNewSemanticTopic,
  TipProtocolVariantNewPp,
  TipProtocolVariantEmojiReactionChange,
  TipProtocolVariantNewBead,
  NotifyPeerInput,
  StateChangeVariantCreate,
} from "../bindings/threads.types";
import {
  AnyBeadMat,
  AnyLinkableHashB64, BaseBeadType, bead2base,
  BeadType, dematerializeParticipationProtocol, dematerializeTypedBead, EncryptedBeadContent, EntryBeadMat,
  materializeTypedBead, TextBeadMat, TypedBaseBead, TypedBaseBeadMat,
  TypedBead, TypedContent,
} from "./threads.perspective";
import {AppletId} from "@lightningrodlabs/we-applet";
import {ProfilesAltZvm, ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {decode, encode} from "@msgpack/msgpack";
import {AuthorshipZvm} from "./authorship.zvm";
import {isHashType} from "../utils";


/** */
export interface ThreadsDnaPerspective {
  agentPresences: Record<AgentPubKeyB64, number>,
  /** ppAh -> string */
  threadInputs: Dictionary<String>,
  /** ppAh -> Timestamp */
  initialThreadProbeLogTss: Dictionary<Timestamp>,
  /** */
  initialGlobalProbeLogTs: Timestamp;
  /** */
  signaledNotifications: WeaveNotification[],
}


/**
 * ViewModel fo the Threads DNA
 * Holds two zomes:
 *  - Threads
 *  - Profiles
 */
export class ThreadsDvm extends DnaViewModel {

  static readonly DEFAULT_BASE_ROLE_NAME = VINES_DEFAULT_ROLE_NAME;
  static readonly ZVM_DEFS = [ThreadsZvm, ProfilesAltZvm, AuthorshipZvm/*, PathExplorerZvm*/ ]

  readonly signalHandler?: AppSignalCb = this.handleSignal;


  /** QoL Helpers */
  get profilesZvm(): ProfilesAltZvm {
    return this.getZomeViewModel(ProfilesZvm.DEFAULT_ZOME_NAME) as ProfilesAltZvm;
  }

  get threadsZvm(): ThreadsZvm {
    return this.getZomeViewModel(ThreadsZvm.DEFAULT_ZOME_NAME) as ThreadsZvm;
  }

  get originalsZvm(): AuthorshipZvm {
    return this.getZomeViewModel(AuthorshipZvm.DEFAULT_ZOME_NAME) as AuthorshipZvm;
  }

  /** -- Perspective -- */

  protected hasChanged(): boolean {
    // TODO
    return true
  }

  get perspective(): ThreadsDnaPerspective {
    return {
      agentPresences: this._agentPresences,
      threadInputs: this._threadInputs,
      initialThreadProbeLogTss: this._initialThreadProbeLogTss,
      initialGlobalProbeLogTs: this._initialGlobalProbeLogTs,
      signaledNotifications: this._signaledNotifications,
    }
  }

  /** agentPubKey -> timestamp */
  private _agentPresences: Record<string, number> = {};
  private _threadInputs = {};
  private _initialThreadProbeLogTss = {};
  private _initialGlobalProbeLogTs: Timestamp = 0;
  private _signaledNotifications: WeaveNotification[] = [];


  /** */
  get dnaProperties(): ThreadsProperties {
    //console.log('dnaProperties() dnaModifiers', this.cell.dnaModifiers);
    const properties = decode(this.cell.dnaModifiers.properties as Uint8Array) as ThreadsProperties;
    //console.log('dnaProperties() properties', properties);
    return properties;
  }


  /** -- Methods -- */

  /** Store probeLog timestamp upon first load of app */
  async initializePerspectiveOnline(): Promise<void> {
    console.log("ThreadsDvm.initializePerspectiveOffline() override")
    await super.initializePerspectiveOnline();
    this._initialGlobalProbeLogTs = this.threadsZvm.perspective.globalProbeLogTs;
    for (const [ppAh, thread] of this.threadsZvm.perspective.threads) {
        this._initialThreadProbeLogTss[ppAh] = thread.latestProbeLogTime;
    }
    console.log("ThreadsDvm.initializePerspectiveOffline() override persp =", this.perspective)
  }


  /** */
  private updatePresence(from: AgentPubKeyB64) {
    const currentTimeInSeconds: number = Math.floor(Date.now() / 1000);
    console.log("Updating presence of", from, currentTimeInSeconds);
    this._agentPresences[from] = currentTimeInSeconds;
    this.notifySubscribers();
  }


  /** -- Signaling -- */


  /** */
  handleSignal(signal: AppSignal) {
    console.log("[threads.dvm] Received Signal", signal);
    if (signal.zome_name !== ThreadsZvm.DEFAULT_ZOME_NAME) {
      return;
    }
    const threadsSignal = signal.payload as ThreadsSignal;
    console.log("THREADS received signal", threadsSignal);
    if (!("pulses" in threadsSignal)) {
      return;
    }
    for (const pulse of threadsSignal.pulses) {
      /*await*/ this.handleThreadsSignal(pulse, encodeHashToBase64(threadsSignal.from));
    }
    this.notifySubscribers();
  }


  /** */
  async handleThreadsSignal(threadsSignal: ThreadsSignalProtocol, from: AgentPubKeyB64): Promise<void> {
    /* Update agent's known presence */
    this.updatePresence(from);
    /** -- Handle Signal according to type -- */
    if (ThreadsSignalProtocolType.Tip in threadsSignal) {
      return this.handleTip(threadsSignal.Tip as TipProtocol, from);
    }
    if (ThreadsSignalProtocolType.Entry in threadsSignal) {
      return this.handleEntrySignal(threadsSignal.Entry as [EntryInfo, ThreadsEntry], from);
    }
    if (ThreadsSignalProtocolType.Link in threadsSignal) {
      return this.handleLinkSignal(threadsSignal.Link as [ActionHash, LinkInfo, ThreadsLinkType], from);
    }
  }


  /** */
  private async handleInboxSignal(linkAh: ActionHashB64, linkInfo: LinkInfo, from: AgentPubKeyB64) {
    const author = encodeHashToBase64(linkInfo.author);
    const base = encodeHashToBase64(linkInfo.base);
    const target = encodeHashToBase64(linkInfo.target);

    if (StateChangeType.Update in linkInfo.state) {
      console.error("Not possible to Update a link");
      return;
    }
    if (StateChangeType.Delete in linkInfo.state) {
      //const isNew = linkInfo.state.Delete;
      if (target == this.cell.agentPubKey) {
        await this.threadsZvm.unstoreNotification(linkAh);
      }
      return;
    }
    /** Create */
    const isNew = linkInfo.state.Create;
    const eventIndex = Number(linkInfo.tag)
    const event = NotifiableEvent[eventIndex];
    console.log("handleInboxSignal() eventIndex", eventIndex, event);
    const notif: WeaveNotification = {
      event,
      author: linkInfo.author,
      timestamp: linkInfo.ts,
      link_ah: decodeHashFromBase64(linkAh),
      content: linkInfo.target,
    };
    /** I got notified */
    if (base == this.cell.agentPubKey) {
      /** Store Notification */
      await this.threadsZvm.storeNotification(notif, false);
      /** Publish a NotifySetting.AllMessages for this thread if non exists */
      if (NotifiableEvent.NewDmThread === event && isNew) {
        const ppAh = encodeHashToBase64(notif.content);
        console.log("NewDmThread in inbox:", ppAh);
        const notifSettings = this.threadsZvm.getPpNotifSettings(ppAh);
        const notifSetting = notifSettings[this.cell.agentPubKey];
        if (!notifSetting) {
          await this.threadsZvm.publishNotifSetting(ppAh, NotifySetting.AllMessages);
          console.log("NewDmThread.publishNotifSetting() inbox", ppAh);
        }
      }
    } else {
      /** I notified a peer */
      /** Tip peer that we send them a notification */
      let extra;
      if (NotifiableEvent.NewDmThread === event || NotifiableEvent.Fork === event) {
        console.log("Signaling new PP notification to peer", base, target);
        const ppAh = encodeHashToBase64(linkInfo.target);
        const ppMat = this.threadsZvm.getParticipationProtocol(ppAh);
        extra = encode(dematerializeParticipationProtocol(ppMat));
      } else {
        /** NewBead, Mention, Reply */
        console.log("Signaling new Bead notification to peer", base, target);
        const beadAh = encodeHashToBase64(linkInfo.target);
        const beadPair = this.threadsZvm.perspective.beads[beadAh];
        extra = encode(dematerializeTypedBead(beadPair[1], beadPair[0].beadType));
      }
      const notifPulse = this.threadsZvm.createNotificationSignal(notif, extra);
      await this.threadsZvm.emitNotificationTip(target, notifPulse);
    }
  }


  /** */
  private async handleLinkSignal([link_ah, linkInfo, linkType]: [ActionHash, LinkInfo, ThreadsLinkType], from: AgentPubKeyB64) {
    const author = encodeHashToBase64(linkInfo.author);
    const base = encodeHashToBase64(linkInfo.base);
    const target = encodeHashToBase64(linkInfo.target);
    let tip: TipProtocol;
    switch(linkType) {
      case ThreadsLinkType.Inbox:
        this.handleInboxSignal(encodeHashToBase64(link_ah), linkInfo, from);
      break;
      case ThreadsLinkType.Hide:
        this.threadsZvm.storeHidden(target, StateChangeType.Create in linkInfo.state, false);
      break;
      case ThreadsLinkType.EmojiReaction: {
        if (StateChangeType.Create in linkInfo.state) {
          const isNew = linkInfo.state.Create;
          const emoji = String(linkInfo.tag);
          console.warn("EmojiReaction CreateLink:", linkInfo.tag, emoji);
          await this.threadsZvm.storeEmojiReaction(base, author, emoji);
          if (isNew) {
            tip = {type: "EmojiReactionChange", bead_ah: base, author, emoji, is_added: true};
          }
        }
        if (StateChangeType.Delete in linkInfo.state) {
          const isNew = linkInfo.state.Delete;
          const emoji = String(linkInfo.tag);
          console.warn("EmojiReaction DeleteLink:", linkInfo.tag, emoji);
          await this.threadsZvm.unstoreEmojiReaction(base, author, emoji);
          if (isNew) {
            tip = {type: "EmojiReactionChange", bead_ah: base, author, emoji, is_added: false};
          }
        }
      }
      break;
      case ThreadsLinkType.NotifySetting: {
        if (StateChangeType.Create in linkInfo.state) {
          const setting = String(linkInfo.tag);
          console.warn("NotifySetting CreateLink:", linkInfo.tag, setting);
          this.threadsZvm.storeNotifSetting(base, target, setting as NotifySetting, false);
        }
        // if (StateChangeType.Delete in linkInfo.state) {
        //   this.threadsZvm.storeNotifSetting(target);
        // }
      }
      break;
      case ThreadsLinkType.Favorite: {
        if (StateChangeType.Create in linkInfo.state) {
          this.threadsZvm.storeFavorite(target);
        }
        if (StateChangeType.Delete in linkInfo.state) {
          this.threadsZvm.unstoreFavorite(target);
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
  private async handleEntrySignal([entryInfo, kind]: [EntryInfo, ThreadsEntry], from: AgentPubKeyB64) {
    const entryType = Object.keys(kind)[0];
    const author = encodeHashToBase64(entryInfo.author);
    const hash = encodeHashToBase64(entryInfo.hash);
    let tip: TipProtocol;
    switch(entryType) {
      case "AnyBead":
        const anyBead = (kind as ThreadsEntryVariantAnyBead).AnyBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, anyBead, ThreadsEntryType.AnyBead, entryInfo.state.Create);
        }
      break;
      case "EntryBead":
        const entryBead = (kind as ThreadsEntryVariantEntryBead).EntryBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, entryBead, ThreadsEntryType.EntryBead, entryInfo.state.Create);
        }
      break;
      case "TextBead":
        const textBead = (kind as ThreadsEntryVariantTextBead).TextBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, textBead, ThreadsEntryType.TextBead, entryInfo.state.Create);
        }
      break;
      case "EncryptedBead":
        const encBead = (kind as ThreadsEntryVariantEncryptedBead).EncryptedBead;
        if (StateChangeType.Create in entryInfo.state) {
          tip = await this.handleBeadEntry(entryInfo, encBead, ThreadsEntryType.EncryptedBead, entryInfo.state.Create);
        }
      break;
      case "SemanticTopic":
        const semTopic = (kind as ThreadsEntryVariantSemanticTopic).SemanticTopic;
        if (StateChangeType.Create in entryInfo.state) {
          const isNew = entryInfo.state.Create;
          this.threadsZvm.storeSemanticTopic(hash, semTopic.title, isNew);
          if (isNew) {
            tip = {type: "NewSemanticTopic", topic_eh: hash, title: semTopic.title};
          }
        }
      break;
      case "ParticipationProtocol":
        const pp = (kind as ThreadsEntryVariantParticipationProtocol).ParticipationProtocol;
        if (StateChangeType.Create in entryInfo.state) {
          const isNew = entryInfo.state.Create;
          this.threadsZvm.storeThread(hash, pp, entryInfo.ts, author, isNew);
          if (isNew) {
            tip = {type: "NewPp", creation_ts: entryInfo.ts, ah: hash, pp};
          }
        }
      break;
      case "GlobalLastProbeLog": {
        const globalLog = (kind as ThreadsEntryVariantGlobalLastProbeLog).GlobalLastProbeLog;
        let isNew = false;
        if (StateChangeType.Create in entryInfo.state) {
          isNew = entryInfo.state.Create;
        }
        if (StateChangeType.Update in entryInfo.state) {
          isNew = entryInfo.state.Update;
        }
        this.threadsZvm.storeGlobalLog(globalLog.ts);
      }
      break;
      case "ThreadLastProbeLog": {
        const threadLog = (kind as ThreadsEntryVariantThreadLastProbeLog).ThreadLastProbeLog;
        let isNew = false;
        if (StateChangeType.Create in entryInfo.state) {
          isNew = entryInfo.state.Create;
        }
        if (StateChangeType.Update in entryInfo.state) {
          isNew = entryInfo.state.Update;
        }
        this.threadsZvm.storeThreadLog(threadLog);
      }
      break;
    }
    /** */
    if (tip) {
      await this.broadcastTip(tip);
    }
  }


  /** */
  private async handleBeadEntry(entryInfo: EntryInfo, bead: TypedBead, beadType: BeadType, isNew: boolean): Promise<TipProtocol> {
    console.log("handleBeadEntry()", beadType, encodeHashToBase64(entryInfo.hash));
    if (!isHashType(entryInfo.author, 'Agent') || !isHashType(entryInfo.hash, 'Action')) {
      console.error("Bad hash typed in EntryInfo", entryInfo);
      return;
    }
    const author = encodeHashToBase64(entryInfo.author);
    const beadAh = encodeHashToBase64(entryInfo.hash);
    const typed = materializeTypedBead(bead, beadType);
    let tip: TipProtocol;
    this.threadsZvm.storeTypedBead(beadAh, typed, beadType, entryInfo.ts, author, false, isNew);

    const ppAh = beadType == ThreadsEntryType.EncryptedBead
      ? this.threadsZvm.perspective.decBeads[beadAh][0].bead.ppAh
      : (typed as unknown as TypedBaseBeadMat).bead.ppAh;
    const data = encode({typed, beadType});
    if (isNew) {
      //await delay(100); // Wait a bit because recipients don't handle signals with async and there could be two NewBead signals.
      tip = {type: "NewBead", creation_ts: entryInfo.ts, bead_ah: beadAh, bead_type: beadType, pp_ah: ppAh, data};
    }
    /** */
    return tip;
  }


  /** */
  private async handleTip(tip: TipProtocol, from: AgentPubKeyB64) {
    /* Send pong response */
    if (tip.type != "Pong") {
      console.log("PONGING ", from)
      const pong: TipProtocol = {type: "Pong", from: this._cellProxy.cell.agentPubKey};
      this.broadcastTip(pong, [from])
    }
    /* Handle signal */
    switch (tip.type) {
      case "Ping":
      case "Pong":
      break;
      case "Notification": {
          return this.handleNotificationTip(tip.value, from);
        }
      break;
      case "UpdateSemanticTopic": {
        const {old_topic_eh, new_topic_eh, title} = tip as TipProtocolVariantUpdateSemanticTopic;
        this.threadsZvm.unstoreSemanticTopic(old_topic_eh);
        this.threadsZvm.storeSemanticTopic(new_topic_eh, title, true);
      }
      break;
      case "NewSemanticTopic":
        const {topic_eh, title} = tip as TipProtocolVariantNewSemanticTopic;
        this.threadsZvm.storeSemanticTopic(topic_eh, title, true);
        break;
      case "NewPp": {
        const {creation_ts, ah, pp} = tip as TipProtocolVariantNewPp;
        ///*await */ this.threadsZvm.fetchPp(newPpAh);
        this.threadsZvm.storeThread(ah, pp, creation_ts, from, true);
      }
      break;
      case "NewBead":
        const {creation_ts, bead_ah, bead_type, pp_ah, data} = tip as TipProtocolVariantNewBead;
        console.log("Signal is NewBead of type", bead_type);
        const {typed, beadType} = decode(data) as {typed: TypedBead, beadType: BeadType};
        console.log("NewBead", bead_ah, typed, beadType, bead_type);
        //const beadType = beadTypeStr as BeadType;
        /* await*/ this.threadsZvm.storeTypedBead(bead_ah, materializeTypedBead(typed, beadType), beadType, creation_ts, from, true, true);
      break;
      case "EmojiReactionChange": {
        const {bead_ah, author, emoji, is_added} = tip as TipProtocolVariantEmojiReactionChange;
        if (is_added) {
          this.threadsZvm.storeEmojiReaction(bead_ah, author, emoji);
        } else {
          this.threadsZvm.unstoreEmojiReaction(bead_ah, author, emoji);
        }
      }
      break;
    }
  }


  /** */
  private async handleNotificationTip(notifTip: ThreadsNotification, from: AgentPubKeyB64) {
    const notif = notifTip.notification as WeaveNotification;
    const extra: Uint8Array = notifTip.data;

    let ppAh: ActionHashB64;
    /** Store received Entry */
    if (NotifiableEvent.Mention == notif.event || NotifiableEvent.Reply == notif.event || NotifiableEvent.NewBead == notif.event) {
      const {typed, beadType} = decode(extra) as {typed: TypedBead, beadType: BeadType};
      const typedMat = materializeTypedBead(typed, beadType);
      const beadAh = encodeHashToBase64(notif.content);
      //ppAh = typedMat.bead.ppAh;
      // if (!notifSignal.maybePpHash) {
      //   console.error("Missing ppAh in ThreadsSignal");
      // }
      ppAh = encodeHashToBase64(notifTip.pp_ah);
      console.log(`Received NotificationSignal of type ${JSON.stringify(notif.event)}:`, beadAh, typedMat);
      await this.threadsZvm.storeTypedBead(beadAh, typedMat, beadType, notif.timestamp, encodeHashToBase64(notif.author), true, true);
    }
    /* Set notif setting */
    if (NotifiableEvent.NewDmThread == notif.event) {
      ppAh = encodeHashToBase64(notif.content);
      /* skip if known thread */
      const dmThread = this.threadsZvm.perspective.threads.get(ppAh);
      if (dmThread) {
        return;
      }
      /** Store thread */
      const pp = decode(extra) as ParticipationProtocol;
      this.threadsZvm.storeThread(ppAh, pp, notif.timestamp, encodeHashToBase64(notif.author), false, true);
      /* Set NotifSetting */
      console.log("NewDmThread.publishNotifSetting() signal", ppAh);
      await this.threadsZvm.publishNotifSetting(ppAh, NotifySetting.AllMessages);
    }
    if (NotifiableEvent.Fork === notif.event) {
      const pp = decode(extra) as ParticipationProtocol;
      ppAh = encodeHashToBase64(notif.content);
      console.log(`Received NotificationSignal of type ${NotifiableEvent.Fork}:`, pp);
      this.threadsZvm.storeThread(ppAh, pp, notif.timestamp, encodeHashToBase64(notif.author), false, true);
    }

    /** Store Notification */
    this._signaledNotifications.push(notif);
    await this.threadsZvm.storeNotification(notif, true, ppAh);
  }


  /** */
  async broadcastTip(tip: TipProtocol, peers?: Array<AgentPubKeyB64>): Promise<void> {
    peers = peers? peers : this.profilesZvm.getAgents() /*this.allCurrentOthers()*/;
    const filtered = peers.filter((key) => key != this._cellProxy.cell.agentPubKey);
    console.log(`[threads.dvm] broadcastTip() Sending Tip "${tip.type}" to`, filtered, this._cellProxy.cell.agentPubKey);
    /* Skip if no recipients or sending to self only */
    //if (!peers || peers.length == 1 && peers[0] === this._cellProxy.cell.agentPubKey) {
    if (!filtered || filtered.length == 0) {
      console.log("[threads.dvm] broadcastTip() aborted: No recipients for notification")
      return;
    }
    return this.threadsZvm.broadcastTip(tip, filtered);
  }


  /** */
  async pingPeers(maybePpHash: ActionHashB64 | null, peers: Array<AgentPubKeyB64>) {
    // const ping: SignalPayload = {
    //   maybePpHash: maybePpHash ? maybePpHash : undefined,
    //   from: this._cellProxy.cell.agentPubKey,
    //   dm: {type: DirectMessageType.Ping, content: this._cellProxy.cell.agentPubKey}
    // };
    // // console.log({signal})
    // this.notifyPeers(ping, peers);
  }


  /** */
  allCurrentOthers(startingAgents: AgentPubKeyB64[] ): AgentPubKeyB64[] {
    const agents = startingAgents;
    console.log("allCurrentOthers", agents)
    console.log("allCurrentOthers", this._agentPresences)
    const currentTime: number = Math.floor(Date.now() / 1000);
    const keysB64 = agents
      .filter((key) => key != this.cell.agentPubKey)
      .filter((key) => {
        const lastPingTime = this._agentPresences[key];
        if (!lastPingTime) return false;
        return (currentTime - lastPingTime) < 5 * 60; // 5 minutes
      });
    console.log({keysB64});
    return keysB64;
  }


  /** -- (un)Publish / Edit -- */

  /** */
  async publishMessage(beadType: BaseBeadType, content: TypedContent, ppAh: ActionHashB64, author?: AgentPubKeyB64, ments?: AgentPubKeyB64[], prevBead?: ActionHashB64): Promise<ActionHashB64> {
    const isDmThread = this.threadsZvm.isThreadDm(ppAh);
    if (isDmThread) {
      return this.publishDm(isDmThread, beadType, content, prevBead);
    }
    return this.publishTypedBead(beadType, content, ppAh, author, ments, prevBead);
  }


  /** */
  async publishDm(otherAgent: AgentPubKeyB64, beadType: BaseBeadType, content: TypedContent, prevBead?: ActionHashB64): Promise<ActionHashB64> {
    const dmAh = this.threadsZvm.perspective.dmAgents[otherAgent];
    /** Create or grab DmThread */
    let ppAh: ActionHashB64;
    if (!dmAh) {
      ppAh = await this.threadsZvm.createDmThread(otherAgent);
    } else {
      ppAh = dmAh;
    }
    /** Create Bead */
    const bead = await this.threadsZvm.createNextBead(ppAh, prevBead);
    const typed = await this.threadsZvm.content2Typed(bead, content, beadType);
    const base = bead2base(typed, beadType);
    const encBead = await this.threadsZvm.zomeProxy.encryptBead({base, otherAgent: decodeHashFromBase64(otherAgent)});
    let beadAh = await this.publishTypedBead(ThreadsEntryType.EncryptedBead, {encBead, otherAgent: decodeHashFromBase64(otherAgent)}, ppAh);
    return beadAh;
  }


  /** */
  async publishTypedBead(beadType: BeadType, content: TypedContent | EncryptedBeadContent, ppAh: ActionHashB64, author?: AgentPubKeyB64, ments?: AgentPubKeyB64[], prevBead?: ActionHashB64): Promise<ActionHashB64> {
    /** */
    let [ah, _time_anchor, _creation_ts, _typed] = await this.threadsZvm.publishTypedBead(beadType, content, ppAh, author, ments, prevBead);
    /** Erase saved input */
    delete this._threadInputs[ppAh];
    /** */
    return ah;
  }


  /** */
  async editSemanticTopic(old_eh: EntryHashB64, title: string): Promise<EntryHashB64> {
    let eh = await this.threadsZvm.editSemanticTopic(old_eh, title);
    const tip: TipProtocol = {type: "UpdateSemanticTopic", old_topic_eh: old_eh, new_topic_eh: eh, title};
    await this.broadcastTip(tip);
    return eh;
  }


  /** */
  async publishCommentThread(subject: Subject, subject_name: string): Promise<ActionHashB64> {
    const pp: ParticipationProtocol = {
      purpose: "comment",
      rules: "N/A",
      subject,
      subject_name,
    };
    const [_creation_ts, ppAh] = await this.threadsZvm.publishParticipationProtocol(pp);
    return ppAh;
  }


  /** */
  async publishEmoji(beadAh: ActionHashB64, emoji: string) {
    const has = this.threadsZvm.hasEmojiReaction(beadAh, this.cell.agentPubKey, emoji);
    if (has) {
      return;
    }
    await this.threadsZvm.zomeProxy.addReaction({bead_ah: decodeHashFromBase64(beadAh), emoji});
  }


  /** */
  async unpublishEmoji(beadAh: ActionHashB64, emoji: string) {
    const has = this.threadsZvm.hasEmojiReaction(beadAh, this.cell.agentPubKey, emoji);
    if (!has) {
      return;
    }
    await this.threadsZvm.zomeProxy.removeReaction(decodeHashFromBase64(beadAh));
  }


  /** -- Import & Export -- */

  /** Probe all threads before exporting */
  async exportAllPerspective(): Promise<string> {
    await this.threadsZvm.probeAllInnerAsync();
    /* Probe all threads */
    let probes = []
    for (const [ppAh, thread] of this.threadsZvm.perspective.threads) {
      probes.push(this.threadsZvm.probeAllBeads(ppAh));
    }
    await Promise.all(probes);
    /* Done */
    return this.exportPerspective();
  }


  /** Dump perspective as JSON */
  exportPerspective(): string {
    //console.log("Dvm.exportPerspective()", name)
    const dvmExport = {};
    //for (const [name, zvm] of Object.entries(this._zomeViewModels)) {
    const tJson = this.threadsZvm.exportPerspective(this.originalsZvm);
    dvmExport[ThreadsZvm.DEFAULT_ZOME_NAME] = JSON.parse(tJson);

    const pJson = this.profilesZvm.exportPerspective(/*this.originalsZvm*/);
    dvmExport[ProfilesZvm.DEFAULT_ZOME_NAME] = JSON.parse(pJson);
    //}

    const oJson = this.originalsZvm.exportPerspective();
    dvmExport[AuthorshipZvm.DEFAULT_ZOME_NAME] = JSON.parse(oJson);

    //const dvmJson = this.exportDvmPerspective();
    //dvmExport[ThreadsDvm.DEFAULT_BASE_ROLE_NAME] = dvmJson;

    return JSON.stringify(dvmExport, null, 2);
  }


  /** */
  async importPerspective(json: string, canPublish: boolean) {
    //console.log("Dvm.importPerspective()", json)

    // for (const [_name, zvm] of Object.entries(this._zomeViewModels)) {
    //   zvm.importPerspective();
    // }

    const external = JSON.parse(json) as any;
    const profiles = external[ProfilesZvm.DEFAULT_ZOME_NAME];
    const threadsPersp = external[ThreadsZvm.DEFAULT_ZOME_NAME];
    const originals = external[AuthorshipZvm.DEFAULT_ZOME_NAME];
    //const dvmPersp = external[ThreadsDvm.DEFAULT_BASE_ROLE_NAME];


    this.originalsZvm.importPerspective(JSON.stringify(originals));
    await this.profilesZvm.importPerspective(JSON.stringify(profiles), canPublish);
    await this.threadsZvm.importPerspective(JSON.stringify(threadsPersp), canPublish, this.originalsZvm);

    console.log("import perspective", this.originalsZvm.perspective);

    this.notifySubscribers();
  }


  /** -- Debug -- */

  /** */
  async generateTestSignals(appletId: AppletId): Promise<void> {
    console.log("generateTestSignals() START");
    const stEh = await this.threadsZvm.publishSemanticTopic("signal-topic");
    await delay(1000);
    const [_ts, ppAh] = await this.threadsZvm.publishThreadFromSemanticTopic(appletId, stEh, "testing");
    await delay(1000);
    const msgAh = await this.publishTypedBead(ThreadsEntryType.TextBead, "msg-1", ppAh, this.cell.agentPubKey, []);
    console.log("generateTestSignals() END", msgAh);
  }
}
