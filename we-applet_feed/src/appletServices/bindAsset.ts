import {
  AppAgentClient, RoleName, ZomeName
} from "@holochain/client";
import {WAL} from "@lightningrodlabs/we-applet/dist/types";


/** */
export async function bindAsset(
  appletClient: AppAgentClient,
  srcWal: WAL,
  dstWal: WAL,
  dstRoleName: RoleName,
  dstIntegrityZomeName: ZomeName,
  dstEntryType: string,
): Promise<void> {

}
