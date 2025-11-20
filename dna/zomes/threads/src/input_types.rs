use hdk::prelude::*;

///
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GetAhInput {
   pub ah: ActionHash,
   pub strategy: GetStrategy,
}

///
#[derive(Serialize, Deserialize, SerializedBytes, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GetManyAhInput {
   pub ahs: Vec<ActionHash>,
   pub strategy: GetStrategy,
}