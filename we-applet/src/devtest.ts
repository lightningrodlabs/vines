import {ViewThreadContext} from "@threads/app";
import {ActionHash, fakeActionHash} from "@holochain/client";
import {createDefaultWeServicesMock, DevTestNames, EntryViewInfo, setupDevtest} from "@ddd-qc/we-utils";
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
    const context: ViewThreadContext = {
        detail: "none",
        subjectName: "DevTest subject",
        subjectType: "unknown",
    }
    const appletView = createPpEntryRenderInfo(await fakeActionHash(), context);
    return setupDevtest(createThreadsApplet, devtestNames, createDefaultWeServicesMock, appletView);
}


/** */
function createPpEntryRenderInfo(ppAh: ActionHash, context: ViewThreadContext): EntryViewInfo {
    const entryInfo = emptyEntryAppletView as EntryViewInfo;
    entryInfo.roleName = THREADS_DEFAULT_ROLE_NAME;
    entryInfo.integrityZomeName = THREADS_DEFAULT_INTEGRITY_ZOME_NAME;
    entryInfo.entryType = snake(ThreadsEntryType.ParticipationProtocol);
    entryInfo.hrl[1] = ppAh;
    entryInfo.context = context;

    return entryInfo;
}
