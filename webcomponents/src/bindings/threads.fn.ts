/* This file is generated by zits. Do not edit manually */

import {ZomeName, FunctionName} from '@holochain/client';


/** Array of all zome function names in "threads" */
export const threadsFunctionNames: FunctionName[] = [
	"entry_defs", 
	"get_zome_info", 
	"get_dna_info",
	"add_any_bead",
	"get_any_bead_option",
	"get_any_bead",
	"get_many_any_beads",
	"query_any_beads",
	"add_reaction",
	"remove_reaction",
	"get_reactions",
	"add_entry_bead",
	"add_entry_as_bead",
	"create_entry_bead",
	"get_entry_bead_option",
	"get_entry_bead",
	"get_many_entry_beads",
	"query_entry_beads",
	"get_all_beads",
	"get_latest_beads",
	"add_text_bead",
	"get_text_bead_option",
	"get_text_bead",
	"get_many_text_bead",
	"query_text_beads",
	"add_text_bead_at",
	"add_many_text_bead_at",
	"add_text_bead_at_and_notify",


	"create_dm_thread",
	"decrypt_my_bead",
	"decrypt_bead",
	"encrypt_bead",
	"add_enc_bead",
	"get_enc_bead_option",
	"get_enc_bead",
	"get_many_enc_beads",
	"query_enc_beads",
	"get_dm_threads",
	"set_favorite",
	"unset_favorite",
	"get_my_favorites",
	"get_latest_items",
	"get_global_log",
	"commit_global_log",
	"query_global_log",
	"probe_all_latest",
	"probe_all_between",
	"get_thread_log",
	"commit_thread_log",
	"query_thread_logs",


	"get_record_author",
	"get_data_type",
	"send_inbox_item",
	"probe_inbox",
	"delete_inbox_item",
	"set_notify_setting",
	"get_my_notify_settings",
	"get_notify_settings",
	"get_pp_notify_settings",
	"create_participation_protocol",
	"get_pps_from_subject_hash",
	"get_pps_from_subject_anchor",
	"query_pps",
	"get_pp",
	"create_semantic_topic",
	"get_all_semantic_topics",
	"search_semantic_topics",
	"get_topic",
	"query_semantic_topics",
	"update_semantic_topic",
	"broadcast_gossip",
	"emit_notification",
	"get_all_subjects",
	"get_applets",
	"get_subjects_by_type",
	"get_subjects_for_applet",
	"get_subject_types_for_applet",
	"get_hide_link",
	"hide_subject",
	"unhide_subject",
	"get_hidden_subjects",];


/** Generate tuple array of function names with given zomeName */
export function generateThreadsZomeFunctionsArray(zomeName: ZomeName): [ZomeName, FunctionName][] {
   const fns: [ZomeName, FunctionName][] = [];
   for (const fn of threadsFunctionNames) {
      fns.push([zomeName, fn]);
   }
   return fns;
}


/** Tuple array of all zome function names with default zome name "zThreads" */
export const threadsZomeFunctions: [ZomeName, FunctionName][] = generateThreadsZomeFunctionsArray("zThreads");
