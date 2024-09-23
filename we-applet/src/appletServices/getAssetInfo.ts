import {AppClient} from "@holochain/client";
import {
    hrl2Id,
    materializeAnyBead,
    ThreadsEntryType,
    ThreadsProxy, weaveUrlToWal
} from "@vines/elements";
import {asCellProxy} from "@ddd-qc/we-utils";
import {ActionId, pascal} from "@ddd-qc/cell-proxy";
import {devtestNames} from "../devtest";
import {AssetInfo, WAL} from "@theweave/api";
import {wrapPathInSvg} from "@ddd-qc/we-utils";
import {mdiComment, mdiCommentBookmark, mdiCommentText, mdiCommentTextMultiple} from "@mdi/js";
import {FILES_DEFAULT_ROLE_NAME, FilesProxy} from "@ddd-qc/files";
import {RecordInfo} from "@theweave/api/dist/types";



/** */
export async function getAssetInfo(
  appletClient: AppClient,
  wal: WAL,
  recordInfo?: RecordInfo,
): Promise<AssetInfo> {
    if (!recordInfo) {
        throw new Error(`Vines/we-applet/getAssetInfo(): Missing recordInfo`);
    }
    if (recordInfo.roleName != devtestNames.provisionedRoleName) {
        throw new Error(`Vines/we-applet: Unknown role name '${recordInfo.roleName}'.`);
    }
    if (recordInfo.integrityZomeName != "threads_integrity") {
        throw new Error(`Vines/we-applet: Unknown zome '${recordInfo.integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();
    if (!mainAppInfo) {
        throw Promise.reject("Missing Main AppInfo");
    }

    const cellProxy = await asCellProxy(
      appletClient,
      undefined,
      mainAppInfo.installed_app_id,
      devtestNames.provisionedRoleName,
    );
    const threadsProxy: ThreadsProxy = new ThreadsProxy(cellProxy);

    const pEntryType = pascal(recordInfo.entryType);
    const [_dnaId, dhtId] = hrl2Id(wal.hrl);
    const actionId = new ActionId(dhtId.b64);

    switch (pEntryType) {
        case ThreadsEntryType.TextBead:
            console.log("Vines/we-applet: TextBead", wal);
            const tuple = (await threadsProxy.fetchTextBead(actionId.hash))!; // FIXME: handle null
            return {
                icon_src: wrapPathInSvg(mdiCommentText),
                name: tuple[2].value,
            };
        break;
        case ThreadsEntryType.AnyBead:
            console.log("Vines/we-applet: AnyBead", wal);
            const anyTuple = (await threadsProxy.fetchAnyBead(actionId.hash))!; // FIXME: handle null
            const hrlBead = materializeAnyBead(anyTuple[2]);
            const beadWal = weaveUrlToWal(hrlBead.value);
            const beadAh = new ActionId(beadWal.hrl[1]);
            //const h = truncate(hash, 10, false);
            //const attLocInfo = weServices.getAttachableInfo(wall);
            return {
                icon_src: wrapPathInSvg(mdiCommentBookmark),
                name: `WAL: ${beadAh.short}`
            };
        break;
        case ThreadsEntryType.EntryBead:
            console.log("Vines/we-applet: EntryBead", wal);
            const fProxy = await asCellProxy(appletClient, undefined, mainAppInfo.installed_app_id, FILES_DEFAULT_ROLE_NAME);
            const filesProxy: FilesProxy = new FilesProxy(fProxy);
            console.log("Vines/we-applet: EntryBead filesProxy", filesProxy);
            const fileTuple = (await threadsProxy.fetchEntryBead(actionId.hash))!; // FIXME: handle null
            const manifest = await filesProxy.getFileInfo(fileTuple[2].sourceEh)
            //const fileBead = materializeEntryBead(fileTuple[2]);
            //const source = truncate(fileBead.sourceEh, 10, false);
            return {
                icon_src: wrapPathInSvg(mdiComment),
                name: `File: ${manifest.description.name}`
            };
            break;
        case ThreadsEntryType.ParticipationProtocol:
            console.log("Vines/we-applet: pp info", wal);
            console.log("Vines/we-applet: getPp()", wal.hrl[1], threadsProxy);
            const pp = (await threadsProxy.fetchPp(actionId.hash))!; // FIXME: handle null
            console.log("Vines/we-applet: pp", pp);
            return {
                icon_src: wrapPathInSvg(mdiCommentTextMultiple),
                name: pp[0].purpose,
            };
        break;
        // case "path": {
        //     const cellProxy = await asCellProxy(appletClient, hrl, "VinesApplet", "rVines");
        //     const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
        //     const tuple = await proxy.getSubjectsByType(hrl[1]);
        //     return {
        //       icon_src: "",
        //       name: tuple[2].value,
        //     };
        // }
        default:
            throw new Error(`Vines/we-applet: Unknown entry type ${recordInfo.entryType}.`);
    }
}




