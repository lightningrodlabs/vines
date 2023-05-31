
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
import {AppInfo, AppInfoRequest, AppInfoResponse, CellType, fakeAgentPubKey, fakeDnaHash} from "@holochain/client";
import {AgentPubKey, InstalledAppId, RoleName} from "@holochain/client/lib/types";
import {CellInfo, InstalledAppInfoStatus} from "@holochain/client/lib/api/admin/types";
import {HOLOCHAIN_EPOCH} from "@threads/elements/dist/viewModels/threads.perspective";



/** */
async function generateFakeProfilesAppInfo(myKey: AgentPubKey): Promise<AppInfo> {
  const fakeProfilesDnaCellInfo: CellInfo = {
    provisioned: {
      name: "profiles",
      cell_id: [await fakeDnaHash(), myKey],
      dna_modifiers: {
        network_seed: "profiles-mock-ns",
        properties: {},
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
