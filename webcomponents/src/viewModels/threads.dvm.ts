import {
  ActionId,
  ActionIdMap,
  AgentId,
  AgentIdMap,
  delay,
  DnaViewModel,
  EntryPulse,
  materializeEntryPulse,
  TipProtocol,
  TipProtocolVariantAppCustom, ValidatedBy,
  ZomeSignal,
  ZomeSignalProtocol,
  ZomeSignalProtocolType,
  ZomeViewModel
} from "@ddd-qc/lit-happ";
import {catchThrottled, ThreadsZvm} from "./threads.zvm";
import {ActionHashB64, AppSignal, Signal, SignalCb, SignalType, Timestamp} from "@holochain/client";
import {
  ParticipationProtocol,
  Subject,
  ThreadsEntryType,
  ThreadsProperties,
  VINES_DEFAULT_ROLE_NAME,
} from "../bindings/threads.types";
import {
  BaseBeadType,
  bead2base,
  defaultLimitations,
  defaultModeration,
  ThreadsAppTip,
  ThreadsNotification,
  ThreadsNotificationTip,
  TypedContent,
} from "./threads.materialize";
import {ProfilesAltZvm, ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {Decoder, Encoder} from "@msgpack/msgpack";
import {AuthorshipZvm} from "./authorship.zvm";
import {HOLOCHAIN_ID_EXT_CODEC} from "@ddd-qc/cell-proxy";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {PathExplorerZvm} from "@ddd-qc/path-explorer";
import {GetStrategy} from "@holochain-open-dev/core-types";
import {THIS_APPLET_ID} from "../contexts";
import {countValidReceipts, MAIN_SEMANTIC_TOPIC, MAIN_TOPIC_ID} from "../utils";
import {prettyTimestamp} from "@ddd-qc/files";
import {ImportConfirmed} from "../features/migration/import-summary";
import {DiscordImportData} from "../features/migration/import-utils";


/** */
export type ThreadsDnaPerspective = {
  /* agentId -> (Timestamp, threadAh) */
  agentPresences: AgentIdMap<[number, ActionId | null]>,
  /** ppAh -> string */
  threadInputs: ActionIdMap<string>,
  /** ppAh -> Timestamp */
  initialThreadProbeLogTss: ActionIdMap<Timestamp>,
  /** */
  initialGlobalProbeLogTs: Timestamp;
  /** */
  signaledNotifications: ThreadsNotification[],
  /** track who is currently typing per thread */
  /** ppAh -> (AgentId -> last seen timestamp) */
  typings: ActionIdMap<AgentIdMap<Timestamp>>,
  /** Track unvalidated beads */
  myUnvalidatedBeads: Set<ActionHashB64>,
  validationRequests: AgentIdMap<Set<ActionHashB64>>,
  /** my newly created topic */
  myNewestTopic: null | ActionId,
  /** */
  importing: boolean,
  importingPct: number,
}

export type ThreadsDnaPerspectiveComparable = {
  importing: boolean,
  importingPct: number,
  signaledNotifications: number,
  initialThreadProbeLogTss: number,
  agentPresences: string,
  myUnvalidatedBeads: number,
}


/**
 * ViewModel for the Threads DNA
 * Holds two zomes:
 *  - Threads
 *  - Profiles
 */
export class ThreadsDvm extends DnaViewModel {

  static override readonly DEFAULT_BASE_ROLE_NAME = VINES_DEFAULT_ROLE_NAME;
  static override readonly ZVM_DEFS = [ThreadsZvm, ProfilesAltZvm, AuthorshipZvm, PathExplorerZvm]

  readonly signalHandler?: SignalCb = this.handleSignal;

  private _encoder = new Encoder(HOLOCHAIN_ID_EXT_CODEC);
  private _decoder = new Decoder(HOLOCHAIN_ID_EXT_CODEC);

  private _currentLocation: ActionId | null = null;


  /** QoL Helpers */
  get profilesZvm(): ProfilesAltZvm {
    return this.getZomeViewModel(ProfilesZvm.DEFAULT_ZOME_NAME) as ProfilesAltZvm;
  }

  get threadsZvm(): ThreadsZvm {
    return this.getZomeViewModel(ThreadsZvm.DEFAULT_ZOME_NAME) as ThreadsZvm;
  }

  get authorshipZvm(): AuthorshipZvm {
    return this.getZomeViewModel(AuthorshipZvm.DEFAULT_ZOME_NAME) as AuthorshipZvm;
  }


  /** -- Setters -- */

  setLocation(loc: ActionId | null) {
    this._currentLocation = loc;
    this.broadcastLocation(this.profilesZvm.perspective.agents);
  };


  /** -- Perspective -- */


  private _perspective: ThreadsDnaPerspective = {
    agentPresences: new AgentIdMap(),
    threadInputs: new ActionIdMap(),
    initialThreadProbeLogTss: new ActionIdMap(),
    initialGlobalProbeLogTs: 0,
    signaledNotifications: [],
    typings: new ActionIdMap(),
    myUnvalidatedBeads: new Set(),
    myNewestTopic: null,
    validationRequests: new AgentIdMap(),
    importing: false,
    importingPct: 1.0,
  }


  get perspective(): ThreadsDnaPerspective {
    return this._perspective;
  }

  override comparable(): Object {
    const res: ThreadsDnaPerspectiveComparable = {
      importing: this.perspective.importing,
      importingPct: this.perspective.importingPct,
      signaledNotifications: this.perspective.signaledNotifications.length,
      initialThreadProbeLogTss: this.perspective.initialThreadProbeLogTss.size,
      agentPresences: JSON.stringify(Array.from(this.perspective.agentPresences.entries())),
      myUnvalidatedBeads: this.perspective.myUnvalidatedBeads.size,
    }
    return res;
  }


  /** */
  get dnaProperties(): ThreadsProperties {
    //console.log('dnaProperties() dnaModifiers', this.cell.dnaModifiers);
    const properties = this._decoder.decode(this.cell.dnaModifiers.properties as Uint8Array) as ThreadsProperties;
    //console.log('dnaProperties() properties', properties);
    return properties;
  }


  /** -- Methods -- */


  /** Store probeLog timestamp upon first load of app */
  // TODO: switch back to FromNetwork once GetStrategy from Network are fixed
  override async initializePerspectiveFromLocal(): Promise<void> {
    console.log("ThreadsDvm.initializePerspectiveFromLocal() override")
    await super.initializePerspectiveFromLocal();
    this._perspective.initialGlobalProbeLogTs = this.threadsZvm.perspective.globalProbeLogTs;
    for (const [ppAh, thread] of this.threadsZvm.perspective.threads) {
      this._perspective.initialThreadProbeLogTss.set(ppAh, thread.latestProbeLogTime);
    }
    console.log("ThreadsDvm.initializePerspectiveFromLocal() override persp =", this._perspective)
  }

  /** */
  unstorePresence(agent: AgentId) {
    this._perspective.agentPresences.delete(agent);
  }
  
  /**
   * If thread is not provided we just know peer is online and assume still at the same location.
   * Peer can be online but not in any thread (thread = null)
   */
  storePresence(from: AgentId, timeMs: number, thread?: ActionId | null) {
    //console.debug("storePresence()", from.short, timeMs);
    if (this.cell.address.agentId.equals(from)) {
      return;
    }
    if (thread !== undefined && thread !== null && !(thread instanceof ActionId)) {
      let x = (thread as ActionId).b64;
      if (x) {
        thread = new ActionId(x);
      } else {
        return;
      }
    }

    const currentTimeInSeconds: number = Math.floor(timeMs / 1000);
    let newest: [number, ActionId | null] = [currentTimeInSeconds, thread !== undefined? thread : null];
    let current = this._perspective.agentPresences.get(from);
    console.debug("storePresence()", from.short, currentTimeInSeconds, newest, current, thread);
    if (!current) {
      /** First time presence */
      current = newest;
      /** Ask for location or share my location since peer might not know my location at this time */
      if (thread === undefined) {
        const locTip: ThreadsAppTip = {type: thread === undefined? "where" : "location", data: this._currentLocation};
        const serTip = this._encoder.encode(locTip);
        this.threadsZvm.broadcastTip({AppCustom: serTip}, [from]);
      }
    } else {
      /** Update only if newer */
      if (newest[0] < current[0]) {
        return;
      }
      if (thread === undefined) {
        current[0] = currentTimeInSeconds;
      } else {
        current = newest;
      }
    }
    //console.debug("storePresence() STORED");
    this._perspective.agentPresences.set(from, current);
    /** */
    this.notifySubscribers();
  }

  /** Check every 5 secs for peers online and request validations for unvalidated beads, if any. */
  private _processMyUnvalidatedInterval: any = undefined;
  private _unvalidatedRunning = false;
  processMyUnvalidated() {
      if (this._processMyUnvalidatedInterval) {
          return;
      }
      this._processMyUnvalidatedInterval = setInterval(async () => {
          if (this._unvalidatedRunning) {
            return;
          }
          if (this._perspective.myUnvalidatedBeads.size == 0) {
            clearInterval(this._processMyUnvalidatedInterval);
            this._processMyUnvalidatedInterval = undefined;
            return;
          }
          this._unvalidatedRunning = true;
          try {
            const others = this.allCurrentOthers();
            console.info("ThreadsDvm.processUnvalidated() myUnvalidatedBeads", this._perspective.myUnvalidatedBeads, others.length);
            if (others.length > 0) {
              const snapshot = [...this._perspective.myUnvalidatedBeads];
              // for the first 10 beads
              for (const unvalidatedBeadAhB64 of  snapshot.slice(0, 10)) {
                console.log("myUnvalidatedBeads getMyReceipts()", unvalidatedBeadAhB64);
                const [_e, receipts] = await catchThrottled(this.threadsZvm.zomeProxy.getMyReceipts(new ActionId(unvalidatedBeadAhB64).hash));
                const validationCount = receipts ? countValidReceipts(receipts) : 0;
                if (validationCount > 0) {
                  this._perspective.myUnvalidatedBeads.delete(unvalidatedBeadAhB64);
                  console.debug("processMyUnvalidated Removed from myUnvalidatedBeads", unvalidatedBeadAhB64, this._perspective.myUnvalidatedBeads);
                } else {
                  /*await*/ this.requestValidation(new ActionId(unvalidatedBeadAhB64), others.slice(0, 5)); // ask 5 other peers
                }
              }
              console.log("myUnvalidatedBeads processMyUnvalidated() done", this._perspective.myUnvalidatedBeads);
            }
          } finally { this._unvalidatedRunning = false; }
      }, 5000)
  }

  /** Check every 2 secs for validation requests and process them */
  private _processAckRequestInterval: any = undefined;
  private _ackRunning = false;
  processValidationRequests() {
    if (this._processAckRequestInterval) {
      return;
    }
    this._processAckRequestInterval = setInterval(async () => {
      if (this._ackRunning) {
        return;
      }
      if (this._perspective.validationRequests.size == 0) {
        clearInterval(this._processAckRequestInterval);
        this._processAckRequestInterval = undefined;
      }
      this._ackRunning = true;
      try {
        console.info("ThreadsDvm.processValidationRequests() validationRequests", this._perspective.validationRequests.size);
        let i = 0;
        for (const ahs of [...this._perspective.validationRequests.values()]) {
          const copyAhs: Set<ActionHashB64> = new Set(ahs); // copy to avoid concurrent modification
          for (const ahB64 of copyAhs) {
            /*await*/ this.threadsZvm.fetchUnknownBead(new ActionId(ahB64), GetStrategy.Local);
            // Limit to 10
            i += 1;
            if (i > 10) return;
          }
        }
      } finally { this._ackRunning = false; }
    }, 2000)
  }

  /** -- Signaling -- */

  /** */
  handleSignal(ssignal: Signal) {
    //console.debug("ThreadsDvm.handleSignal()", ssignal);
    if (SignalType.App != ssignal.type) {
      return;
    }
    const appSignal: AppSignal = ssignal.value;
    if (!("pulses" in (appSignal.payload as Object))) {
      return;
    }
    const signal = appSignal.payload as ZomeSignal;
    const from = new AgentId(signal.from);

    /* Update agent's known presence */
    this.storePresence(from, Date.now());

    // /** Handle signal according to target zome */
    if (appSignal.zome_name == ProfilesAltZvm.DEFAULT_ZOME_NAME) {
        ///*await*/ this.handleProfilesSignal(signal, from);
    } else {
        for (const pulse of signal.pulses) {
            /*await*/ this.handleThreadsSignal(pulse, from);
        }
        this.notifySubscribers();
    }
  }

  /** */
  async handleThreadsSignal(threadsSignal: ZomeSignalProtocol, from: AgentId): Promise<void> {
    //console.log("ThreadsDvm.handleThreadsSignal() valid", threadsSignal, from.b64);
    /** */
    if (ZomeSignalProtocolType.Tip in threadsSignal) {
      return this.handleTip(threadsSignal.Tip as TipProtocol, from);
    }
    if (ZomeSignalProtocolType.Entry in threadsSignal) {
      const entryPulseMat = materializeEntryPulse(threadsSignal.Entry as EntryPulse, (this.threadsZvm.constructor as typeof ZomeViewModel).ENTRY_TYPES);
      switch (entryPulseMat.entryType) {
        case ThreadsEntryType.EncryptedBead:
        case ThreadsEntryType.AnyBead:
        case ThreadsEntryType.EntryBead:
        case ThreadsEntryType.TextBead:
          //console.debug("ThreadsDvm.handleThreadsSignal() Bead", entryPulseMat, this._perspective.ackRequests);
          /** If it's a new Bead from this agent, mark it as Unvalidated */
          if (entryPulseMat.isNew && entryPulseMat.state == "Create") {
            if (entryPulseMat.author.equals(this.cell.address.agentId)) {
              console.debug("ThreadsDvm.handleThreadsSignal() Adding to myUnvalidatedBeads", entryPulseMat.ah.b64, entryPulseMat.entryType, entryPulseMat);
              this._perspective.myUnvalidatedBeads.add(entryPulseMat.ah.b64);
              console.debug("ThreadsDvm.handleThreadsSignal() Adding to myUnvalidatedBeads result", this._perspective.myUnvalidatedBeads);
            }
          }
          // /** Remove requests from offline peers */
          // const others = this.allCurrentOthers().map((a) => a.b64);
          // for (const key of this.perspective.validationRequests.keys()) {
          //   if (!others.includes(key.b64)) this.perspective.validationRequests.delete(key);
          // }
          /** Tell the author that we have validated it */
          const requests = this._perspective.validationRequests.get(entryPulseMat.author);
          if (requests
            && entryPulseMat.state == "Create"
            && !entryPulseMat.author.equals(this.cell.address.agentId)
            && requests.has(entryPulseMat.ah.b64)) {
            this.respondValidationRequest(entryPulseMat.ah.b64);
            this._perspective.validationRequests.get(entryPulseMat.author)!.delete(entryPulseMat.ah.b64);
            if (this._perspective.validationRequests.get(entryPulseMat.author)!.size == 0) {
              this._perspective.validationRequests.delete(entryPulseMat.author);
            }
          }
          break;
        case ThreadsEntryType.ParticipationProtocol:
          if (entryPulseMat.isNew && entryPulseMat.state == "Create" && entryPulseMat.author.equals(this.cell.address.agentId)) {
            this._perspective.myNewestTopic = null;
          }
          break;
        case ThreadsEntryType.SemanticTopic:
          if (entryPulseMat.isNew && entryPulseMat.state == "Create" && entryPulseMat.author.equals(this.cell.address.agentId)) {
            this._perspective.myNewestTopic = entryPulseMat.ah;
          }
          break;
        default:
          break;
      }
    }
  }

    /** */
    async handleProfilesSignal(zomeSignal: ZomeSignal, from: AgentId) {
        console.debug("ThreadsDvm.handleProfilesSignal()", zomeSignal);
        let all: any[] = [];
        for (let pulse of zomeSignal.pulses) {
            /** -- Handle Signal according to type -- */
            if (ZomeSignalProtocolType.Tip in pulse) {
               await this.handleTip(pulse.Tip as TipProtocol, from);
               continue;
            }
            // if (ZomeSignalProtocolType.Link in pulse) {
            //     const linkPulse = materializeLinkPulse(pulse.Link as LinkPulse, Object.values(ProfilesAltLinkType));
            //     //console.debug("ThreadsDvm.handleProfilesSignal() linkPulse", linkPulse);
            //     switch(linkPulse.link_type) {
            //         case ProfilesAltLinkType.PathToAgent: {
            //             const peer = AgentId.from(linkPulse.target);
            //             if (!this._livePeers.map(id => id.b64).includes(peer.b64)) {
            //                 console.debug("ThreadsDvm Adding livePeer", peer.short);
            //                 this._livePeers.push(peer);
            //             }
            //         }
            //             break;
            //         default:
            //             break;
            //     }
            //     continue;
            // }
        }
        await Promise.all(all);
        //console.debug("ThreadsDvm.handleDeliverySignal() notifySubscribers");
        this.notifySubscribers();
    }


  /** */
  private broadcastLocation(to?: AgentId[]) {
    const locTip: ThreadsAppTip = {type: "location", data: this._currentLocation};
    const serTip = this._encoder.encode(locTip);
    //const agents = from? [from] : this.allCurrentOthers();
    const agents = to? to : this.allCurrentOthers();
    console.log("broadcastLocation() of to", this._currentLocation, agents);
    this.threadsZvm.broadcastTip({AppCustom: serTip}, agents);
  }


  /** */
  requestValidation(beadAh: ActionId, others: AgentId[]) {
    console.log("ThreadsDvm.requestValidation()", beadAh);
    const tip: ThreadsAppTip = {type: "validationRequest", data: beadAh.b64};
    const serTip = this._encoder.encode(tip);
    this.threadsZvm.broadcastTip({AppCustom: serTip}, others);
  }


  /** */
  respondValidationRequest(beadAh: ActionHashB64) {
    console.log("ThreadsDvm.respondValidationRequest()", beadAh);
    const beadId: ActionId = new ActionId(beadAh);
    const maybe = this.threadsZvm.perspective.beads.get(beadId);
    if (!maybe) {
      //throw Promise.reject("Missing bead we wanted to AckAuthor about");
      console.warn("respondValidationRequest() aborted. Bead not validated.")
      return;
    }
    const author = maybe[0].author;
    const others = this.allCurrentOthers().map((a) => a.b64);
    if (!others.includes(author.b64)) {
      //console.debug("respondValidationRequest() aborted. Author not connected", others, author.b64)
      return;
    }
    const tip: ThreadsAppTip = {type: "ack", data: beadId.b64};
    const serTip = this._encoder.encode(tip);
    //console.log("ThreadsDvm.respondValidationRequest() sync tip", this.isMainView, beadId.b64);
    this.threadsZvm.synchronizeCustomTip(serTip, author, "zThreads");
  }


  /** */
  addValidationRequest(ah: ActionId, author: AgentId) {
    if (!this._perspective.validationRequests.get(author)) {
      this._perspective.validationRequests.set(author, new Set());
    }
    this._perspective.validationRequests.get(author)!.add(ah.b64);
    this.processValidationRequests();
  }


  /** */
  signalTyping(thread: ActionId, is: boolean) {
    //console.debug("ThreadsDvm.signalTyping()", thread, is);
    const tip: ThreadsAppTip = {type: "typing", data: {thread, is}};
    const serTip = this._encoder.encode(tip);
    this.threadsZvm.broadcastTip({AppCustom: serTip}, this.allCurrentOthers());
  }


  /** */
  addSignaledNotif(notifTip: ThreadsNotificationTip) {
    const notif: ThreadsNotification = {
      //eventIndex: notifTip.event_index,
      event: notifTip.event,
      createLinkAh: notifTip.link_ah,
      author: notifTip.author,
      timestamp: notifTip.timestamp,
      content: new ActionId(notifTip.content.b64),
    }
    if (notif.author !== undefined && notif.author !== null && !(notif.author instanceof AgentId)) {
      let x = (notif.author as AgentId).b64
      if (x) {
        notif.author = new AgentId(x)
      }
    }
    this._perspective.signaledNotifications.push(notif);
  }


  /** */
  private async handleTip(tip: TipProtocol, from: AgentId) {
    // /* Send pong response */
    // if (tip.type != "Pong") {
    //   console.log("PONGING ", from)
    //   const pong: TipProtocol = {type: "Pong", from: this.cell.agentPubKey};
    //   this.broadcastTip(pong, [from])
    // }
    /* Handle signal */
    const type = Object.keys(tip)[0];
    console.log("ThreadsDvm.handleTip()", type, from);
    switch (type) {
      case "Ping":
      case "Pong":
        break;
      case "Entry": {
        if (ZomeSignalProtocolType.Entry in tip) {
          const entryPulseMat = materializeEntryPulse(tip.Entry as EntryPulse, (this.threadsZvm.constructor as typeof ZomeViewModel).ENTRY_TYPES);
          switch (entryPulseMat.entryType) {
            case ThreadsEntryType.EncryptedBead:
            case ThreadsEntryType.AnyBead:
            case ThreadsEntryType.EntryBead:
            case ThreadsEntryType.TextBead:
              console.log("ThreadsDvm.handleTip() Bead", entryPulseMat);
              /** If it's a new Bead, add a validation request */
              if (entryPulseMat.isNew && entryPulseMat.state == "Create" && !entryPulseMat.author.equals(this.cell.address.agentId)) {
                  console.log("ThreadsDvm.handleTip() Adding to validationRequests", entryPulseMat);
                  this.addValidationRequest(entryPulseMat.ah, entryPulseMat.author);
              }
              break;
            default:
              break;
          }
        }
      }
        break;
      case "AppValue":
        break;
      case "AppCustom": {
        const serAppTip = (tip as TipProtocolVariantAppCustom).AppCustom;
        const appTip = this._decoder.decode(serAppTip) as ThreadsAppTip;
        //console.log("ThreadsDvm.handleTip() appTip", appTip);
        switch (appTip.type) {
          case "subject":
            //console.warn("latestThreadName Received subject", appTip.data?.address);
            //this.threadsZvm.storeSubject(appTip.data!);
            break;
          case "typing": {
            console.log("ThreadsDvm.handleTip() typing text-input", appTip.data);
            const ppAh = appTip.data!.thread!;
            const is = appTip.data!.is;
            if (!this._perspective.typings.has(ppAh)) {
              this._perspective.typings.set(ppAh, new AgentIdMap<Timestamp>());
            }
            const prev = this._perspective.typings.get(ppAh)!;
            if (is) {
              prev.set(from, Date.now());
            } else {
              prev.delete(from);
            }
          }
            break
          case "ack":
            console.debug("ThreadsDvm.handleTip() received ack valid", appTip.data);
            catchThrottled(this.threadsZvm.zomeProxy.getMyReceipts(new ActionId(appTip.data).hash)).then(([_err, receipts]) =>  {
              const validationCount = receipts? countValidReceipts(receipts) : 0;
              console.debug("ThreadsDvm.handleTip() attempt Removing from myUnvalidatedBeads ; validationCount", validationCount, appTip.data);
              if (validationCount > 0) {
                this._perspective.myUnvalidatedBeads.delete(appTip.data);
                console.debug("ThreadsDvm.handleTip() Removed from myUnvalidatedBeads", appTip.data, this._perspective.myUnvalidatedBeads);
                this.threadsZvm.setValidation(appTip.data, ValidatedBy.Peer); // TODO: should trigger a get_validation_receipts() instead
              }
            });
            break;
          case "validationRequest":
            console.debug("ThreadsDvm.handleTip() validationRequest", appTip.data);
            const ah = new ActionId(appTip.data);
            if (this.threadsZvm.perspective.beads.get(ah)) {
              this.respondValidationRequest(ah.b64);
            } else {
              this.addValidationRequest(ah, this.cell.address.agentId);
            }
            break;
          case "string":
            console.warn(`TIP APP STRING: "${appTip.data}"`);
            //this.threadsZvm.storeSubject(appTip.data!);
            break;
            case "where":
            /** Peer is asking for our location */
            if (appTip.data) this.storePresence(from, Date.now(), appTip.data); // store their location
            const locTip: ThreadsAppTip = {type: "location", data: this._currentLocation};
            const serTip = this._encoder.encode(locTip);
            this.threadsZvm.broadcastTip({AppCustom: serTip}, [from]);
            break;
          case "location":
            this.storePresence(from, Date.now(), appTip.data);
            break;
          case "notification":
            // const notifTip: ThreadsNotificationTip = appTip.data;
            // this.addSignaledNotif(notifTip)
            break;
        }
      }
        break;
      default:
        break;
    }
  }


  /** */
  async pingPeers(_maybePpHash: ActionId | null, _peers: Array<AgentId>) {
    // const ping: SignalPayload = {
    //   maybePpHash: maybePpHash ? maybePpHash : undefined,
    //   from: this._cellProxy.cell.agentPubKey,
    //   dm: {type: DirectMessageType.Ping, content: this._cellProxy.cell.agentPubKey}
    // };
    // // console.log({signal})
    // this.notifyPeers(ping, peers);
  }


  /** */
  override get livePeers() {
      return this.allCurrentOthers()
  }


  /** Return the list of agents with a known presence not older than 5 minutes */
  allCurrentOthers(startingAgents?: AgentId[], thread?: ActionId): AgentId[] {
    const agents = startingAgents? startingAgents : Array.from(this._perspective.agentPresences.keys());
    //console.debug("allCurrentOthers() ", agents.length, Array.from(this._perspective.agentPresences.keys()), thread, startingAgents);
    const currentTime: number = Math.floor(Date.now() / 1000);
    const filtered = agents
      .filter((key) => !key.equals(this.cell.address.agentId))
      .filter((key) => {
        const pair = this._perspective.agentPresences.get(key);
        if (!pair) return false;
        if (thread) {
          try {
            if (pair[1] == null) return false;
            let x = pair[1] //new ActionId(pair[1].b64)
            if (!x.equals(thread)) return false;
          } catch (e) {
            console.log("pair[1]", pair[1])
            console.log("thread", thread)
            console.log("pair[1] instanceof AgentId", pair[1] instanceof AgentId)
            return false;
          }
        }
        return (currentTime - pair[0]) < 5 * 60; // 5 minutes
      });
    //console.debug("allCurrentOthers() filtered = ", filtered.length);
    return filtered;
  }


  /** -- (un)Publish / Edit -- */

  /** */
  async publishMessage(beadType: BaseBeadType, content: TypedContent, ppAh: ActionId, author?: AgentId, prevBead?: ActionId, weServices?: WeServicesEx) {
    const isDmThread = this.threadsZvm.isThreadDm(ppAh);
    if (isDmThread) {
      return await this.publishDm(isDmThread!, beadType, content, prevBead, weServices);
    } else {
      const res = await this.threadsZvm.publishTypedBead(beadType, content, ppAh, author, prevBead);
      return res[0];
    }
  }


  /** */
  async publishDm(otherAgent: AgentId, beadType: BaseBeadType, content: TypedContent, prevBead?: ActionId, weServices?: WeServicesEx): Promise<ActionId> {
    const dmAh = this.threadsZvm.perspective.dmAgents.get(otherAgent);
    console.log("ThreadsDvm.publishDm()", otherAgent, beadType, content, prevBead, weServices, dmAh);
    /** Create or grab DmThread */
    let ppAh: ActionId;
    if (!dmAh) {
      ppAh = await this.threadsZvm.createDmThread(otherAgent, weServices);
    } else {
      ppAh = dmAh;
    }
    /** Create Bead */
    const bead = await this.threadsZvm.createNextBead(ppAh, prevBead);
    const typed = await this.threadsZvm.content2Typed(bead, content, beadType);
    const base = bead2base(typed, beadType);
    const encBead = await this.threadsZvm.zomeProxy.encryptBead({base, otherAgent: otherAgent.hash});
    const res = await this.threadsZvm.publishTypedBead(ThreadsEntryType.EncryptedBead, {encBead, otherAgent}, ppAh);
    return res[0];
  }


  /** */
  storeThreadInput(ppAh: ActionId, value: string) {
    //console.debug("ThreadsDvm.storeThreadInput()", value);
    if (!value) {
      this._perspective.threadInputs.delete(ppAh);
      /*await*/
      this.signalTyping(ppAh, false);
      return;
    }
    //if (!this._perspective.threadInputs.has(ppAh)) {
    this.signalTyping(ppAh, true);
    //}
    this._perspective.threadInputs.set(ppAh, value);
  }


  /** */
  async publishCommentThread(subject: Subject/*, subject_name: string*/): Promise<ActionId> {
    const pp: ParticipationProtocol = {
      purpose: "comment",
      subject,
      moderation: defaultModeration(),
      limitations: defaultLimitations(),
    };
    console.debug("ThreadsDvm.publishCommentThread() appletId", subject.appletId);
    const [_creation_ts, ppAh] = await this.threadsZvm.publishParticipationProtocol(pp);
    return ppAh;
  }


  /** */
  async publishEmoji(beadAh: ActionId, emoji: string): Promise<void> {
    const has = this.threadsZvm.perspective.hasEmojiReaction(beadAh, this.cell.address.agentId, emoji);
    if (has) {
      return;
    }
    await this.threadsZvm.zomeProxy.publishReaction({bead_ah: beadAh.hash, emoji});
  }


  /** */
  async unpublishEmoji(beadAh: ActionId, emoji: string): Promise<void> {
    const has = this.threadsZvm.perspective.hasEmojiReaction(beadAh, this.cell.address.agentId, emoji);
    if (!has) {
      return;
    }
    await this.threadsZvm.zomeProxy.unpublishReaction({bead_ah: beadAh.hash, emoji});
  }


  /** -- Import & Export -- */

  /** Probe all threads before exporting */
  async exportAllPerspective(): Promise<string> {
    await this.threadsZvm.probeAllInnerAsync(GetStrategy.Local);
    /* Probe all threads */
    let probes = []
    for (const [ppAh, _thread] of this.threadsZvm.perspective.threads) {
      probes.push(this.threadsZvm.pullAllBeads(ppAh, GetStrategy.Local));
    }
    await Promise.all(probes);
    /* Done */
    return this.exportPerspective();
  }


  /** Dump perspective as JSON */
  exportPerspective(selectedChannels?: Set<string>): string {
    console.debug("Dvm.exportPerspective()")
    const dvmExport: any = {};

    const tJson = this.threadsZvm.export(this.authorshipZvm, selectedChannels);
    dvmExport[ThreadsZvm.DEFAULT_ZOME_NAME] = JSON.parse(tJson);

    const pJson = this.profilesZvm.export(/*this.authorshipZvm*/);
    dvmExport[ProfilesZvm.DEFAULT_ZOME_NAME] = JSON.parse(pJson);

    // TODO: Figure out how to partially export authorship based on selectedChannels
    const oJson = this.authorshipZvm.export();

    dvmExport[AuthorshipZvm.DEFAULT_ZOME_NAME] = JSON.parse(oJson);

    return JSON.stringify(dvmExport, null, 2);
  }


  /** */
  async importDiscord(data: DiscordImportData) {
      console.debug("ThreadsDvm.importDiscord()", data);
      const totalItemsCount =
        data.messages.length
        + data.channels.length
        + data.authors.length
        + data.reactions.length;

      /** Process authors */
      for (const author of data.authors) {
        console.debug("ThreadsDvm.importDiscord() createProfile", author.agentId.b64, author.profile);
        if (author.profile) {
          await this.profilesZvm.createProfile(author.profile, author.agentId);
        }
      }
      this._perspective.importingPct = data.authors.length / totalItemsCount;

      /** Process channels (and categories) */
      let channelMap = new Map<string, ActionId>();
      for (const channel of data.channels) {
        let ppAh: ActionId;
        if (!channel.category) {
          ppAh = await this.threadsZvm.createDmThread(channel.dmId!);
          channelMap.set(channel.id, ppAh);
        } else {
          let topicHash = MAIN_TOPIC_ID;
          if (channel.category !== MAIN_SEMANTIC_TOPIC) {
            topicHash = await this.threadsZvm.publishSemanticTopic(channel.category);
            await delay(100); // wait for signals to process // TODO: find a better way
          }
          const [_ppTs, topPpAh] = await this.threadsZvm.publishThreadFromSemanticTopic(
            THIS_APPLET_ID,
            topicHash,
            channel.name,
            defaultLimitations(),
            defaultModeration(),
          );
          ppAh = topPpAh;
        }
        channelMap.set(channel.id, ppAh);
        // Set the threads creation date
        await this.authorshipZvm.ascribeTarget(ThreadsEntryType.ParticipationProtocol, ppAh, channel.timestamp, this.cell.address.agentId, false);
      }
      await delay(100); // wait for signals to process // TODO: find a better way
      this._perspective.importingPct += data.channels.length / totalItemsCount;

      /** Process messages */
      const messageMap = new Map<string, ActionId>();
      let prevBeadAh: ActionId | undefined = undefined;
      for (const message of data.messages) {
        const ppAh = channelMap.get(message.channelId);
        if (!ppAh) {
          throw new Error("ThreadsDvm.importDiscord() Could not find channel: " + message.channelId);
        }
        if (message.prevId) {
          prevBeadAh = channelMap.get(message.prevId) ?? prevBeadAh;
        }

        const timestamp = message.timestamp;
        const agentId = message.agentId;

        const nextBead = await this.threadsZvm.createNextBead(ppAh, prevBeadAh);
        console.debug("ThreadsDvm.importDiscord() Publishing message", /*message.content,*/ prettyTimestamp(timestamp), agentId.b64);
        const [beadAh, _anchor, _bead] = await this.threadsZvm.publishTypedBeadAt(ThreadsEntryType.TextBead, message.content, nextBead, timestamp, agentId);
        prevBeadAh = beadAh;
        messageMap.set(message.id, beadAh);
        await this.authorshipZvm.ascribeTarget(ThreadsEntryType.TextBead, beadAh, timestamp, agentId, false);
        this._perspective.importingPct += 1 / totalItemsCount;
      }

      /** Process reactions */
      for (const reaction of data.reactions) {
        const beadAh = messageMap.get(reaction.messageId);
        if (!beadAh) {
          throw new Error("ThreadsDvm.importDiscord() Could not find message: " + reaction.messageId);
        }
        await catchThrottled(this.threadsZvm.zomeProxy.publishReaction({bead_ah: beadAh.hash, emoji: reaction.emoji, from: reaction.agentId.hash }));
        this._perspective.importingPct += 1 / totalItemsCount;
      }
      this._perspective.importingPct = 1.0;
  }


  /** */
  async importPerspective(confirmed: ImportConfirmed) {
    console.debug("Dvm.importPerspective() selection size:", confirmed.selection.size);
    this._perspective.importing = true;
    this._perspective.importingPct = -1.0;
    this.notifySubscribers();

    if (confirmed.data.discord) {
        console.log("Assuming Discord import");
        await this.importDiscord(confirmed.data.discord);
        this.importDone();
        return;
    }

    const external = confirmed.data.json;

    const originals = external[AuthorshipZvm.DEFAULT_ZOME_NAME];
    this.authorshipZvm.import(JSON.stringify(originals), confirmed.canPublish);
    //console.debug("import perspective", this.authorshipZvm.perspective);

    const profiles = external[ProfilesZvm.DEFAULT_ZOME_NAME];
    this.profilesZvm.import(JSON.stringify(profiles), confirmed.canPublish);

    const threadsPersp = external[ThreadsZvm.DEFAULT_ZOME_NAME];
    this.threadsZvm.import(JSON.stringify(threadsPersp), confirmed.canPublish, this.authorshipZvm);

    /** */
    this.notifySubscribers();
  }


  /** */
  importDone() {
    this._perspective.importing = false;
    this._perspective.importingPct = 1.0;
    this.notifySubscribers();
  }
}
