import {ActionHash, AppAgentClient, decodeHashFromBase64, EntryHash} from "@holochain/client";
import {AttachmentType, Hrl} from "@lightningrodlabs/we-applet";
import {asCellProxy} from "./we-utils";
import {ThreadsProxy} from "@threads/elements/dist/bindings/threads.proxy";
import {CreatePpInput} from "@threads/elements/dist/bindings/threads.types";
import {WeServices} from "@lightningrodlabs/we-applet/dist/types";


/** */
export async function attachmentTypes(appletClient: AppAgentClient, appletId: EntryHash, weServices: WeServices): Promise<Record<string, AttachmentType>> {
  const appInfo = await appletClient.appInfo();
  return {
    thread: {
      label: "Thread",
      icon_src: "",
      async create(attachToHrl: Hrl) {
        console.log("attachmentTypes.thread()", attachToHrl);
        //const entryInfo = await weServices.entryInfo(attachToHrl);
        const cellProxy = await asCellProxy(appletClient, attachToHrl, appInfo.installed_app_id /*"threads-applet"*/, "role_threads"); // FIXME use appInfo.appId and roleName
        const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
        const input: CreatePpInput = {
          pp: {
          purpose: "comment",
          rules: "FFA", //FIXME: We should provide a way for a user to provide extra info
          subjectHash: attachToHrl[1],
          subjectType: "unknown", //FIXME: We should provide entryInfo.type
        },
          appletId,
          dnaHash: attachToHrl[0],
        };

        let ppAh: ActionHash = undefined;
        let context: any;

        /** Check if PP already exists */
        const maybeThreads = await proxy.getPpsFromSubjectHash(attachToHrl[1]);
        for (const ppPair of maybeThreads) {
          const pp = await proxy.getPp(ppPair[0])[0];
          if (pp.purpose == "comment") {
            ppAh = ppPair[0];
            context = {detail: "existing"};
            break;
          }
        }

        /** Create PP */
        if (!ppAh) {
          ppAh = await proxy.createParticipationProtocol(input)[0];
          context: {detail: "create"};
        }

        /** Done */
        return {
          hrl: [decodeHashFromBase64(cellProxy.cell.dnaHash), ppAh],
          context,
        };
      }
    }
  };
}
