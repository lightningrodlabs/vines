//import {VinesAssetQuery} from "@vines/app";
import {ActionHash, fakeActionHash} from "@holochain/client";
import {createDefaultWeServicesMock, DevTestNames, AssetViewInfo, setupDevtest} from "@ddd-qc/we-utils";
import {createFeedApplet} from "./createFeedApplet";
import {emptyEntryAppletView} from "@ddd-qc/we-utils/dist/mocks/renderInfoMock";
import {THREADS_DEFAULT_INTEGRITY_ZOME_NAME, VINES_DEFAULT_ROLE_NAME, ThreadsEntryType} from "@vines/elements";
import {snake} from "@ddd-qc/cell-proxy";

export const devtestNames: DevTestNames = {
    installed_app_id: "VinesApplet", //"FeedApplet",
    provisionedRoleName: VINES_DEFAULT_ROLE_NAME,
}


/** */
export async function setupFeedEntryView() {
    console.log("setupFeedEntryView()");
    const context/*: VinesAssetQuery*/ = {
        detail: "none",
        subjectName: "DevTest subject",
        subjectType: "unknown",
    }
    const appletView = createPpEntryRenderInfo(await fakeActionHash(), context);
    return setupDevtest(createFeedApplet, devtestNames, createDefaultWeServicesMock, appletView);
}


/** */
function createPpEntryRenderInfo(pp_ah: ActionHash, context/*: VinesAssetQuery*/): AssetViewInfo {
    const assetViewInfo = emptyEntryAppletView as AssetViewInfo;
    assetViewInfo.recordInfo = {
        roleName: VINES_DEFAULT_ROLE_NAME,
        integrityZomeName: THREADS_DEFAULT_INTEGRITY_ZOME_NAME,
        entryType: snake(ThreadsEntryType.ParticipationProtocol),
    };
    assetViewInfo.wal.hrl[1] = pp_ah;
    assetViewInfo.wal.context = context;

    return assetViewInfo;
}
