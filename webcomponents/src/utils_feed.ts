import {ThreadsDvm} from "./viewModels/threads.dvm";
import {determineBeadName} from "./utils";
import {FilesDvm} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {NotifiableEvent, ThreadsNotification} from "./viewModels/threads.materialize";
import {ActionId} from "@ddd-qc/lit-happ";


/** MAIN TOPIC is hardcoded */
export const MAIN_TOPIC_ID: ActionId = ActionId.empty(77); // 'M'
export const MAIN_SEMANTIC_TOPIC = "__main";

/**
 * Grab oldest thread about MAIN TOPIC.
 * This is because partitioned networks edge case where several agents create the main thread.
 */
export function getMainThread(dvm: ThreadsDvm): ActionId | undefined {
  const threads = dvm.threadsZvm.perspective.getSubjectThreads(MAIN_TOPIC_ID.b64);
  //console.log("getMainThread()", threads, dvm);
  if (!threads || threads.length == 0) {
    return undefined;
  }
  let ppAh = threads[0];
  let oldestCreationTime = Date.now() * 1000;
  if (threads.length > 1) {
    /* UH OH: multiple main threads. May be caused by partiionned network. Take oldest */
    for (const threadAh of threads) {
      const thread = dvm.threadsZvm.perspective.threads.get(threadAh);
      if (thread && thread.creationTime < oldestCreationTime) {
        oldestCreationTime = thread.creationTime;
        ppAh = threadAh;
      }
    }
  }
  return ppAh;
}



/** Return [notifTitle, notifBody] */
export function  composeFeedNotificationTitle(notif: ThreadsNotification, threadsDvm: ThreadsDvm, filesDvm: FilesDvm, weServices: WeServicesEx): [string, string] {
  let title: string = "";
  let content: string = "";
  const ah = notif.content;
  if (NotifiableEvent.Mention === notif.event) {
    const beadInfo = threadsDvm.threadsZvm.perspective.getBeadInfo(ah);
    if (!beadInfo) {
      title = "Mentionned";
    } else {
      const typedBead = threadsDvm.threadsZvm.perspective.getBead(ah);
      const maybeThread = threadsDvm.threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
      if (maybeThread) {
        title = 'Mentionned in "' + maybeThread.pp.subject_name + '"';
      }
      content = determineBeadName(beadInfo.beadType, typedBead!, filesDvm, weServices);
    }
  }
  if (NotifiableEvent.NewBead === notif.event) {
    const beadInfo = threadsDvm.threadsZvm.perspective.getBeadInfo(ah);
    if (beadInfo) {
      const typedBead = threadsDvm.threadsZvm.perspective.getBead(ah);
      const maybeThread = threadsDvm.threadsZvm.perspective.threads.get(beadInfo.bead.ppAh);
      const mainThreadAh = getMainThread(threadsDvm);
      if (maybeThread && mainThreadAh) {
        if (beadInfo.bead.ppAh.equals(mainThreadAh)) {
          title = "New post";
        } else {
          title = `New comment on post "${maybeThread.pp.subject_name}"` //maybeThread.name;
        }
        content = determineBeadName(beadInfo.beadType, typedBead!, filesDvm, weServices);
      }
    }
  }
  if (NotifiableEvent.Reply === notif.event) {
    // const beadPair = threadsZvm.perspective.beads[ah];
    // if (!beadPair) {
    //   title = "Reply in thread";
    // } else {
    //   const beadInfo = beadPair[0];
    //   const typedBead = beadPair[1];
    //   const maybeThread = threadsZvm.threads.get(beadInfo.bead.ppAh);
    //   if (maybeThread) {
    //     title = "Reply in thread " + maybeThread.name;
    //   }
    //   content = determineBeadName(beadInfo.beadType, typedBead, filesDvm, weServices);
    //}
  }
  if (NotifiableEvent.Fork === notif.event) {
    // const maybeThread = threadsZvm.threads.get(ah);
    // if (!maybeThread)  {
    //   title = "New thread";
    // } else {
    //   // const subjectHash = maybeThread.pp.subjectHash;
    //   // const subject = this.getSubject(subjectHash);
    //   // title = "New thread about a " + subject.typeName;
    //   title = "New thread: " + maybeThread.name;
    //   content = "Rules: " + maybeThread.pp.rules;
    // }
  }
  if (NotifiableEvent.NewDmThread === notif.event) {
    // TODO
  }
  return [title, content];
}
