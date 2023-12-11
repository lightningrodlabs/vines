import {createContext} from "@lit/context";
import {FilesDvm} from "@ddd-qc/files";
import {WeServices} from "@lightningrodlabs/we-applet";

export const weClientContext = createContext<WeServices>('we_client');


export const globaFilesContext = createContext<FilesDvm>('global/files');
