import {
  ActionHash,
  AgentPubKey,
  AnyLinkableHash,
  AppAgentClient,
  decodeHashFromBase64,
  encodeHashToBase64
} from "@holochain/client";
import {
  AppletHash,
  AttachmentName,
  AttachmentType,
  Hrl
} from "@lightningrodlabs/we-applet";
import {asCellProxy, stringifyHrl, wrapPathInSvg} from "@ddd-qc/we-utils";
import {ThreadsProxy, CreatePpInput, THREADS_DEFAULT_ROLE_NAME, WeaveNotification} from "@threads/elements";
import {HrlWithContext, WeServices} from "@lightningrodlabs/we-applet";
import { mdiCommentTextMultiple } from "@mdi/js";
import {AttachableThreadContext} from "@threads/app";


/** */
//export async function attachmentTypes(appletClient: AppAgentClient): Promise<Record<string, AttachmentType>> {
export const attachmentTypes = async function (appletClient: AppAgentClient, appletHash: AppletHash, weServices: WeServices): Promise<Record<AttachmentName, AttachmentType>> {
  const appInfo = await appletClient.appInfo();
  return {
    thread: {
      label: "Thread",
      icon_src: wrapPathInSvg(mdiCommentTextMultiple),
      /** */
      async create(hrlc: HrlWithContext) {
        console.log("Threads/attachmentTypes/Thread: CREATE", stringifyHrl(hrlc.hrl), hrlc.context);
        let context: AttachableThreadContext = {subjectName: "", subjectType: "", detail: ""};
        if (hrlc.context) {
          context = hrlc.context as AttachableThreadContext;
        }

        /** Grab subjectName from context, otherwise grab it from attachableInfo */
        const attLocInfo = await weServices.attachableInfo(hrlc);
        if (!context.subjectName) {
          console.log("Threads/attachmentTypes/Thread: attLocInfo", attLocInfo);
          context.subjectName = attLocInfo.attachableInfo.name;
        }
        if (!context.subjectType) {
          context.subjectType = "unknown";
        }

        /** Grab cell's proxy */
        const cellProxy = await asCellProxy(appletClient, undefined, appInfo.installed_app_id, THREADS_DEFAULT_ROLE_NAME); // FIXME use appInfo.appId and roleName
        const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);

        /** Check if PP already exists */
        let pp_ah: ActionHash = undefined;
        console.log("Threads/attachmentTypes/Thread: calling getPpsFromSubjectHash():", encodeHashToBase64(hrlc.hrl[1]));
        const maybeThreads = await proxy.getPpsFromSubjectHash(hrlc.hrl[1]);
        console.log("Threads/attachmentTypes/Thread: maybeThreads", maybeThreads);
        for (const ppPair of maybeThreads) {
          const res = await proxy.getPp(ppPair[0]);
          console.log("Threads/attachmentTypes/Thread: res", res);
          const pp = res[0];
          if (pp.purpose == "comment") {
            pp_ah = ppPair[0];
            context.detail = "existing";
            break;
          }
        }

        /** Create PP */
        if (!pp_ah) {
          const input: CreatePpInput = {
            pp: {
              purpose: "comment",
              rules: "FFA", //FIXME: 'We' should provide a way for a user to provide extra info
              subjectHash: hrlc.hrl[1],
              subjectType: "unknown type", //FIXME: 'We' should provide entryInfo.type
            },
            // appletId: encodeHashToBase64(appletHash), // (Threads appletHash)
            appletId: encodeHashToBase64(attLocInfo.appletHash),
            dnaHash: hrlc.hrl[0],
          };
          console.log("Threads/attachmentTypes/thread: calling createParticipationProtocol()", encodeHashToBase64(input.dnaHash), input);
          const [new_pp_ah, ts, maybeNotif] = await proxy.createParticipationProtocol(input);
          console.log("Threads/attachmentTypes/thread: res", [new_pp_ah, ts, maybeNotif]);
          pp_ah = new_pp_ah;
          console.log("Threads/attachmentTypes/thread: ppAh", encodeHashToBase64(pp_ah));
          context.detail = "create";
          // Notify subject author if provided
          if (context.subjectAuthor) {
            console.log("Threads/attachmentTypes/thread: notifying author", context.subjectAuthor, new_pp_ah);
            const input = {
              content: new_pp_ah,
              who: decodeHashFromBase64(context.subjectAuthor),
              event: {Fork: null}
            };
            const maybe = await proxy.sendInboxItem(input);
            if (maybe) {
              const signal = this.createNotificationSignal(maybe[1]);
              console.log("Threads/attachmentTypes/thread: signaling notification to peer", context.subjectAuthor, (signal.payload.content as WeaveNotification).event)
              /*await*/ this.notifyPeer(context.subjectAuthor, signal);
            }
          }
        }

        /** Done */
        console.log("Threads/attachmentTypes/thread: DONE", context);
        return {
          hrl: [decodeHashFromBase64(cellProxy.cell.dnaHash), pp_ah],
          context,
        } as HrlWithContext;
      }
    }
  };
}
