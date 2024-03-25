import emoji from './emoji'
import markdownit from "markdown-it";
import markdownItMark from 'markdown-it-mark';
import markdownItHighlight from 'markdown-it-highlightjs';
//import hljs from 'highlight.js'
//import 'highlight.js/styles/github.css';

/** */
export const md = markdownit({
  linkify: true,
  //breaks: true,
  // highlight: function (str, lang) {
  //   if (lang && hljs.getLanguage(lang)) {
  //     try {
  //       return hljs.highlight(str, { language: lang }).value;
  //     } catch (__) {}
  //   }
  //
  //   return ''; // use external default escaping
  // }
});
md.use(markdownItHighlight)
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
