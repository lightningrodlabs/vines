import emoji from './emoji'
// @ts-ignore
import markdownit from "markdown-it";
// @ts-ignore
import markdownItMark from 'markdown-it-mark';
import markdownItHighlight from 'markdown-it-highlightjs';


/** */
export const md = markdownit({
  linkify: true,
  //breaks: true,
});


/** Plugins */
md.use(markdownItHighlight);
md.use(markdownItMark);
md.use(emoji);


/** Links */
md.linkify
  .set({fuzzyEmail: false })
  .add('we:', 'http:')
  .add('weave:', 'http:')
  .add('weave-0.12:', 'http:')
  .add('weave-0.13:', 'http:')
  /** MENTION */
  .add('@', {
    // @ts-ignore
    validate: function (text, pos, self) {
      const tail = text.slice(pos);
      if (!self.re.twitter) {
        self.re.twitter =  new RegExp(
          '^([a-zA-Z0-9_\-]){1,15}(?!_)(?=$|' + self.re.src_ZPCc + ')'
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
    // @ts-ignore
    normalize: function (match) {
      match.url = 'agent://' + match.url.replace(/^@/, '');
    }
  });


/* Customize the rendering of URLs */
// @ts-ignore
md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
  const token = tokens[idx];
  const href = token.attrGet('href');
  const url = new URL(href);
  //console.log("link_open() url", url);
  const scheme = url.protocol;
  if (scheme == "we:" || scheme == "weave:" || scheme == "weave-0.12:" || scheme == "weave-0.13:") {
    try {
      //console.log("link_open() wal", href);
      return `<wurl-link wurl="${href}">`
    } catch(e:any) {}
  }
  let classes = ""
  if (scheme == "agent:") {
    classes += "mention"
  }
  return `<a href="${href}" class="${classes}" target="_blank">`;
};

// md.renderer.rules.text = function(tokens, idx, options, env, self) {
//   console.log("md.rule args:", tokens, idx)
//   return "";
// }

// @ts-ignore
md.renderer.rules.link_close = function(tokens, idx, options, env, self) {
  //console.log("md.rules.link_close:", tokens, idx)
  const link_open_token = tokens[idx - 2]; // brittle: link_open seems to always be 2 tokens behind.
  const href = link_open_token.attrGet('href');
  if (href) {
    const url = new URL(href);
    const scheme = url.protocol;
    if (scheme == "we:" || scheme == "weave:" || scheme == "weave-0.12:" || scheme == "weave-0.13:") {
      return "</wurl-link>";
    }
  }
  return '</a>';
};
