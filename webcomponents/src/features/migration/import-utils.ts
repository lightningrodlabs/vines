import {msg} from "@lit/localize";
import {toasty} from "../../toast";
import {MAIN_SEMANTIC_TOPIC} from "../../utils";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {Profile} from "@ddd-qc/profiles-dvm/dist/bindings/profiles.types";
import {ActionId, AgentId} from "@ddd-qc/lit-happ";
import {ThreadsSnapshot} from "../../viewModels/threads.perspective";
import {ThreadsZvm} from "../../viewModels/threads.zvm";
import {SpecialSubjectType} from "../../events";
import {ActionHashB64} from "@holochain/client";
import {ProfilesAltSnapshot, ProfilesZvm} from "@ddd-qc/profiles-dvm";


export type ChannelInfo = {
  id: string;
  timestamp: number;
  name: string;
  category?: string; // No category == DM channel
  dmId?: AgentId;
}

export type DiscordMessage = {
  id: string;
  channelId: string;
  prevId?: string;
  agentId: AgentId;
  timestamp: number;
  content: string;
}

export type ImportData = {
  json: any,
  discord?: DiscordImportData,
  vines?: VinesImportData,
}

export type ImportAuthor = {
  agentId: AgentId;
  profile?: Profile;
}

export type ImportReaction = {
  messageId: string,
  emoji: string,
  agentId: AgentId,
}



export type DiscordImportData = {
  authors: ImportAuthor[],
  channels: ChannelInfo[],
  messages: DiscordMessage[],
  reactions: ImportReaction[],
}


export type VinesImportData = {
  authors: {
    agentId: AgentId;
    profile?: Profile;
  }[],
  channels: {
    info: ChannelInfo,
    messages: {
      ah: ActionId,
      reactions: number,
    }[]
  }[],
}



async function createProfileFromDiscord(author: any): Promise<ImportAuthor> {
  const agentId = await AgentId.random(); // Profile needs to be bound to an agentId, since there are none, make one up.
  const profile: Profile = {
    nickname: author.nickname,
    fields: {lang: "en", avatarUrl: author.avatarUrl, discordId: author.id, imported: "true"}
  };
  if (author.color) {
    profile.fields["color"] = author.color;
  }
  return { agentId, profile } ;
}



/** */
export function loadImportFile(dvm: ThreadsDvm, callback: (data: ImportData) => void) {
  console.log("loadImportFile()");
  /** Select a file */
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = ".json";
  input.onchange = async (e: any) => {
    console.log("loadImportFile() target download file", e);
    const file = e.target.files[0];
    if (!file) {
      console.error("No file selected");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toasty(`File is too large. Max size is 500MB.`);
      input.value = '';
      return;
    }
    if (file.size <= 0) {
      toasty(`File is empty.`);
      input.value = '';
      return;
    }
    /** Read the file */
    const reader = new FileReader();
    reader.onload = async (_e: any) => {
      const json = reader.result as string;

      let external;
      try {
        external = JSON.parse(json) as any;
      } catch(e) {
        console.error("Error parsing file. File might not be valid JSON. Error:", e);
        toasty(msg("Error parsing file. File might not be valid JSON"));
        return;
      }

      let result: any = {json: external};
      if (external["guild"]) {
        console.debug("Assuming Discord import");
        result.discord = await parseDiscord(external, dvm);
      }
      else {
        result.vines = parseVines(external, dvm);
      }
      callback(result);
    }
    // Read the file as text
    reader.readAsText(file);
  }
  input.click();
}


/**
 * TODO: verify input is correct Discord export schema
 */
async function parseDiscord(external: any, dvm: ThreadsDvm): Promise<DiscordImportData> {
  let result: DiscordImportData = {authors: [], channels: [], messages: [], reactions: []};
  const channel = external["channel"];
  console.debug("parseDiscord()", channel);
  let discordChannel: ChannelInfo = {id: channel.id, name: channel.name, timestamp: 0};

  /** Map previous profiles by discordId (useful when importing multiple discord channels) */
  const knownDiscordAuthors = new Map<string, AgentId>();
  for (const [actionId, [profile, _ts]] of dvm.profilesZvm.perspective.profiles.entries()) {
    if (profile.fields["discordId"]) {
      const agentId = dvm.profilesZvm.perspective.getProfileAgent(actionId);
      if (!agentId) {
        throw new Error("Missing agentId. Aborting import.")
      }
      knownDiscordAuthors.set(profile.fields["discordId"], agentId);
    }
  }

  /** Process Channel. Handle DM case */
  if (channel.type == "DirectTextChat") {
    console.debug("parseDiscord() parsing DMs with", channel.name);
    let dmId: AgentId | undefined = undefined;
    /** Get the DM peer */
    for (const message of external["messages"]) {
      if (message["author"].nickname == channel.name) {
        if (!knownDiscordAuthors.has(message.author.id)) {
          const author = await createProfileFromDiscord(message.author)
          result.authors.push(author);
          knownDiscordAuthors.set(message.author.id, author.agentId);
        }
        dmId = knownDiscordAuthors.get(message.author.id);
        break;
      }
    }
    if (!dmId) {
      throw new Error("No DM from other person found. Aborting import.")
    }
    discordChannel.dmId = dmId;
  } else {
    /** Normal channel case */
    discordChannel.category = channel.category ?? MAIN_SEMANTIC_TOPIC;
  }
  result.channels.push(discordChannel);
  /** Process messages */
  let prevMessageId: string | undefined = undefined;
  let count = 0;
  for (const message of external["messages"]) {
    count += 1;
    /** Process author for non-DM channel */
    const discordAuthor = message["author"];
    if (discordChannel.category && !knownDiscordAuthors.has(discordAuthor.id)) {
      const author = await createProfileFromDiscord(discordAuthor);
      result.authors.push(author);
      knownDiscordAuthors.set(discordAuthor.id, author.agentId);
    }
    const agentId = knownDiscordAuthors.get(discordAuthor.id)!;
    /** Process timestamp */
    const timestamp = Date.parse(message["timestamp"]) * 1000;
    /** Process Reply */
    let reference = prevMessageId;
    if (message.type == "Reply" && message.reference && message.reference.channelId == channel.id) {
      reference = message.reference.messageId;
    }
    const discordMessage: DiscordMessage = {id: message.id, channelId: discordChannel.id, agentId, timestamp, content: message.content, prevId: reference};
    result.messages.push(discordMessage);
    prevMessageId = message.id;
    /** Process Reactions */
    if (message["reactions"]) {
      for (const reaction of message["reactions"]) {
        if (!reaction["emoji"] || !reaction["users"] || reaction["users"].length == 0) {
          continue;
        }
        for (const user of reaction["users"]) {
          if (!knownDiscordAuthors.has(user.id)) {
            const author = await createProfileFromDiscord(user);
            result.authors.push(author);
            knownDiscordAuthors.set(discordAuthor.id, author.agentId);
          }
          const agentId = knownDiscordAuthors.get(discordAuthor.id)!;
          result.reactions.push({emoji: reaction["emoji"].name, agentId, messageId: message.id});
        }
      }
    }
    /**
     * Process Attachments: Since importing the file would be too expensive,
     * we just publish the URL of the attachment and handle it as a special text case later on.
     */
    for (const attachment of message["attachments"]) {
      const content = "__URL__" + JSON.stringify(attachment);
      const agentId = knownDiscordAuthors.get(discordAuthor.id);
      if (!agentId) {
        throw new Error("Missing agentId. Aborting import.")
      }
      const discordMessage: DiscordMessage = {id: attachment.id, channelId: discordChannel.id, agentId, timestamp: timestamp + 1001, content, prevId: reference}
      result.messages.push(discordMessage);
      prevMessageId = attachment.id;
    }
    /** Set the channel creation date to the date of the first message (DiscordChatExporter does not provide a creation date for a channel) */
    if (count == 1) {
      discordChannel.timestamp = timestamp;
    }
  }
  /** */
  return result;
}


/** */
function parseVines(external: any, _dvm: ThreadsDvm): VinesImportData {
  // TODO: verify input is correct Vines export schema
  let result: VinesImportData = {authors: [], channels: [] };
  const snapshot: ThreadsSnapshot = external[ThreadsZvm.DEFAULT_ZOME_NAME];
  /** authors */
  const profiles: ProfilesAltSnapshot = external[ProfilesZvm.DEFAULT_ZOME_NAME];
  for (const [agentId, _actionId, profile, _ts] of profiles.all) {
    result.authors.push({agentId, profile})
  }
  /** reactions */
  const reacMap = new Map<ActionHashB64, number>();
  for (const [beadAhB64, pairs] of snapshot.emojiReactions) {
    reacMap.set(beadAhB64, pairs.length);
  }
  /** Beads */
  const msgMap = new Map<ActionHashB64, { ah: ActionId, reactions: number}[]>();
  for (const [beadAhB64, beadInfo, _typedBead] of Object.values(snapshot.beads)) {
    const key = beadInfo.bead.ppAh.b64;
    if (!msgMap.has(key)) msgMap.set(key, []);
    msgMap.get(key)!.push({ah: new ActionId(beadAhB64), reactions: reacMap.get(beadAhB64) ?? 0});
  }
  /** Threads */
  for (const [ppAhB64, ppMat, title, creationTime, _maybeOtherAgent] of Object.values(snapshot.pps)) {
    const channel: ChannelInfo = {id: ppAhB64, name: title, timestamp: creationTime};
    if (ppMat.subject.typeName == SpecialSubjectType.AgentPubKey) {
      channel.dmId = new AgentId(ppMat.subject.address);
    } else if (ppMat.subject.typeName == SpecialSubjectType.SemanticTopic) {
      channel.category = ppMat.subject.name;
    } else {
      /** Skip non-topic non dm thread */
      continue;
    }
    /** */
    result.channels.push({info: channel, messages: msgMap.get(ppAhB64) ?? []});
  }

  /** */
  return result;
}
