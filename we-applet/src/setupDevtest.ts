import {
    AdminWebsocket, AppAgentWebsocket, encodeHashToBase64, fakeDnaHash, decodeHashFromBase64, fakeActionHash, EntryHash,
} from "@holochain/client";
import { fakeEntryHash } from '@holochain-open-dev/utils';
import { ProfilesClient } from '@holochain-open-dev/profiles';
import { ProfilesZomeMock } from "@holochain-open-dev/profiles/dist/mocks.js";
import { setBasePath, getBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import {AppletInfo, EntryLocationAndInfo} from "@lightningrodlabs/we-applet/dist/types";
import {HappElement} from "@ddd-qc/lit-happ";
import {CreateAppletFn, DevTestNames} from "./setup";
import {createDefaultWeServicesMock} from "./mocks/weServicesMock";


/** */
export async function setupDevtest(createApplet: CreateAppletFn, names: DevTestNames): Promise<HappElement> {
    console.log("setupDevtest()", process.env.BUILD_MODE, process.env.HC_APP_PORT, process.env.HC_ADMIN_PORT);

    setBasePath('../../node_modules/@shoelace-style/shoelace/dist');
    console.log("shoelace basePath", getBasePath());

    const localStorageId = names.installed_app_id + "-id";

    /** Store AppletId in LocalStorage, so we can retrieve it when refereshing webpage */
    let devtestAppletHash: EntryHash;
    let devtestAppletId = window.localStorage[localStorageId];
    if (!devtestAppletId) {
        devtestAppletHash = fakeEntryHash();
        devtestAppletId = encodeHashToBase64(devtestAppletHash);
        window.localStorage[localStorageId] = devtestAppletId;
    } else {
        devtestAppletHash = decodeHashFromBase64(devtestAppletId);
    }
    console.log("setupDevtest() devtestAppletId", devtestAppletId);

    /** Create custom WeServiceMock */
    const myWeServicesMock = createDefaultWeServicesMock(devtestAppletId);

    /** AppWebsocket */
    // const appWs = await AppWebsocket.connect(`ws://localhost:${process.env.HC_APP_PORT}`);
    // const appInfo = await appWs.appInfo({installed_app_id: names.installed_app_id});
    // console.log("setup() appInfo", appInfo);

    /** AppAgentWebsocket */
    const appAgentWs = await AppAgentWebsocket.connect(new URL(`ws://localhost:${process.env.HC_APP_PORT}`), names.installed_app_id);
    console.log(appAgentWs.appWebsocket);
    const appInfo = await appAgentWs.appInfo();
    console.log(appInfo);
    const cellInfo = appInfo.cell_info[names.provisionedRoleName][0];
    let cellId;
    if ("provisioned" in cellInfo) {
        cellId = cellInfo.provisioned.cell_id;
    } else {
        console.error("Cell found is not a 'provisioned");
    }
    //console.log("main agentId", cellId[1]);
    //console.log("main agentId", encodeHashToBase64(cellId[1]));

    /** AdminWebsocket */
    const adminWs = await AdminWebsocket.connect(new URL(`ws://localhost:${process.env.HC_ADMIN_PORT}`));
    const apps = await adminWs.listApps({});
    console.log("setupDevtest() apps", apps);
    await adminWs.authorizeSigningCredentials(cellId);

    /** Creating mock lobby app with profiles dna & zome */
    const mockProfilesZome = new ProfilesZomeMock();
    //console.log("mock agentId", mockProfilesZome.myPubKey);
    mockProfilesZome.myPubKey = cellId[1];
    //console.log("mock agentId", encodeHashToBase64(mockProfilesZome.myPubKey));
    mockProfilesZome.create_profile({nickname: "Alex", fields: {}})
    const mockAppInfo = await mockProfilesZome.appInfo();
    console.log("setupDevtest() mockAppInfo", mockAppInfo);
    const applet = await createApplet(
        appAgentWs,
        devtestAppletHash,
        new ProfilesClient((mockProfilesZome as any), /*mockProfilesZome.roleName*/ "lobby"),
        myWeServicesMock,
    );
    //renderers.main(document.body);
    console.log("setupDevtest() applet", applet);
    return applet;
}
