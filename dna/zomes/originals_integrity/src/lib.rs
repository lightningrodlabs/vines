#![allow(non_upper_case_globals)]
#![allow(unused_doc_comments)]
#![allow(non_camel_case_types)]
#![allow(non_snake_case)]
#![allow(unused_attributes)]

use hdi::prelude::*;

///-------------------------------------------------------------------------------------------------
/// Threads Global consts
///-------------------------------------------------------------------------------------------------

/// DNA/Zome names
pub const ORIGINALS_DEFAULT_ROLE_NAME: &'static str = "rOriginals";
pub const ORIGINALS_DEFAULT_COORDINATOR_ZOME_NAME: &'static str = "zOriginals";
pub const ORIGINALS_DEFAULT_INTEGRITY_ZOME_NAME: &'static str = "originals_integrity";

/// ANCHOR NAMES
pub const ROOT_ANCHOR_ORIGNALS: &'static str = "__originals";



///-------------------------------------------------------------------------------------------------
/// Zome's entry types
///-------------------------------------------------------------------------------------------------

#[hdk_entry_defs]
#[unit_enum(OriginalsEntryTypes)]
pub enum OriginalsEntry {
    #[entry_def(required_validations = 3, visibility = "private")]
    Bogus(Bogus),
}

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Bogus {
    value: String,
}


///-------------------------------------------------------------------------------------------------
/// Zome's link types
///-------------------------------------------------------------------------------------------------

#[hdk_link_types]
#[derive(Serialize, Deserialize)]
pub enum OriginalsLinkType {
    OriginalPath,
    Original,
}
