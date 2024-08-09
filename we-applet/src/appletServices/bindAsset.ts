import {
  AppClient,
} from "@holochain/client";
import {RecordInfo, WAL} from "@lightningrodlabs/we-applet/dist/types";


/** */
export async function bindAsset(
  _appletClient: AppClient,
  _srcWal: WAL,
  _dstWal: WAL,
  _dstRecordInfo?: RecordInfo,
): Promise<void> {

}
