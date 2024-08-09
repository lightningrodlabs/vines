import {Timestamp} from "@holochain/client";
import {AgentId} from "@ddd-qc/lit-happ";
import {ProfilesAltPerspective, ProfilesAltPerspectiveMutable} from "@ddd-qc/profiles-dvm";


/** */
export interface SearchParameters {
  keywords?: string[],
  author?: AgentId, // "from:"
  mentionsAgentByName?: string, //"mentions:"
  threadByName?: string, //"in:"
  appletByName?: string, // "app:"
  beforeTs?: Timestamp, //"before:"
  afterTs?: Timestamp, //"after:"

  inWIP?: string, //
  appWIP?: string,

  canProbe?: boolean, // TODO
  canSearchHidden: boolean, // TODO
  // entryType: string,
  //beadType?: string, //"is:link" //"is:hrl"
  //starredOnly: boolean, //"pinned:"
}


const searchKeywords = ["from:", "mentions:", "in:", "app:", "before:", "after:", "is:"]



// function hasQuotes(input: string): boolean {
//   const double = /^".*?"$/;
//   return double.test(input);
// }

function splitStringAtFirstColon(input: string): string[] {
  const index = input.indexOf(':');
  if (index !== -1) {
    const part1 = input.slice(0, index + 1); // Include the character
    const part2 = input.slice(index + 1);
    return [part1, part2];
  } else {
    // If the character is not found, return the entire string as part 1 and an empty string as part 2
    return [input];
  }
}


/** */
export function parseSearchInput(input: string, profilesPerspective: ProfilesAltPerspective/*, threadsPerspective: ThreadsPerspective*/): SearchParameters {
  //console.log("parseSearchInput() input", input);
  const sanitized = input.trim()//.replace(/[^a-zA-Z0-9:"\-,]/g, ' ');
  const quoted = splitSpacesExcludeQuotesDetailed(sanitized);
  const words = mergeSearchKeywords(quoted);
  //const words = sanitized.split(/\s+/)
  //console.log(`parseSearchInput() "${input}"`, words, quoted);

  let result: SearchParameters = {canSearchHidden: false};

  for (const word of words) {
    if (word == "") {
      continue;
    }
    // /** check for quotes */
    // const quoted = hasQuotes(word);
    // if (quoted) {
    //   if (!result.keywords) {
    //     result.keywords = []
    //   }
    //   result.keywords.push(word.replace(/"/g, ''));
    //   continue;
    // }
    /** check for searchKeyword */
    //const subs = word.split(":");
    const subs = splitStringAtFirstColon(word);
    if (subs.length != 2) {
      if (!result.keywords) {
        result.keywords = []
      }
      result.keywords.push(word);
      continue;
    }
    /** Parse searchKeyword */
    switch (subs[0]) {
      case "from:":
        const author = subs[1];
        if (author && author != "") {
          result.author = profilesPerspective.getAgent(author) ? profilesPerspective.getAgent(author)! : AgentId.empty();
        }
        break;
      case "mentions:":
        const mention = subs[1]!;
        result.mentionsAgentByName = mention;
        break;
      case "before:":
        const before = subs[1]!;
        const beforeTs = Date.parse(before);
        if (!isNaN(beforeTs)) {
          result.beforeTs = beforeTs * 1000;
        }
        break;
      case "after:":
        const after = subs[1]!;
        const afterTs = Date.parse(after);
        if (!isNaN(afterTs)) {
          result.afterTs = afterTs * 1000;
        }
        break;
      case "in:":
        const threadName = subs[1]!;
        result.threadByName = threadName;
        break;
      case "app:":
        const appletName = subs[1]!;
        result.appletByName = appletName;
        break;
      //case "is:": break;
      //case "pinned:": break;
      default: break;

    }
  }
  /** Done */
  return result;
}

/** ----------------------------------- Parse QUOTES -----------------------------------------------------------------*/

export type ParsedValue = {
  /**
   * The type of the parsed group.
   *
   * - `plain` : The parsed group was split by spaces, but wasn't surrounded by quotes;
   * - `single` : The parsed group was split by spaces, and was surrounded by single quotes (`'`);
   * - `double` : The parsed group was split by spaces, and was surrounded by double quotes (`"`);
   */
  type: 'plain' | 'single' | 'double';
  /**
   * The text that this group contains (may contain spaces if the group was surrounded by quotes).
   */
  value: string;
};

/**
 * This function splits spaces and creates an array of object defining both the type of group (based on quotes) and the value (text) of the group.
 * @param string The string to split.
 * @see splitSpacesExcludeQuotes
 */
export function splitSpacesExcludeQuotesDetailed(string: string): ParsedValue[] {
  const groupsRegex = /[^\s"']+|(?:"|'){2,}|"(?!")([^"]*)"|'(?!')([^']*)'|"|'/g;

  const matches: ParsedValue[] = [];

  let match;

  while ((match = groupsRegex.exec(string))) {
    if (match[2]) {
      // Single-quoted group
      matches.push({ type: 'single', value: match[2] });
    } else if (match[1]) {
      // Double-quoted group
      matches.push({ type: 'double', value: match[1] });
    } else {
      // No quote group present
      matches.push({ type: 'plain', value: match[0]! });
    }
  }

  return matches;
}

/**
 * This function splits spaces and creates an array of strings, like if you were to use `String.split(...)`, but without splitting the spaces in between quotes.
 * @param string The string to split.
 * @see splitSpacesExcludeQuotesDetailed
 */
export function splitSpacesExcludeQuotes(string: string): string[] {
  return splitSpacesExcludeQuotesDetailed(string).map((details) => details.value);
}

/** Have ['from:', 'quoated content'] become ['from:"quoated content"'] */
function mergeSearchKeywords(quotes: ParsedValue[]): string[] {
  let result: string[] = []
  let i = 0;
  while(i < quotes.length + 1) {
    const word = quotes[i]!.value;
    if (searchKeywords.includes(word) && i + 1 < quotes.length && quotes[i + 1]!.type != "plain") {
      result.push(word + quotes[i + 1]!.value);
      i += 1;
    } else {
      result.push(word);
    }
    i += 1;
  }
  return result;
}


/** ------------------------------------------- TEST -----------------------------------------------------------------*/

const persp: ProfilesAltPerspectiveMutable = new ProfilesAltPerspectiveMutable();
/*await*/ persp.generateRandomProfile("alex");
/*await*/ persp.generateRandomProfile("bill-y");
/*await*/ persp.generateRandomProfile("camille");
/*await*/ persp.generateRandomProfile("tic tac");


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
  //result &&= testSeachParse("£ !alex ??",  {keywords: ["alex"], canSearchHidden: false});
  result &&= testSeachParse('"alex"', {keywords: ["alex"], canSearchHidden: false});
  result &&= testSeachParse('bill-y', {keywords: ["bill-y"], canSearchHidden: false});
  result &&= testSeachParse("alex billy",  {keywords: ["alex", "billy"], canSearchHidden: false});
  result &&= testSeachParse('"alex billy"',  {keywords: ["alex billy"], canSearchHidden: false});
  result &&= testSeachParse("from: alex", {keywords: ["alex"], canSearchHidden: false});
  result &&= testSeachParse('alex billy', {keywords: ["alex", "billy"], canSearchHidden: false});

  result &&= testSeachParse("from:alex", {author: persp.getAgent("alex")!, canSearchHidden: false});
  result &&= testSeachParse("from:jack", {author: AgentId.empty(), canSearchHidden: false});
  result &&= testSeachParse("from:tic tac", {author: AgentId.empty(), keywords: ["tac"], canSearchHidden: false});
  result &&= testSeachParse('from:"tic tac"', {author: persp.getAgent("tic tac")!, canSearchHidden: false});
  result &&= testSeachParse("mentions:alex", {mentionsAgentByName: "alex", canSearchHidden: false});

  result &&= testSeachParse('in:"#General: off-topic"', {threadByName: "#General: off-topic", canSearchHidden: false});


  result &&= testSeachParse("before:2030-01-01", {beforeTs: 1893456000000000, canSearchHidden: false});
  result &&= testSeachParse("after:2020-01-01", {afterTs: 1577836800000000, canSearchHidden: false});

  result &&= testSeachParse('before:"Tue, 06 Feb 2024 18:59:33 GMT"', {beforeTs: 1707245973000000, canSearchHidden: false});

  result &&= testSeachParse("before:2030-01-01 after:2020-01-01 golden from:camille mentions:bill-y lady",
    {beforeTs: 1893456000000000, afterTs: 1577836800000000, keywords: ["golden", "lady"], mentionsAgentByName: "bill-y",  author: persp.getAgent("camille")!, canSearchHidden: false});

  console.log("generateSearchTest() succeeded", result);
}


/** Sort keys and stringify */
function comparableObject(jsonObject: object): string {
  const sortedKeys = Object.keys(jsonObject).sort();
  const sortedObject: { [key: string]: any } = {};
  sortedKeys.forEach(key => {
    // @ts-ignore
    sortedObject[key] = jsonObject[key];
  });
  return JSON.stringify(sortedObject, null, 2);
}
