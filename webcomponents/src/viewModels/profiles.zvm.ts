import {ZomeViewModel} from "@ddd-qc/lit-happ";
import {ProfilesProxy, ThreadsProfile} from "./profiles.proxy";
import {AgentPubKeyB64, decodeHashFromBase64, encodeHashToBase64, EntryHashB64} from "@holochain/client";


/** */
export interface ProfilesPerspective {
  /* AgentPubKeyB64 -> Profile */
  profiles: Record<AgentPubKeyB64, ThreadsProfile>,
  ///* AgentPubKeyB64 -> Profile hash */
  //profile_ahs: Record<AgentPubKeyB64, ActionHashB64>,
}


/**
 *
 */
export class ProfilesZvm extends ZomeViewModel {

  static readonly ZOME_PROXY = ProfilesProxy;
  get zomeProxy(): ProfilesProxy {return this._zomeProxy as ProfilesProxy;}


  /* */
  protected hasChanged(): boolean {
    // TODO
    return true;
  }


  /** */
  async initializePerspectiveOnline(): Promise<void> {
    await this.probeAllProfiles();
  }

  /** */
  probeAllInner() {
    this.probeAllProfiles();
  }

  /** -- Perspective -- */

  /* */
  get perspective(): ProfilesPerspective {
    return {
      profiles: this._profiles,
      //profile_ahs: this._profile_ahs,
    };
  }

  private _profiles: Record<AgentPubKeyB64, ThreadsProfile> = {};
  //private _profile_ahs: Record<AgentPubKeyB64, ActionHashB64> = {};


  getMyProfile(): ThreadsProfile | undefined { return this._profiles[this.cell.agentPubKey] }

  getProfile(agent: AgentPubKeyB64): ThreadsProfile | undefined {return this._profiles[agent]}

  //getProfileHash(agent: AgentPubKeyB64): ActionHashB64 | undefined {return this._profile_ahs[agent]}

  getAgents(): AgentPubKeyB64[] { return Object.keys(this._profiles)}


  /** -- Methods -- */

  /** */
  async probeAllProfiles(): Promise<void> {
    const allAgents = await this.zomeProxy.getAgentsWithProfile();
    for (const agentPubKey of allAgents) {
      const maybeProfile = await this.zomeProxy.getAgentProfile(agentPubKey);
      if (!maybeProfile) {
        continue;
      }
      //const maybeProfile: ThreadsProfile = decode((record.entry as any).Present.entry) as ThreadsProfile;
      const pubKeyB64 = encodeHashToBase64(agentPubKey);
      this._profiles[pubKeyB64] = maybeProfile;
      //this._profile_ahs[pubKeyB64] = encodeHashToBase64(record.signed_action.hashed.hash);
    }
    this.notifySubscribers();
  }


  /** */
  async probeProfile(pubKeyB64: AgentPubKeyB64): Promise<ThreadsProfile | undefined> {
    const maybeProfile = await this.zomeProxy.getAgentProfile(decodeHashFromBase64(pubKeyB64));
    console.log("probeProfile()", maybeProfile);
    if (!maybeProfile) {
      return;
    }
    //const maybeProfile: ThreadsProfile = decode((record.entry as any).Present.entry) as ThreadsProfile;
    this._profiles[pubKeyB64] = maybeProfile;
    //this._profile_ahs[pubKeyB64] = encodeHashToBase64(record.signed_action.hashed.hash);
    this.notifySubscribers();
    return maybeProfile;
  }


  /** */
  async createMyProfile(profile: ThreadsProfile): Promise<void> {
    /*const record =*/ await this.zomeProxy.createProfile(profile);
    this._profiles[this.cell.agentPubKey] = profile;
    //this._profile_ahs[this.cell.agentPubKey] = encodeHashToBase64(record.signed_action.hashed.hash);
    this.notifySubscribers();
  }

  /** */
  async updateMyProfile(profile: ThreadsProfile): Promise<void> {
    /*const record =*/ await this.zomeProxy.updateProfile(profile);
    this._profiles[this.cell.agentPubKey] = profile;
    //this._profile_ahs[this.cell.agentPubKey] = encodeHashToBase64(record.signed_action.hashed.hash);
    this.notifySubscribers();
  }

}
