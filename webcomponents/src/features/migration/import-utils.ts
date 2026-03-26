import {msg} from "@lit/localize";
import {toasty} from "../../toast";
import {MAIN_SEMANTIC_TOPIC} from "../../utils";
import {ThreadsDvm} from "../../viewModels/threads.dvm";

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
    reader.onload = (_e: any) => {
      const json = reader.result as string;

      let external;
      try {
        external = JSON.parse(json) as any;
      } catch(e) {
        console.error("Error parsing file. File might not be valid JSON. Error:", e);
        toasty(msg("Error parsing file. File might not be valid JSON"));
        return;
      }

      let data: ImportData;
      if (external["guild"]) {
        console.debug("Assuming Discord import");
        data = parseDiscord(external, dvm);
      } else {
        data = parseVines(external, dvm);
      }
      callback(data);
    }
    // Read the file as text
    reader.readAsText(file);
  }
  input.click();
}


export type ImportData = {
  authors: {
     id: string;
     name: string;
     // TODO: color: string;
   }[],
  channels: {
    id: string;
    timestamp: number;
    name: string;
    category?: string; // No category == DM channel
   }[],
   messages: {
     id: string;
     channelId: string;
     prevId?: string;
     authorId: string;
     timestamp: number;
     content: string;
   }[],
   reactions: {messageId: string, emoji: string, authorId: string}[],
}


/** */
function parseDiscord(external: any, dvm: ThreadsDvm): ImportData {
  // TODO: verify input is correct Discord export schema

  let result: ImportData = {authors: [], channels: [], messages: [], reactions: []};
  const channel = external["channel"];
  console.debug("parseDiscord()", channel);
  let discordChannel: any = {id: channel.id, name: channel.name, timestamp: 0};

  /** Map previous profiles by discordId (useful when importing multiple channels) */
  const knownDiscordAuthors = new Set<string>();
  for (const [_actionId, [profile, _ts]] of dvm.profilesZvm.perspective.profiles.entries()) {
    if (profile.fields["discordId"]) {
      knownDiscordAuthors.add(profile.fields["discordId"]);
    }
  }

  /** Process Channel. Handle DM case */
  if (channel.type == "DirectTextChat") {
    console.debug("parseDiscord() parsing DMs with", channel.name);
    let dmId;
    /** Get the DM peer */
    for (const message of external["messages"]) {
      if (message["author"].nickname == channel.name) {
        dmId = message.author.id;
        if (!knownDiscordAuthors.has(message.author.id)) {
          knownDiscordAuthors.add(message.author.id);
          result.authors.push({id: message.author.id, name: message.author.nickname});
        }
        break;
      }
    }
    if (dmId == "") {
      throw new Error("No DM from other person found. Aborting import.")
    }
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
    const author = message["author"];
    if (discordChannel.category && !knownDiscordAuthors.has(author.id)) {
      result.authors.push({id: author.id, name: author.nickname});
      knownDiscordAuthors.add(author.id);
    }
    /** Process timestamp */
    const timestamp = Date.parse(message["timestamp"]) * 1000;
    /** Process Reply */
    let reference = prevMessageId;
    if (message.type == "Reply" && message.reference && message.reference.channelId == channel.id) {
      reference = message.reference.messageId;
    }
    let discordMessage = {id: message.id, channelId: discordChannel.id, authorId: author.id, timestamp, content: message.content, prevId: reference};
    result.messages.push(discordMessage);
    prevMessageId = message.id;
    /** Process Reactions */
    if (message["reactions"]) {
      for (const reaction of message["reactions"]) {
        if (!reaction["emoji"] || !reaction["users"] || reaction["users"].length == 0) {
          continue;
        }
        for (const user of reaction["users"]) {
          result.reactions.push({emoji: reaction["emoji"].name, authorId: user.id, messageId: message.id});
        }
      }
    }
    /**
     * Process Attachments: Since importing the file would be too expensive,
     * we just publish the URL of the attachment and handle it as a special text case later on.
     */
    for (const attachment of message["attachments"]) {
      const content = "__URL__" + JSON.stringify(attachment);
      discordChannel.messages.push({id: attachment.id, authorId: author.id, timestamp, content, prevId: reference});
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
function parseVines(_external: any, _dvm: ThreadsDvm): ImportData {
  // TODO: verify input is correct Discord export schema
  let result: ImportData = {authors: [], channels: [], messages: [], reactions: []};
  // FIXME
  return result;
}
