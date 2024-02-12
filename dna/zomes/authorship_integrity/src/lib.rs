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
pub const AUTHORSHIP_DEFAULT_ROLE_NAME: &'static str = "rAuthorship";
pub const AUTHORSHIP_DEFAULT_COORDINATOR_ZOME_NAME: &'static str = "zAuthorship";
pub const AUTHORSHIP_DEFAULT_INTEGRITY_ZOME_NAME: &'static str = "authorship_integrity";

/// ANCHOR NAMES
pub const ROOT_ANCHOR_AUTHORSHIP: &'static str = "__authorship";
pub const ROOT_ANCHOR_UNKNOWN_AUTHOR: &'static str = "__unknown_author";


///-------------------------------------------------------------------------------------------------
/// Zome's entry types
///-------------------------------------------------------------------------------------------------

#[hdk_entry_defs]
#[unit_enum(AuthorshipEntryTypes)]
pub enum AuthorshipEntry {
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
pub enum AuthorshipLinkType {
    AuthorshipPath,
    Target,
    Author,
}
