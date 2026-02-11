import * as locales from './generated/locales.js';

import * as templates_app_de from './generated/de.js';
import * as templates_app_es from './generated/es.js';
import * as templates_app_fr from './generated/fr.js';
import * as templates_app_it from './generated/it.js';
import * as templates_app_ja from './generated/ja.js';
import * as templates_app_pt from './generated/pt.js';
import * as templates_app_tr from './generated/tr.js';
import * as templates_app_nl from './generated/nl.js';

import {
    templates_webcomp_de, templates_webcomp_es, templates_webcomp_fr,
    templates_webcomp_it, templates_webcomp_ja,
    templates_webcomp_nl, templates_webcomp_pt, templates_webcomp_tr
} from '@vines/elements';

import {configureLocalization} from "@lit/localize";

/** Merge templates */
let templates_de: any = {templates: {...templates_app_de.templates, ...templates_webcomp_de.templates}};
let templates_es: any = {templates: {...templates_app_es.templates, ...templates_webcomp_es.templates}};
let templates_fr: any = {templates: {...templates_app_fr.templates, ...templates_webcomp_fr.templates}};
let templates_it: any = {templates: {...templates_app_it.templates, ...templates_webcomp_it.templates}};
let templates_ja: any = {templates: {...templates_app_ja.templates, ...templates_webcomp_ja.templates}};
let templates_pt: any = {templates: {...templates_app_pt.templates, ...templates_webcomp_pt.templates}};
let templates_tr: any = {templates: {...templates_app_tr.templates, ...templates_webcomp_tr.templates}};
let templates_nl: any = {templates: {...templates_app_nl.templates, ...templates_webcomp_nl.templates}};


/** Setup templates */
export const localizedTemplates = new Map([
    ['de', templates_de],
    ['es', templates_es],
    ['fr', templates_fr],
    ['it', templates_it],
    ['ja', templates_ja],
    ['nl', templates_nl],
    ['pt', templates_pt],
    ['tr', templates_tr],
]);


/** Do configuration */
export const {getLocale, setLocale} = configureLocalization({
  sourceLocale: locales.sourceLocale,
  targetLocales: locales.targetLocales,
  loadLocale: async (locale) => localizedTemplates.get(locale),
});
