import {AppAgentClient, decodeHashFromBase64, DnaHash, EntryHash} from "@holochain/client";
import {AttachmentType, Hrl} from "@lightningrodlabs/we-applet";
import {asCellProxy} from "./we-utils";
import {ThreadsProxy} from "@threads/elements/dist/bindings/threads.proxy";
import {CreatePpInput} from "@threads/elements/dist/bindings/threads.types";
import {WeServices} from "@lightningrodlabs/we-applet/dist/types";


/** */
export async function attachmentTypes(appletClient: AppAgentClient, appletId: EntryHash, weServices: WeServices): Promise<Record<string, AttachmentType>> {
  return {
    thread: {
      label: "Thread",
      icon_src: "",
      async create(attachToHrl: Hrl) {
        const cellProxy = await asCellProxy(appletClient, attachToHrl, "threads-applet", "role_threads");
        const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
        const input: CreatePpInput = {
          pp: {
          purpose: "comment",
          rules: "FFA",
          subjectHash: attachToHrl[1],
          subjectType: "unknown",
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
