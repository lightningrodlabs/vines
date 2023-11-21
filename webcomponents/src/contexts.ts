import {createContext} from "@lit/context";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {FilesDvm} from "@ddd-qc/files";

export const globalProfilesContext = createContext<ProfilesZvm>('global/profiles');

export const globaFilesContext = createContext<FilesDvm>('global/files');
