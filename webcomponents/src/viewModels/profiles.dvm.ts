import {delay, DnaViewModel} from "@ddd-qc/lit-happ";
import {ProfilesZvm} from "./profiles.zvm";
import {
  AppSignal, AppSignalCb,
} from "@holochain/client";

/** */
// export interface ProfilesDnaPerspective {
//   agentPresences: Record<string, number>,
// }


/**
 * ViewModel fo a DNA holding a Profiles zome
 */
export class ProfilesDvm extends DnaViewModel {

  static readonly DEFAULT_BASE_ROLE_NAME = "profiles";
  static readonly ZVM_DEFS = [ProfilesZvm]
  readonly signalHandler?: AppSignalCb = this.handleSignal;


  /** QoL Helpers */
  get profilesZvm(): ProfilesZvm {
    return this.getZomeViewModel(ProfilesZvm.DEFAULT_ZOME_NAME) as ProfilesZvm
  }

  /** -- Perspective -- */

  protected hasChanged(): boolean {
    return true
  }

  get perspective(): unknown {
    return {}
  }

  // get perspective(): ThreadsDnaPerspective {
  //   return {
  //     agentPresences: this._agentPresences,
  //   }
  // }

  ///** agentPubKey -> timestamp */
  //private _agentPresences: Record<string, number> = {};


  /** -- Signaling -- */

  /** */
  handleSignal(signal: AppSignal) {
    console.log("Received Signal", signal);
    if (signal.zome_name !== ProfilesZvm.DEFAULT_ZOME_NAME) {
      return;
    }
  }


}
