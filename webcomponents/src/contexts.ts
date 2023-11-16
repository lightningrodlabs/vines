import {createContext} from "@lit/context";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";

export const globalProfilesContext = createContext<ProfilesZvm>('global/profiles');
