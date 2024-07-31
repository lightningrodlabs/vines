import {VinesAssetQuery} from "@vines/app";
import {createDefaultWeServicesMock, DevTestNames, AssetViewInfo, setupDevtest} from "@ddd-qc/we-utils";
import {createVinesApplet} from "./createVinesApplet";
import {emptyEntryAppletView} from "@ddd-qc/we-utils/dist/mocks/renderInfoMock";
import {THREADS_DEFAULT_INTEGRITY_ZOME_NAME, VINES_DEFAULT_ROLE_NAME, ThreadsEntryType} from "@vines/elements";
import {ActionId, snake} from "@ddd-qc/cell-proxy";
import {HoloHash} from "@holochain/client";

export const devtestNames: DevTestNames = {
    installed_app_id: "VinesApplet",
    provisionedRoleName: VINES_DEFAULT_ROLE_NAME,
}

export function setupVinessBlockView() {
    // FIXME
}


/** */
export async function setupVinesEntryView() {
    console.log("setupVinesEntryView()");
    const context: VinesAssetQuery = {
        detail: "none",
        subjectName: "DevTest subject",
        subjectType: "unknown",
    }
    const appletView = createPpEntryRenderInfo(ActionId.empty(), context);
    return setupDevtest(createVinesApplet, devtestNames, createDefaultWeServicesMock, appletView);
}


/** */
function createPpEntryRenderInfo(ppAh: ActionId, context: VinesAssetQuery): AssetViewInfo {
    const assetViewInfo = emptyEntryAppletView as AssetViewInfo;
    assetViewInfo.recordInfo = {
        roleName: VINES_DEFAULT_ROLE_NAME,
        integrityZomeName: THREADS_DEFAULT_INTEGRITY_ZOME_NAME,
        entryType: snake(ThreadsEntryType.ParticipationProtocol),
    };
    assetViewInfo.wal.hrl[1] = new HoloHash(ppAh.hash);
    assetViewInfo.wal.context = context;

    return assetViewInfo;
}
