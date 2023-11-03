import {createContext} from "@lit-labs/context";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";

export const globalProfilesContext = createContext<ProfilesZvm>('global/profiles');
