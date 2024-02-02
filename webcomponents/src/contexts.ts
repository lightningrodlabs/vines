import {createContext} from "@lit/context";
import {FilesDvm} from "@ddd-qc/files";
import {AppletInfo, WeServices, AttachableLocationAndInfo} from "@lightningrodlabs/we-applet";
import {Dictionary} from "@ddd-qc/cell-proxy";

export const weClientContext = createContext<WeServices>('we_client');
export const wePerspectiveContext = createContext<WePerspective>('we_perspective');
export const globaFilesContext = createContext<FilesDvm>('global/files');


/** */
export interface WePerspective {
  /** AppletHash -> AppletInfo */
  applets: Dictionary<AppletInfo>,
  /** sHrl -> AttachableLocationAndInfo */
  attachables: Dictionary<AttachableLocationAndInfo>,
}
