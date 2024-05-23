/** */
import {ThreadsDvm} from "./viewModels/threads.dvm";
import {ActionHashB64, encodeHashToBase64} from "@holochain/client";
import {determineBeadName, MAIN_TOPIC_HASH} from "./utils";
import {NotifiableEventType, WeaveNotification} from "./bindings/threads.types";
import {FilesDvm} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";


export const POST_TYPE_NAME = "Post";

/**
 * Grab oldest thread about MAIN TOPIC.
 * This is because partitioned networks edge case where several agents create the main thread.
 */
export function getMainThread(dvm: ThreadsDvm): ActionHashB64 | null {
  const threads = dvm.threadsZvm.perspective.threadsPerSubject[MAIN_TOPIC_HASH];
  //console.log("getMainThread()", threads, dvm);
  if (threads.length == 0) {
    return null;
  }
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



/** Return [notifTitle, notifBody] */
export function  composeFeedNotificationTitle(notif: WeaveNotification, threadsDvm: ThreadsDvm, filesDvm: FilesDvm, weServices: WeServicesEx): [string, string] {
  let title: string = "";
  let content: string = "";
  const ah = encodeHashToBase64(notif.content);
  if (NotifiableEventType.Mention in notif.event) {
    const beadPair = threadsDvm.threadsZvm.perspective.beads[ah];
    if (!beadPair) {
      title = "Mentionned";
    } else {
      const beadInfo = beadPair[0];
      const typedBead = beadPair[1];
      const maybeThread = threadsDvm.threadsZvm.getThread(beadInfo.bead.ppAh);
      if (maybeThread) {
        title = 'Mentionned in "' + maybeThread.pp.subject_name + '"';
      }
      content = determineBeadName(beadInfo.beadType, typedBead, filesDvm, weServices);
    }
  }
  if (NotifiableEventType.NewBead in notif.event) {
    const beadPair = threadsDvm.threadsZvm.perspective.beads[ah];
    if (beadPair) {
      const beadInfo = beadPair[0];
      const typedBead = beadPair[1];
      const maybeThread = threadsDvm.threadsZvm.getThread(beadInfo.bead.ppAh);
      const mainThreadAh = getMainThread(threadsDvm);
      if (maybeThread) {
        if (beadInfo.bead.ppAh == mainThreadAh) {
          title = "New post";
        } else {
          title = `New comment on post "${maybeThread.pp.subject_name}"` //maybeThread.name;
        }
        content = determineBeadName(beadInfo.beadType, typedBead, filesDvm, weServices);
      }
    }
  }
  if (NotifiableEventType.Reply in notif.event) {
    // const beadPair = threadsZvm.perspective.beads[ah];
    // if (!beadPair) {
    //   title = "Reply in thread";
    // } else {
    //   const beadInfo = beadPair[0];
    //   const typedBead = beadPair[1];
    //   const maybeThread = threadsZvm.getThread(beadInfo.bead.ppAh);
    //   if (maybeThread) {
    //     title = "Reply in thread " + maybeThread.name;
    //   }
    //   content = determineBeadName(beadInfo.beadType, typedBead, filesDvm, weServices);
    //}
  }
  if (NotifiableEventType.Fork in notif.event) {
    // const maybeThread = threadsZvm.getThread(ah);
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
  if (NotifiableEventType.NewDmThread in notif.event) {
    // TODO
  }
  return [title, content];
}
