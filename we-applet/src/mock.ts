
// export const weServicesMock: WeServices = {
//   openViews: OpenViews;
//   attachmentTypes: ReadonlyMap<EntryHash, Record<string, AttachmentType>>; // Segmented by groupId
//
//   groupProfile(groupId: DnaHash): Promise<GroupProfile | undefined>;
//   appletInfo(appletId: EntryHash): Promise<AppletInfo | undefined>;
//   entryInfo(hrl: Hrl): Promise<EntryLocationAndInfo | undefined>;
//   search(filter: string): Promise<Array<HrlWithContext>>;
// };
//
//
// export const weServicesMock: WeServices = {
//   appletInfo: async () => undefined,
//   attachmentTypes: new HoloHashMap<EntryHash, Record<string, AttachmentType>>(),
//   entryInfo: async () => undefined,
//   groupProfile: async () =>
//   openViews: {
//     openAppletBlock: () => {},
//     openCrossAppletBlock: () => {},
//     openHrl: () => {},
//   },
//   search: async () => [],
// };



import {Cell, ConductorAppProxy} from "@ddd-qc/cell-proxy";
import {
  ActionHash,
  AppInfo,
  AppInfoRequest,
  AppInfoResponse,
  CellType,
  EntryHash,
  fakeAgentPubKey,
  fakeDnaHash
} from "@holochain/client";
import {AgentPubKey, InstalledAppId, RoleName} from "@holochain/client/lib/types";
import {CellInfo, InstalledAppInfoStatus} from "@holochain/client/lib/api/admin/types";
import {HOLOCHAIN_EPOCH} from "@threads/elements/dist/viewModels/threads.perspective";
import {AppletInfo, EntryLocationAndInfo, Hrl, WeNotification, WeServices} from "@lightningrodlabs/we-applet";
import {HrlWithContext} from "@lightningrodlabs/we-applet/dist/types";


export const weServicesMock: WeServices = {
  //attachmentTypes: new HoloHashMap<AppletHash, Record<AttachmentName, AttachmentType>>(),
  attachmentTypes: undefined,
  openAppletMain: (appletHash: EntryHash): Promise<void> => {throw new Error("openAppletMain() is not implemented on WeServicesMock.");},
  openAppletBlock: (appletHash, block: string, context: any): Promise<void> => {throw new Error("openAppletBlock() is not implemented on WeServicesMock.");},
  openCrossAppletMain: (appletBundleId: ActionHash): Promise<void> => {throw new Error("openCrossAppletMain() is not implemented on WeServicesMock.");},
  openCrossAppletBlock: (appletBundleId: ActionHash, block: string, context: any): Promise<void> => {throw new Error("openCrossAppletBlock() is not implemented on WeServicesMock.");},
  openHrl: (hrl: Hrl, context: any): Promise<void> => {throw new Error("openHrl() is not implemented on WeServicesMock.");},
  groupProfile: (groupId): Promise<any> => {throw new Error("groupProfile() is not implemented on WeServicesMock.");},
  appletInfo: (appletHash): Promise<AppletInfo | undefined> => {throw new Error("appletInfo() is not implemented on WeServicesMock.");},
  entryInfo: (hrl: Hrl): Promise<EntryLocationAndInfo | undefined> => {throw new Error("entryInfo() is not implemented on WeServicesMock.");},
  hrlToClipboard: (hrl: HrlWithContext): Promise<void> => {throw new Error("hrlToClipboard() is not implemented on WeServicesMock.");},
  search: (searchFilter: string): Promise<any> => {throw new Error("search() is not implemented on WeServicesMock.");},
  userSelectHrl: (): Promise<HrlWithContext | undefined> => {throw new Error("userSelectHrl() is not implemented on WeServicesMock.");},
  notifyWe: (notifications: Array<WeNotification>): Promise<any> => {throw new Error("notifyWe() is not implemented on WeServicesMock.");}
};


/** */
async function generateFakeProfilesAppInfo(myKey: AgentPubKey): Promise<AppInfo> {
  const fakeProfilesDnaCellInfo: CellInfo = {
    provisioned: {
      name: "profiles",
      cell_id: [await fakeDnaHash(), myKey],
      dna_modifiers: {
        network_seed: "profiles-mock-ns",
        properties: new Uint8Array(),
        origin_time: HOLOCHAIN_EPOCH,
        quantum_time: {secs: 1, nanos: 0},
      }
    }
  }
  /** AppInfo */
  return {
    agent_pub_key: myKey,
    installed_app_id: "profiles",
    cell_info: {
      profiles: [fakeProfilesDnaCellInfo],
    },
    status: {
      running: null,
    }
  };
}


export class ConductorProxyProfilesMock extends ConductorAppProxy {
  constructor(public readonly myKey: AgentPubKey) {
    super(10 * 1000);
  }


  /** */
  async appInfo(_args: AppInfoRequest): Promise<AppInfoResponse> {
    return generateFakeProfilesAppInfo(await fakeAgentPubKey());
  }

}
