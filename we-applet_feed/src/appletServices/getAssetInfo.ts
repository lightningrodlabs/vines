import {AppClient} from "@holochain/client";
import {
    materializeAnyBead,
    ThreadsEntryType,
    ThreadsProxy, weaveUrlToWal
} from "@vines/elements";
import {asCellProxy} from "@ddd-qc/we-utils";
import {ActionId, pascal} from "@ddd-qc/cell-proxy";
import {devtestNames} from "../devtest";
import {AssetInfo, WAL} from "@lightningrodlabs/we-applet";
import {wrapPathInSvg} from "@ddd-qc/we-utils";
import {mdiComment, mdiCommentBookmark, mdiCommentText} from "@mdi/js";
import {FILES_DEFAULT_ROLE_NAME, FilesProxy} from "@ddd-qc/files";
import {RecordInfo} from "@lightningrodlabs/we-applet/dist/types";

/** */
export async function getAssetInfo(
  appletClient: AppClient,
  wal: WAL,
  recordInfo?: RecordInfo,
): Promise<AssetInfo> {
    if (!recordInfo) {
        throw new Error(`Feed/we-applet/getAssetInfo(): Missing recordInfo`);
    }
    if (recordInfo.roleName != devtestNames.provisionedRoleName) {
        throw new Error(`Feed/we-applet: Unknown role name '${recordInfo.roleName}'.`);
    }
    if (recordInfo.integrityZomeName != "threads_integrity") {
        throw new Error(`Feed/we-applet: Unknown zome '${recordInfo.integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();

    const cellProxy = await asCellProxy(
      appletClient,
      undefined,
      mainAppInfo.installed_app_id,
      devtestNames.provisionedRoleName,
    );
    const threadsProxy: ThreadsProxy = new ThreadsProxy(cellProxy);

    const pEntryType = pascal(recordInfo.entryType);
    const [_dnaId, dhtId] = hrl2Id(wal.hrl);
    const actionId = new ActionId(dhtId);

    switch (pEntryType) {
        case ThreadsEntryType.TextBead:
            console.log("Feed/we-applet: TextBead", wal);
            const tuple = await threadsProxy.fetchTextBead(actionId);
            return {
                icon_src: wrapPathInSvg(mdiCommentText),
                name: tuple[2].value,
            };
        break;
        case ThreadsEntryType.AnyBead:
            console.log("Feed/we-applet: AnyBead", wal);
            const anyTuple = await threadsProxy.fetchAnyBead(actionId);
            const hrlBead = materializeAnyBead(anyTuple[2]);
            const wall = weaveUrlToWal(hrlBead.value);
            const beadAh = new ActionId(wall.hrl[1])
            //const attLocInfo = weServices.getAttachableInfo(wall);
            return {
                icon_src: wrapPathInSvg(mdiCommentBookmark),
                name: `WAL: ${beadAh.short}`
            };
        break;
        case ThreadsEntryType.EntryBead:
            console.log("Feed/we-applet: EntryBead", wal);
            const fProxy = await asCellProxy(appletClient, undefined, mainAppInfo.installed_app_id, FILES_DEFAULT_ROLE_NAME);
            const filesProxy: FilesProxy = new FilesProxy(fProxy);
            console.log("Feed/we-applet: EntryBead filesProxy", filesProxy);
            const fileTuple = await threadsProxy.fetchEntryBead(actionId);
            const manifest = await filesProxy.getFileInfo(fileTuple[2].sourceEh)
            //const fileBead = materializeEntryBead(fileTuple[2]);
            //const source = truncate(fileBead.sourceEh, 10, false);
            return {
                icon_src: wrapPathInSvg(mdiComment),
                name: `File: ${manifest.description.name}`
            };
            break;
        default:
            throw new Error(`Feed/we-applet: Unknown entry type ${recordInfo.entryType}.`);
    }
}




