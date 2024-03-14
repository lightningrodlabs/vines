import {encodeHashToBase64, ZomeName, RoleName, AppAgentClient} from "@holochain/client";
import {
    materializeAnyBead,
    ThreadsEntryType,
    ThreadsProxy, truncate, weaveUrlToWal
} from "@threads/elements";
import {asCellProxy} from "@ddd-qc/we-utils";
import {pascal} from "@ddd-qc/cell-proxy";
import {devtestNames} from "../devtest";
import {AttachableInfo, HrlWithContext} from "@lightningrodlabs/we-applet";
import {wrapPathInSvg} from "@ddd-qc/we-utils";
import {mdiComment, mdiCommentBookmark, mdiCommentText, mdiCommentTextMultiple} from "@mdi/js";
import {FILES_DEFAULT_COORDINATOR_ZOME_NAME, FILES_DEFAULT_ROLE_NAME, FilesProxy} from "@ddd-qc/files";

/** */
export async function getAttachableInfo(
  appletClient: AppAgentClient,
  roleName: RoleName,
  integrityZomeName: ZomeName,
  entryType: string,
  hrlc: HrlWithContext,
): Promise<AttachableInfo> {
    if (roleName != devtestNames.provisionedRoleName) {
        throw new Error(`Threads/we-applet: Unknown role name '${roleName}'.`);
    }
    if (integrityZomeName != "threads_integrity") {
        throw new Error(`Threads/we-applet: Unknown zome '${integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();

    const cellProxy = await asCellProxy(
      appletClient,
      undefined, //hrl[0],
      mainAppInfo.installed_app_id, //"ThreadsWeApplet",
      devtestNames.provisionedRoleName,
    );
    const threadsProxy: ThreadsProxy = new ThreadsProxy(cellProxy);

    const pEntryType = pascal(entryType);

    switch (pEntryType) {
        case ThreadsEntryType.TextBead:
            console.log("Threads/we-applet: TextBead", hrlc);
            const tuple = await threadsProxy.getTextBead(hrlc.hrl[1]);
            return {
                icon_src: wrapPathInSvg(mdiCommentText),
                name: tuple[2].value,
            };
        break;
        case ThreadsEntryType.AnyBead:
            console.log("Threads/we-applet: AnyBead", hrlc);
            const anyTuple = await threadsProxy.getAnyBead(hrlc.hrl[1]);
            const hrlBead = materializeAnyBead(anyTuple[2]);
            const wal = weaveUrlToWal(hrlBead.value);
            const hash = encodeHashToBase64(wal.hrl[1])
            const h = truncate(hash, 10, false);
            //const attLocInfo = weServices.getAttachableInfo(wal);
            return {
                icon_src: wrapPathInSvg(mdiCommentBookmark),
                name: `WAL: ${h}`
            };
        break;
        case ThreadsEntryType.EntryBead:
            console.log("Threads/we-applet: EntryBead", hrlc);
            const fProxy = await asCellProxy(appletClient, undefined, mainAppInfo.installed_app_id, FILES_DEFAULT_ROLE_NAME);
            const filesProxy: FilesProxy = new FilesProxy(fProxy);
            console.log("Threads/we-applet: EntryBead filesProxy", filesProxy);
            const fileTuple = await threadsProxy.getEntryBead(hrlc.hrl[1]);
            const manifest = await filesProxy.getFileInfo(fileTuple[2].sourceEh)
            //const fileBead = materializeEntryBead(fileTuple[2]);
            //const source = truncate(fileBead.sourceEh, 10, false);
            return {
                icon_src: wrapPathInSvg(mdiComment),
                name: `File: ${manifest.description.name}`
            };
            break;
        case ThreadsEntryType.ParticipationProtocol:
            console.log("Threads/we-applet: pp info", hrlc);
            console.log("Threads/we-applet: getPp()", encodeHashToBase64(hrlc.hrl[1]), threadsProxy);
            const pp = await threadsProxy.getPp(hrlc.hrl[1]);
            console.log("Threads/we-applet: pp", pp);
            return {
                icon_src: wrapPathInSvg(mdiCommentTextMultiple),
                name: pp[0].purpose,
            };
        break;
        // case "path": {
        //     const cellProxy = await asCellProxy(appletClient, hrl, "ThreadsWeApplet", "role_threads");
        //     const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
        //     const tuple = await proxy.getSubjectsByType(hrl[1]);
        //     return {
        //       icon_src: "",
        //       name: tuple[2].value,
        //     };
        // }
        default:
            throw new Error(`Files/we-applet: Unknown entry type ${entryType}.`);
    }
}




