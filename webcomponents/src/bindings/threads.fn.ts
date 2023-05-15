/* This file is generated by zits. Do not edit manually */

import {ZomeName, FunctionName} from '@holochain/client';


/** Array of all zome function names in "threads" */
export const threadsFunctionNames: FunctionName[] = [
	"entry_defs", 
	"get_zome_info", 
	"get_dna_info",
	"get_all_beads",
	"get_latest_beads",
	"query_text_messages",
	"get_text_message",
	"get_many_text_message",
	"add_text_message",
	"add_text_message_at",
	"add_many_text_message_at",
	"get_global_log",
	"commit_global_log",
	"query_global_log",
	"probe_all_latest",
	"get_thread_log",
	"commit_thread_log",
	"query_thread_logs",


	"create_participation_protocol",
	"create_pp_from_semantic_topic",
	"get_pps_from_subject_hash",
	"get_pps_from_subject_anchor",
	"query_pps",
	"get_pp",
	"get_all_root_anchors",
	"get_items",
	"get_all_items",
	"get_all_items_from_b64",
	"get_leaf_anchors",
	"get_typed_anchor",
	"get_typed_children",
	"create_semantic_topic",
	"get_all_semantic_topics",
	"search_semantic_topics",
	"get_topic",
	"query_semantic_topics",

	"notify_peers",
	"get_all_subjects",
	"get_subjects_by_type",
	"get_subjects_for_dna",
	"get_latest_items",];


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
