/* This file is generated by zits. Do not edit manually */

import {ZomeName, FunctionName} from '@holochain/client';


/** Array of all zome function names in "originals" */
export const originalsFunctionNames: FunctionName[] = [
	"entry_defs", 
	"get_zome_info", 
	"get_dna_info",


	"create_original_link",
	"create_original_link_from_app_entry",
	"get_types",
	"get_all_originals",
	"get_children_for_type",];


/** Generate tuple array of function names with given zomeName */
export function generateOriginalsZomeFunctionsArray(zomeName: ZomeName): [ZomeName, FunctionName][] {
   const fns: [ZomeName, FunctionName][] = [];
   for (const fn of originalsFunctionNames) {
      fns.push([zomeName, fn]);
   }
   return fns;
}


/** Tuple array of all zome function names with default zome name "zOriginals" */
export const originalsZomeFunctions: [ZomeName, FunctionName][] = generateOriginalsZomeFunctionsArray("zOriginals");
