import {createContext} from "@lit/context";
import {FilesDvm} from "@ddd-qc/files";
import {AppProxy} from "@ddd-qc/cell-proxy";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {encodeHashToBase64, fakeEntryHash} from "@holochain/client";
import emoji from './emoji'
import markdownit from "markdown-it";
import markdownItMark from 'markdown-it-mark';

//export const THIS_APPLET_ID = "__this"
export const THIS_APPLET_ID = encodeHashToBase64(await fakeEntryHash(118)); // 'v'

export const SUBJECT_TYPE_TYPE_NAME = "SubjectType";
export const PP_TYPE_NAME = "ParticipationProtocol";

export const weClientContext = createContext<WeServicesEx>('we_client');
//export const wePerspectiveContext = createContext<WePerspective>('we_perspective');
export const globaFilesContext = createContext<FilesDvm>('global/files');

export const appProxyContext = createContext<AppProxy>('__vines_app_proxy');

export const onlineLoadedContext = createContext<boolean>('__vines_online_loaded');



export const md = markdownit({
  linkify: true,
  //breaks: true,
});
md.use(markdownItMark)
md.use(emoji)
md.linkify
  .set({fuzzyEmail: false })
  .add('we:', 'http:')
  .add('weave:', 'http:')
  .add('@', {
  validate: function (text, pos, self) {
    const tail = text.slice(pos);
    if (!self.re.twitter) {
      self.re.twitter =  new RegExp(
        '^([a-zA-Z0-9_]){1,15}(?!_)(?=$|' + self.re.src_ZPCc + ')'
      );
    }
    if (self.re.twitter.test(tail)) {
      // Linkifier allows punctuation chars before prefix,
      // but we additionally disable `@` ("@@mention" is invalid)
      if (pos >= 2 && tail[pos - 2] === '@') {
        return false;
      }
      return tail.match(self.re.twitter)[0].length;
    }
    return 0;
  },
  normalize: function (match) {
    match.url = 'agent://' + match.url.replace(/^@/, '');
  }
});
