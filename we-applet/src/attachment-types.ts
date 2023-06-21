import {ActionHash, AppAgentClient, decodeHashFromBase64, encodeHashToBase64, EntryHash} from "@holochain/client";
import {AttachmentType, Hrl} from "@lightningrodlabs/we-applet";
import {asCellProxy, wrapPathInSvg} from "./we-utils";
import {ThreadsProxy, CreatePpInput} from "@threads/elements";
import {HrlWithContext, WeServices} from "@lightningrodlabs/we-applet/dist/types";
import {ViewThreadContext} from "./applet-view";
import { mdiCommentTextMultiple } from "@mdi/js";


/** */
export async function attachmentTypes(appletClient: AppAgentClient, appletId: EntryHash, weServices: WeServices): Promise<Record<string, AttachmentType>> {
  const appInfo = await appletClient.appInfo();
  return {
    thread: {
      label: "Thread",
      icon_src: wrapPathInSvg(mdiCommentTextMultiple),
      async create(attachToHrl: Hrl) {
        console.log("attachmentTypes.thread()", attachToHrl);
        const entryInfo = await weServices.entryInfo(attachToHrl);
        const cellProxy = await asCellProxy(appletClient, undefined, appInfo.installed_app_id, "role_threads"); // FIXME use appInfo.appId and roleName
        const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
        const input: CreatePpInput = {
          pp: {
          purpose: "comment",
          rules: "FFA", //FIXME: 'We' should provide a way for a user to provide extra info
          subjectHash: attachToHrl[1],
          subjectType: "unknown type", //FIXME: 'We' should provide entryInfo.type
        },
          appletId: entryInfo.appletId,
          dnaHash: attachToHrl[0],
        };

        let ppAh: ActionHash = undefined;
        let context: ViewThreadContext;

        /** Check if PP already exists */
        console.log("attachmentTypes.thread() calling getPpsFromSubjectHash():", encodeHashToBase64(attachToHrl[1]));
        const maybeThreads = await proxy.getPpsFromSubjectHash(attachToHrl[1]);
        console.log("attachmentTypes.thread() maybeThreads", maybeThreads);
        for (const ppPair of maybeThreads) {
          const res = await proxy.getPp(ppPair[0]);
          console.log("attachmentTypes.thread() res", res);
          const pp = res[0];
          if (pp.purpose == "comment") {
            ppAh = ppPair[0];
            context = {detail: "existing", subjectType: 'unknown', subjectName: entryInfo.entryInfo.name};
            break;
          }
        }

        /** Create PP */
        if (!ppAh) {
          console.log("attachmentTypes.thread() calling createParticipationProtocol()", input);
          const res = await proxy.createParticipationProtocol(input);
          console.log("attachmentTypes.thread() res", res);
          ppAh = res[0];
          console.log("attachmentTypes.thread() ppAh", encodeHashToBase64(ppAh));
          context = {detail: "create", subjectType: 'unknown', subjectName: entryInfo.entryInfo.name};
        }

        /** Done */
        console.log("attachmentTypes.thread() DONE", context);
        return {
          hrl: [decodeHashFromBase64(cellProxy.cell.dnaHash), ppAh],
          context,
        } as HrlWithContext;
      }
    }
  };
}
