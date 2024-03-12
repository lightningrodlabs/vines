import {
  AppAgentClient, RoleName, ZomeName
} from "@holochain/client";
import {HrlWithContext} from "@lightningrodlabs/we-applet/dist/types";


/** */
export async function bindAsset(
  appletClient: AppAgentClient,
  srcWal: HrlWithContext,
  dstWal: HrlWithContext,
  dstRoleName: RoleName,
  dstIntegrityZomeName: ZomeName,
  dstEntryType: string,
): Promise<void> {

}
