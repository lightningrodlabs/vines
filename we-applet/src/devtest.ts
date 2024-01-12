import {AttachableThreadContext} from "@threads/app";
import {ActionHash, fakeActionHash} from "@holochain/client";
import {createDefaultWeServicesMock, DevTestNames, AttachableViewInfo, setupDevtest} from "@ddd-qc/we-utils";
import {createThreadsApplet} from "./createThreadsApplet";
import {emptyEntryAppletView} from "@ddd-qc/we-utils/dist/mocks/renderInfoMock";
import {THREADS_DEFAULT_INTEGRITY_ZOME_NAME, THREADS_DEFAULT_ROLE_NAME, ThreadsEntryType} from "@threads/elements";
import {snake} from "@ddd-qc/cell-proxy";

export const devtestNames: DevTestNames = {
    installed_app_id: "ThreadsWeApplet",
    provisionedRoleName: THREADS_DEFAULT_ROLE_NAME,
}

export function setupThreadsBlockView() {
    // FIXME
}


/** */
export async function setupThreadsEntryView() {
    console.log("setupThreadsEntryView()");
    const context: AttachableThreadContext = {
        detail: "none",
        subjectName: "DevTest subject",
        subjectType: "unknown",
    }
    const appletView = createPpEntryRenderInfo(await fakeActionHash(), context);
    return setupDevtest(createThreadsApplet, devtestNames, createDefaultWeServicesMock, appletView);
}


/** */
function createPpEntryRenderInfo(ppAh: ActionHash, context: AttachableThreadContext): AttachableViewInfo {
    const attachableInfo = emptyEntryAppletView as AttachableViewInfo;
    attachableInfo.roleName = THREADS_DEFAULT_ROLE_NAME;
    attachableInfo.integrityZomeName = THREADS_DEFAULT_INTEGRITY_ZOME_NAME;
    attachableInfo.entryType = snake(ThreadsEntryType.ParticipationProtocol);
    attachableInfo.hrl[1] = ppAh;
    attachableInfo.context = context;

    return attachableInfo;
}
