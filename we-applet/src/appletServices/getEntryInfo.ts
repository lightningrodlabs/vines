import {encodeHashToBase64} from "@holochain/client";
import {ThreadsEntryType, ThreadsProxy} from "@threads/elements";
import {asCellProxy} from "@ddd-qc/we-utils";
import {pascal} from "@ddd-qc/cell-proxy";
import {devtestNames} from "../devtest";


/** */
export async function getEntryInfo(
    appletClient,
    roleName,
    integrityZomeName,
    entryType,
    hrl
) {
    if (roleName != devtestNames.provisionedRoleName) {
        throw new Error(`Threads/we-applet: Unknown role name '${roleName}'.`);
    }
    if (integrityZomeName != "threads_integrity") {
        throw new Error(`Threads/we-applet: Unknown zome '${integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();

    const pEntryType = pascal(entryType);

    switch (pEntryType) {
        case ThreadsEntryType.TextMessage: {
            console.log("Threads/we-applet: text_message info", hrl);
            const cellProxy = await asCellProxy(
                appletClient,
                undefined, //hrl[0],
                mainAppInfo.installed_app_id, //"ThreadsWeApplet",
                devtestNames.provisionedRoleName,
            );
            const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
            const tuple = await proxy.getTextMessage(hrl[1]);
            return {
                icon_src: "",
                name: tuple[2].value,
            };
        }
        case ThreadsEntryType.ParticipationProtocol: {
            console.log("Threads/we-applet: pp info", hrl);
            const cellProxy = await asCellProxy(
                appletClient,
                undefined, // hrl[0],
                mainAppInfo.installed_app_id,
                devtestNames.provisionedRoleName);
            console.log("Threads/we-applet: cellProxy", cellProxy);
            const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
            console.log("Threads/we-applet: getPp()", encodeHashToBase64(hrl[1]), proxy);
            const pp = await proxy.getPp(hrl[1]);
            console.log("Threads/we-applet: pp", pp);
            return {
                icon_src: "",
                name: pp[0].purpose,
            };
        }
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




