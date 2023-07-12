/** */
import {EntryHash, ActionHashB64} from "@holochain/client";
import {AnyLinkableHashB64} from "./viewModels/threads.perspective";


export function getInitials(nickname: string): string {
  const names = nickname.split(' ');
  let initials = names[0].substring(0, 1).toUpperCase();
  if (names.length > 1) {
    initials += names[names.length - 1].substring(0, 1).toUpperCase();
  } else {
    initials += names[0].substring(1, 2);
  }
  return initials;
}



export async function emptyAppletId(): Promise<EntryHash> {
  const zeroBytes = new Uint8Array(36).fill(0);
  return new Uint8Array([0x84, 0x21, 0x24, ...zeroBytes]);
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
