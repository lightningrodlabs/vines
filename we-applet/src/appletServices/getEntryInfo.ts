import {encodeHashToBase64} from "@holochain/client";
import {ThreadsProxy} from "@threads/elements";
import {threadsNames} from "./appletServices";
import {asCellProxy} from "@ddd-qc/we-utils";


/** */
export async function getEntryInfo(
    appletClient,
    roleName,
    integrityZomeName,
    entryType,
    hrl
) {
    if (roleName != threadsNames.provisionedRoleName) {
        throw new Error(`Threads/we-applet: Unknown role name '${roleName}'.`);
    }
    if (integrityZomeName != "threads_integrity") {
        throw new Error(`Threads/we-applet: Unknown zome '${integrityZomeName}'.`);
    }

    const mainAppInfo = await appletClient.appInfo();

    switch (entryType) {
        case "text_message": {
            console.log("Threads/we-applet: text_message info", hrl);
            const cellProxy = await asCellProxy(
                appletClient,
                undefined, //hrl[0],
                mainAppInfo.installed_app_id, //"ThreadsWeApplet",
                threadsNames.provisionedRoleName,
            );
            const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
            const tuple = await proxy.getTextMessage(hrl[1]);
            return {
                icon_src: "",
                name: tuple[2].value,
            };
        }
        case "participation_protocol": {
            console.log("Threads/we-applet: pp info", hrl);
            const cellProxy = await asCellProxy(
                appletClient,
                undefined, // hrl[0],
                mainAppInfo.installed_app_id,
                threadsNames.provisionedRoleName);
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




