import emoji from './emoji'
// @ts-ignore
import markdownit from "markdown-it";
// @ts-ignore
import markdownItMark from 'markdown-it-mark';
import markdownItHighlight from 'markdown-it-highlightjs';
// @ts-ignore
import StateCore from 'markdown-it/lib/rules_core/state_core';

export interface MentionOptions {
    getValidNames: () => string[];
}

// Linkify mentions of agent names (and special mentions)
// Should be called once by main HappElement
export function markdownItMentions(md: markdownit, options: MentionOptions) {
    const linkBuilder = ((name:any) => `agent://${name}`);

    // Escape regex special characters
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    function replaceMentions(state: StateCore) {
        // Get valid names at render time
        const validNames = options.getValidNames();
        const sortedNames = [...validNames].sort((a, b) => b.length - a.length);

        if (sortedNames.length === 0) return;

        const namePattern = sortedNames.map(escapeRegex).join('|');
        const mentionRegex = new RegExp(`(^|\\s)@(${namePattern})(?=\\s|$|[.,!?;:])`, 'gi');

        const blockTokens = state.tokens;

        for (let j = 0; j < blockTokens.length; j++) {
            if (blockTokens[j].type !== 'inline') continue;

            let tokens = blockTokens[j].children || [];
            const newTokens = [];

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];

                if (token.type !== 'text') {
                    newTokens.push(token);
                    continue;
                }

                const text = token.content;
                const matches: Array<{ start: number; end: number; name: string }> = [];

                let match;
                mentionRegex.lastIndex = 0;
                while ((match = mentionRegex.exec(text)) !== null) {
                    const startIndex = match.index + match[1]!.length;
                    matches.push({
                        start: startIndex,
                        end: startIndex + match[0].length - match[1]!.length,
                        name: match[2]!
                    });
                }

                if (matches.length === 0) {
                    newTokens.push(token);
                    continue;
                }

                // Split token into parts
                let lastPos = 0;

                for (const m of matches) {
                    // Text before mention
                    if (m.start > lastPos) {
                        const textToken = new state.Token('text', '', 0);
                        textToken.content = text.substring(lastPos, m.start);
                        newTokens.push(textToken);
                    }

                    // Link token
                    const linkOpen = new state.Token('link_open', 'a', 1);
                    linkOpen.attrs = [
                        ['href', linkBuilder(m.name)],
                        ['class', 'mention']
                    ];
                    newTokens.push(linkOpen);

                    const linkText = new state.Token('text', '', 0);
                    linkText.content = '@' + m.name;
                    newTokens.push(linkText);

                    const linkClose = new state.Token('link_close', 'a', -1);
                    newTokens.push(linkClose);

                    lastPos = m.end;
                }

                // Remaining text
                if (lastPos < text.length) {
                    const textToken = new state.Token('text', '', 0);
                    textToken.content = text.substring(lastPos);
                    newTokens.push(textToken);
                }
            }
            console.log("markdownIt newTokens()", newTokens);

            blockTokens[j].children = newTokens;
        }
    }

    md.core.ruler.after('linkify', 'mentions', replaceMentions);
}


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
    .set({fuzzyEmail: false})
    .add('we:', 'http:')
    .add('weave:', 'http:')
    .add('weave-0.12:', 'http:')
    .add('weave-0.13:', 'http:')
    .add('weave-0.14:', 'http:')
    .add('weave-0.15:', 'http:')
    // /** MENTION */
    // .add('@', {
    //     // @ts-ignore
    //     validate: function (text, pos, self) {
    //         const tail = text.slice(pos);
    //         if (!self.re.twitter) {
    //             self.re.twitter = new RegExp(
    //                 '^([a-zA-Z0-9_\-]){1,15}(?!_)(?=$|' + self.re.src_ZPCc + ')'
    //             );
    //         }
    //         if (self.re.twitter.test(tail)) {
    //             // Linkifier allows punctuation chars before prefix,
    //             // but we additionally disable `@` ("@@mention" is invalid)
    //             if (pos >= 2 && tail[pos - 2] === '@') {
    //                 return false;
    //             }
    //             return tail.match(self.re.twitter)[0].length;
    //         }
    //         return 0;
    //     },
    //     // @ts-ignore
    //     normalize: function (match) {
    //         match.url = 'agent://' + match.url.replace(/^@/, '');
    //     }
    // });


/* Customize the rendering of URLs */
// @ts-ignore
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const href = token.attrGet('href');
    const url = new URL(href);
    //console.log("link_open() url", url);
    const scheme = url.protocol;
    if (scheme == "we:" || scheme == "weave:" || scheme == "weave-0.12:" || scheme == "weave-0.13:" || scheme == "weave-0.14:" || scheme == "weave-0.15:") {
        try {
            //console.log("link_open() wal", href);
            return `<wurl-link wurl="${href}">`
        } catch (e: any) {
        }
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
md.renderer.rules.link_close = function (tokens, idx, options, env, self) {
    //console.log("md.rules.link_close:", tokens, idx)
    const link_open_token = tokens[idx - 2]; // brittle: link_open seems to always be 2 tokens behind.
    const href = link_open_token.attrGet('href');
    if (href) {
        const url = new URL(href);
        const scheme = url.protocol;
        if (scheme == "we:" || scheme == "weave:" || scheme == "weave-0.12:" || scheme == "weave-0.13:" || scheme == "weave-0.14:" || scheme == "weave-0.15:") {
            return "</wurl-link>";
        }
    }
    return '</a>';
};
