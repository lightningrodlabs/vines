import {
  AppClient, RoleName, ZomeName
} from "@holochain/client";
import {RecordInfo, WAL} from "@lightningrodlabs/we-applet/dist/types";


/** */
export async function bindAsset(
  appletClient: AppClient,
  srcWal: WAL,
  dstWal: WAL,
  dstRecordInfo?: RecordInfo,
): Promise<void> {

}
