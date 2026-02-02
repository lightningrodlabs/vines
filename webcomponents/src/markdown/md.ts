import emoji from './emoji'
// @ts-ignore
import markdownit from "markdown-it";
// @ts-ignore
import markdownItMark from 'markdown-it-mark';
import markdownItHighlight from 'markdown-it-highlightjs';
// @ts-ignore
import StateCore from 'markdown-it/lib/rules_core/state_core';
import {AgentPubKeyB64} from "@holochain/client";

export interface MentionOptions {
    getValidNames: () => string[];
    getAgentKey:(name:string) => AgentPubKeyB64;
}

// Linkify mentions of agent names (and special mentions).
// Should be called once by the main HappElement.
export function markdownItMentions(md: markdownit, options: MentionOptions) {
    const linkBuilder = ((name:string) => {
        //const final = name.replace(/[\\s]/g, '-');
        const final = options.getAgentKey(name);
        return `agent://${final}`;
    });

    function replaceMentions(state: StateCore) {
        // Get valid names at render time
        const validNames = options.getValidNames();
        const sortedNames = [...validNames].sort((a, b) => b.length - a.length);

        if (sortedNames.length === 0) return;

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

                // Check each name individually
                for (const name of sortedNames) {
                    // Escape special regex characters but keep spaces as \s to match any whitespace
                    //const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
                    //const mentionRegex = new RegExp(`(^|\\s)@${escapedName}(?=\\s|$|[.,!?;:])`, 'gi');

                    const mentionRegex = new RegExp(`(^|\\s)@${name}(?=\\s|$|[.,!?;:])`, 'gi');

                    let match;
                    while ((match = mentionRegex.exec(text)) !== null) {
                        const startIndex = match.index + match[1]!.length;
                        const endIndex = startIndex + match[0].length - match[1]!.length;

                        // Check for overlaps with existing matches
                        const overlaps = matches.some(
                            m => (startIndex >= m.start && startIndex < m.end) ||
                                (endIndex > m.start && endIndex <= m.end)
                        );

                        if (!overlaps) {
                            matches.push({
                                start: startIndex,
                                end: endIndex,
                                name: name
                            });
                        }
                    }
                }

                if (matches.length === 0) {
                    newTokens.push(token);
                    continue;
                }

                // Sort matches by position
                matches.sort((a, b) => a.start - b.start);

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
            //console.log("markdownIt newTokens()", newTokens);

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
        // else if (scheme == "agent:") {
        //     console.log("link_close() agent:", href);
        // }
    }
    return '</a>';
};
