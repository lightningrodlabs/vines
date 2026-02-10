import * as locales from './generated/locales.js';
import * as templates_app_fr from './generated/fr.js';
import {templates_webcomp_fr} from '@vines/elements';
import {configureLocalization} from "@lit/localize";

/** Merge templates */
let templates_fr: any = {templates: {...templates_app_fr.templates, ...templates_webcomp_fr.templates}};
//let templates: any = templates_fr_fr!;

//console.log({templates_app_fr})
//console.log({configureLocalization})
//console.log({templates_fr})

/** Setup templates */
export const localizedTemplates = new Map([
  ['fr', templates_fr],
]);


/** Do configuration */
export const {getLocale, setLocale} = configureLocalization({
  sourceLocale: locales.sourceLocale,
  targetLocales: locales.targetLocales,
  loadLocale: async (locale) => localizedTemplates.get(locale),
});
