import {
  AppWebsocket,
} from "@holochain/client";
//import { msg } from "@lit/localize";

import {
  RenderInfo,
  WeaveServices,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";

import {AppletViewInfo, ProfilesApi} from "@ddd-qc/we-utils";
import {EntryId, ExternalAppProxy} from "@ddd-qc/cell-proxy/";
import {destructureCloneId, HCL} from "@ddd-qc/lit-happ";
import {VinesApp} from "@vines/app";


/** */
export async function createVinesApplet(
  renderInfo: RenderInfo,
  weServices: WeaveServices,
): Promise<VinesApp> {

  if (renderInfo.type =="cross-applet-view") {
    //const crossViewInfo = renderInfo as unknown as CrossViewInfo;
    throw Error("cross-applet-view not implemented by Vines");
  }

  const appletViewInfo = renderInfo as unknown as AppletViewInfo;
  console.log("createVinesApplet()         client", appletViewInfo.appletClient);
  console.log("createVinesApplet() thisAppletHash", appletViewInfo.appletHash);

  /** -- main AppWs -- */
  const mainAppWs = appletViewInfo.appletClient as AppWebsocket;

  /** -- main App ID -- */
  const mainAppInfo = await appletViewInfo.appletClient.appInfo();
  if (!mainAppInfo) {
    throw Promise.reject("Missing Main AppInfo");
  }
  console.log("createVinesApplet() mainAppInfo", mainAppInfo);
  const main_app_id = mainAppInfo.installed_app_id;

  /** -- ProfilesClient -- */
  const profilesClient = appletViewInfo.profilesClient;
  const profilesAppInfo = await profilesClient.client.appInfo();
  console.log("createVinesApplet() profilesAppInfo", profilesAppInfo, profilesClient.roleName);
  if (!profilesAppInfo) {
    throw Promise.reject("Missing Profiles AppInfo");
  }
  /* Check if roleName is actually a cloneId */
  let maybeCloneId = undefined;
  let profilesBaseRoleName = profilesClient.roleName;
  const maybeBaseRoleName = destructureCloneId(profilesClient.roleName);
  if (maybeBaseRoleName) {
    profilesBaseRoleName = maybeBaseRoleName[0];
    maybeCloneId = profilesClient.roleName;
  }
  const profilesHcl = new HCL(profilesAppInfo.installed_app_id, profilesBaseRoleName, maybeCloneId);
  /* Create profilesCellProxy */
  const profilesApi = new ProfilesApi(profilesClient);
  const profilesAppProxy = new ExternalAppProxy(profilesApi, 10 * 1000);
  await profilesAppProxy.fetchCells(profilesAppInfo.installed_app_id, profilesBaseRoleName);
  const profilesCellProxy = await profilesAppProxy.createCellProxy(profilesHcl);
  console.log("createVinesApplet() profilesCellProxy", profilesCellProxy);

  /** -- Create VinesApp -- */
  const app = await VinesApp.fromWe(
      mainAppWs, undefined, main_app_id,
      profilesHcl, profilesAppProxy,
      weServices,
      new EntryId(appletViewInfo.appletHash),
      appletViewInfo.view,
      );
  /** Done */
  return app;
}
