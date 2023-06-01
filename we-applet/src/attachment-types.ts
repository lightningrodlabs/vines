import {AppAgentClient, decodeHashFromBase64, DnaHash} from "@holochain/client";
import {AttachmentType, Hrl} from "@lightningrodlabs/we-applet";
import {asCellProxy} from "./we-utils";
import {ThreadsProxy} from "@threads/elements/dist/bindings/threads.proxy";
import {CreatePpInput} from "@threads/elements/dist/bindings/threads.types";


/** */
export async function attachmentTypes(client: AppAgentClient): Promise<Record<string, AttachmentType>> {
  return {
    thread: {
      label: "Thread",
      icon_src: "",
      async create(attachToHrl: Hrl) {
        const cellProxy = await asCellProxy(client, attachToHrl, "threads-applet", "role_threads");
        const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
        const input: CreatePpInput = {
          purpose: "comment",
          rules: "FFA",
          dnaHash: attachToHrl[0],
          subjectHash: attachToHrl[1],
          subjectType: "unknown",
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
