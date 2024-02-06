import {AgentPubKeyB64, encodeHashToBase64, fakeAgentPubKey, Timestamp} from "@holochain/client";
import {AnyLinkableHashB64} from "./viewModels/threads.perspective";
import {ProfilesPerspective} from "@ddd-qc/profiles-dvm";
import {emptyAgentPubKey} from "./utils";


/** */
export interface SearchParameters {
  keywords?: string[],
  author?: AgentPubKeyB64, // "from:"
  mentionsAgentByName?: string, //"mentions:"
  threadOrApplet?: AnyLinkableHashB64, //"in:" "app:"
  beforeTs?: Timestamp, //"before:"
  afterTs?: Timestamp, //"after:"
  canProbe?: boolean,
  canSearchHidden: boolean,
  // entryType: string,
  //beadType?: string, //"is:link" //"is:hrl"
  //starredOnly: boolean, //"pinned:"
}


function hasQuotes(input: string): boolean {
  const double = /^".*?"$/;
  return double.test(input);
}


/** */
export function parseSearchInput(input: string, profilesPerspective: ProfilesPerspective/*, threadsPerspective: ThreadsPerspective*/): SearchParameters {
  //console.log("parseSearchInput() input", input);
  const sanitized = input.trim().replace(/[^a-zA-Z0-9:"\-]/g, ' ');
  const words = sanitized.split(/\s+/)

  console.log(`parseSearchInput() "${input}"`, words);
  let result: SearchParameters = {canSearchHidden: false};

  for (const word of words) {
    if (word == "") {
      continue;
    }
    /** check for quotes */
    const quoted = hasQuotes(word);
    if (quoted) {
      if (!result.keywords) {
        result.keywords = []
      }
      result.keywords.push(word.replace(/"/g, ''));
      continue;
    }
    /** check for searchKeyword */
    const subs = word.split(":");
    if (subs.length != 2) {
      if (!result.keywords) {
        result.keywords = []
      }
      result.keywords.push(word);
      continue;
    }
    /** Parse searchKeyword */
    switch (subs[0]) {
      case "from":
        const author = subs[1];
        if (author && author != "") {
          result.author = profilesPerspective.reversed[author] ? profilesPerspective.reversed[author] : encodeHashToBase64(emptyAgentPubKey());
        }
        break;
      case "mentions":
        const mention = subs[1];
        result.mentionsAgentByName = mention;
        break;
      case "before":
        const before = subs[1];
        const beforeTs = Date.parse(before);
        if (!isNaN(beforeTs)) {
          result.beforeTs = beforeTs * 1000;
        }
        break;
      case "after":
        const after = subs[1];
        const afterTs = Date.parse(after);
        if (!isNaN(afterTs)) {
          result.afterTs = afterTs * 1000;
        }
        break;
      // case "in":
      //   const threadPurpose = subs[1]; // FIXME: handle thread purpose with whitespaces.
      //   const thread = threadsPerspective.threads.threadByPurpose(threadPurpose)
      //   break;
      //case "app": break;
      //case "is:": break;
      //case "pinned:": break;
      default: break;

    }
  }
  /** Done */
  return result;
}


/** -- TEST -- */

const persp: ProfilesPerspective = {profiles: {}, reversed: {}};
persp.reversed["alex"] = encodeHashToBase64(await fakeAgentPubKey());
persp.reversed["bill-y"] = encodeHashToBase64(await fakeAgentPubKey());
persp.reversed["camille"] = encodeHashToBase64(await fakeAgentPubKey());

persp.profiles[persp.reversed["alex"]] = {nickname: "alex", fields: {}};
persp.profiles[persp.reversed["bill-y"]] = {nickname: "bill-y", fields: {}};
persp.profiles[persp.reversed["camille"]] = {nickname: "camille", fields: {}};


/** */
function testSeachParse(input: string, expectedOutput: SearchParameters): boolean {
  const result = parseSearchInput(input, persp);
  const succeeded = comparableObject(result) == comparableObject(expectedOutput);
  if (!succeeded) {
    console.log("testSeachParse() failed", input, comparableObject(expectedOutput), comparableObject(result));
  }
  return succeeded;
}


/** */
export async function generateSearchTest() {
  let result = true;
  result &&= testSeachParse("alex",  {keywords: ["alex"], canSearchHidden: false});
  result &&= testSeachParse("   alex \t ",  {keywords: ["alex"], canSearchHidden: false});
  result &&= testSeachParse("£ !alex ??",  {keywords: ["alex"], canSearchHidden: false});
  result &&= testSeachParse('"alex"', {keywords: ["alex"], canSearchHidden: false});
  result &&= testSeachParse('bill-y', {keywords: ["bill-y"], canSearchHidden: false});
  result &&= testSeachParse("from: alex", {keywords: ["alex"], canSearchHidden: false});
  result &&= testSeachParse('alex billy', {keywords: ["alex", "billy"], canSearchHidden: false});
  result &&= testSeachParse("from:alex", {author: persp.reversed["alex"], canSearchHidden: false});
  result &&= testSeachParse("from:jack", {author: encodeHashToBase64(emptyAgentPubKey()), canSearchHidden: false});
  result &&= testSeachParse("mentions:alex", {mentionsAgentByName: "alex", canSearchHidden: false});

  result &&= testSeachParse("before:2030-01-01", {beforeTs: 1893456000000000, canSearchHidden: false});
  result &&= testSeachParse("after:2020-01-01", {afterTs: 1577836800000000, canSearchHidden: false});

  result &&= testSeachParse("before:2030-01-01 after:2020-01-01 golden from:camille mentions:bill-y lady",
    {beforeTs: 1893456000000000, afterTs: 1577836800000000, keywords: ["golden", "lady"], mentionsAgentByName: "bill-y",  author: persp.reversed["camille"], canSearchHidden: false});

  console.log("generateSearchTest() succeeded", result);
}


/** Sort keys and stringify */
function comparableObject(jsonObject: object): string {
  const sortedKeys = Object.keys(jsonObject).sort();
  const sortedObject: { [key: string]: any } = {};
  sortedKeys.forEach(key => {
    sortedObject[key] = jsonObject[key];
  });
  return JSON.stringify(sortedObject, null, 2);
}
