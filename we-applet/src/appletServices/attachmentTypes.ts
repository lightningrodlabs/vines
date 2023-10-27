import {ActionHash, AppAgentClient, decodeHashFromBase64, encodeHashToBase64} from "@holochain/client";
import {
  AppletHash,
  AttachmentName,
  AttachmentType,
  Hrl
} from "@lightningrodlabs/we-applet";
import {asCellProxy, wrapPathInSvg} from "@ddd-qc/we-utils";
import {ThreadsProxy, CreatePpInput} from "@threads/elements";
import {HrlWithContext, WeServices} from "@lightningrodlabs/we-applet";
import { mdiCommentTextMultiple } from "@mdi/js";
import {ViewThreadContext} from "../setup";


/** */
//export async function attachmentTypes(appletClient: AppAgentClient): Promise<Record<string, AttachmentType>> {
export const attachmentTypes = async function (appletClient: AppAgentClient, appletHash: AppletHash, weServices: WeServices): Promise<Record<AttachmentName, AttachmentType>> {
  const appInfo = await appletClient.appInfo();
  return {
    thread: {
      label: "Thread",
      icon_src: wrapPathInSvg(mdiCommentTextMultiple),
      /** */
      async create(attachToHrl: Hrl) {
        console.log("Threads/attachmentTypes/thread: CREATE", attachToHrl);
        const entryLocInfo = await weServices.entryInfo(attachToHrl);
        const subjectName = entryLocInfo.entryInfo.name;
        //const subjectName = "FIXME";

        const cellProxy = await asCellProxy(appletClient, undefined, appInfo.installed_app_id, "role_threads"); // FIXME use appInfo.appId and roleName
        const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
        const input: CreatePpInput = {
          pp: {
          purpose: "comment",
          rules: "FFA", //FIXME: 'We' should provide a way for a user to provide extra info
          subjectHash: attachToHrl[1],
          subjectType: "unknown type", //FIXME: 'We' should provide entryInfo.type
        },
          //appletHash,
          appletId: encodeHashToBase64(appletHash),
          dnaHash: attachToHrl[0],
        };

        let ppAh: ActionHash = undefined;
        let context: ViewThreadContext;

        /** Check if PP already exists */
        console.log("Threads/attachmentTypes/thread: calling getPpsFromSubjectHash():", encodeHashToBase64(attachToHrl[1]));
        const maybeThreads = await proxy.getPpsFromSubjectHash(attachToHrl[1]);
        console.log("Threads/attachmentTypes/thread: maybeThreads", maybeThreads);
        for (const ppPair of maybeThreads) {
          const res = await proxy.getPp(ppPair[0]);
          console.log("Threads/attachmentTypes/thread: res", res);
          const pp = res[0];
          if (pp.purpose == "comment") {
            ppAh = ppPair[0];
            context = {detail: "existing", subjectType: 'unknown', subjectName};
            break;
          }
        }

        /** Create PP */
        if (!ppAh) {
          console.log("Threads/attachmentTypes/thread: calling createParticipationProtocol()", input);
          const res = await proxy.createParticipationProtocol(input);
          console.log("Threads/attachmentTypes/thread: res", res);
          ppAh = res[0];
          console.log("Threads/attachmentTypes/thread: ppAh", encodeHashToBase64(ppAh));
          context = {detail: "create", subjectType: 'unknown', subjectName};
        }

        /** Done */
        console.log("Threads/attachmentTypes/thread: DONE", context);
        return {
          hrl: [decodeHashFromBase64(cellProxy.cell.dnaHash), ppAh],
          context,
        } as HrlWithContext;
      }
    }
  };
}
