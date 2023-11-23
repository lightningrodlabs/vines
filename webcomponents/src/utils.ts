import {ActionHashB64} from "@holochain/client";
import {AnyLinkableHashB64, BeadLinkMaterialized} from "./viewModels/threads.perspective";
import {html, TemplateResult} from "lit";


/** */
export function beadToChatItem(blm: BeadLinkMaterialized): TemplateResult<1> {
  switch (blm.beadType) {
    case "TextMessage": return html`<chat-message-item hash="${blm.beadAh}"></chat-message-item>`;
    default:
      return html`<chat-file-item hash="${blm.beadAh}"></chat-file-item>`;
  }
}


/** Truncate string to given length and add ellipse */
export function truncate(str: string, n: number, useWordBoundary: boolean): string {
  if (str.length <= n) { return str; }
  const subString = str.slice(0, n - 1);
  return (useWordBoundary
    ? subString.slice(0, subString.lastIndexOf(" "))
    : subString) + "...";
};


/** */
export function timeSince(date: Date): string {
  var seconds = Math.floor((new Date().valueOf() - date.valueOf()) / 1000);
  var interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + " years";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}


/** */
export interface CommentRequest {
  maybeCommentThread: ActionHashB64 | null,
  subjectHash: AnyLinkableHashB64,
  subjectType: string,
  subjectName: string,
}


/** */
export function parseMentions(str: string): string[]  {
  if (typeof str !== 'string') {
    throw new TypeError('expected a string');
  }

  var re = /(?:[\w_＠@][＠@])|[＠@]([\w_]{1,15})(?=$|[^\w_])/g;
  var tokens = { input: str, output: str, matches: [] };
  var match;

  while ((match = re.exec(tokens.output))) {
    if (!match[1]) continue;
    var token = { name: match[1], match: match };
    tokens.matches.push(token);
  }
  return tokens.matches.map((m) => m.name);
};
