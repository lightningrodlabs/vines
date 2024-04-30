/** */
import {ThreadsDvm} from "./viewModels/threads.dvm";
import {ActionHashB64} from "@holochain/client";
import {MAIN_TOPIC_HASH} from "./utils";

export function getMainThread(dvm: ThreadsDvm): ActionHashB64 {
  const threads = dvm.threadsZvm.perspective.threadsPerSubject[MAIN_TOPIC_HASH];
  console.log("getMainThread()", threads, dvm);
  let ppAh = threads[0];
  let oldestCreationTime = Date.now() * 1000;
  if (threads.length > 1) {
    /* UH OH: multiple main threads. May be caused by partiionned network. Take oldest */
    for (const threadAh of threads) {
      const thread = dvm.threadsZvm.getThread(threadAh);
      if (thread.creationTime < oldestCreationTime) {
        oldestCreationTime = thread.creationTime;
        ppAh = threadAh;
      }
    }
  }
  return ppAh;
}
