import {AppAgentClient, decodeHashFromBase64, EntryHash} from "@holochain/client";
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
        const entryInfo = await weServices.entryInfo(attachToHrl);
        const cellProxy = await asCellProxy(appletClient, attachToHrl, appInfo.installed_app_id /*"threads-applet"*/, "role_threads"); // FIXME use appInfo.appId and roleName
        const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
        const input: CreatePpInput = {
          pp: {
          purpose: "comment",
          rules: "FFA",
          subjectHash: attachToHrl[1],
          subjectType: "unknown", //FIXME: entryInfo.type
        },
          appletId,
        };
        const ppPair = await proxy.createParticipationProtocol(input);
        return {
          hrl: [decodeHashFromBase64(cellProxy.cell.dnaHash), ppPair[0]],
          context: {},
        };
      }
    }
  };
}
