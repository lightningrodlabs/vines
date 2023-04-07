import {DnaViewModel} from "@ddd-qc/lit-happ";
import {ThreadsZvm} from "./threads.zvm";
import {ProfilesZvm} from "./profiles.zvm";


/**
 * ViewModel fo the Threads DNA
 * Holds two zomes:
 *  - Threads
 *  - Profiles
 */
export class ThreadsDvm extends DnaViewModel {

  static readonly DEFAULT_BASE_ROLE_NAME = "rThreads";
  static readonly ZVM_DEFS = [ThreadsZvm, ProfilesZvm]
  readonly signalHandler = undefined;

  /** QoL Helpers */
  get profilesZvm(): ProfilesZvm { return this.getZomeViewModel(ProfilesZvm.DEFAULT_ZOME_NAME) as ProfilesZvm}
  get threadsZvm(): ThreadsZvm { return this.getZomeViewModel(ThreadsZvm.DEFAULT_ZOME_NAME) as ThreadsZvm}


  /** -- Perspective -- */

  protected hasChanged(): boolean {return true}
  get perspective(): unknown {return}

  /** -- Methods -- */
}
