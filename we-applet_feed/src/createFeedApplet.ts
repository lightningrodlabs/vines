import {
  AppAgentWebsocket, encodeHashToBase64,
} from "@holochain/client";
//import { msg } from "@lit/localize";

import {
  RenderInfo,
  WeServices,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";

import {AppletViewInfo, ProfilesApi} from "@ddd-qc/we-utils";
import {ExternalAppProxy} from "@ddd-qc/cell-proxy/";
import {destructureCloneId, HCL} from "@ddd-qc/lit-happ";
import {CommunityFeedApp} from "@communityfeed/app";


/** */
export async function createFeedApplet(
  renderInfo: RenderInfo,
  weServices: WeServices,
): Promise<CommunityFeedApp> {

  if (renderInfo.type =="cross-applet-view") {
    throw Error("cross-applet-view not implemented by Vines");
  }

  const appletViewInfo = renderInfo as unknown as AppletViewInfo;

  console.log("createFeedApplet()         client", appletViewInfo.appletClient);
  console.log("createFeedApplet() thisAppletHash", appletViewInfo.appletHash);
  console.log("createFeedApplet()   thisAppletId", encodeHashToBase64(appletViewInfo.appletHash));

  const profilesClient = appletViewInfo.profilesClient;
  const mainAppInfo = await appletViewInfo.appletClient.appInfo();

  /** Determine profilesAppInfo */
  const mainAppAgentWs = appletViewInfo.appletClient as AppAgentWebsocket;
  const mainAppWs = mainAppAgentWs.appWebsocket;
  let profilesAppInfo = await profilesClient.client.appInfo();
  console.log("createFeedApplet() mainAppInfo", mainAppInfo);
  console.log("createFeedApplet() profilesAppInfo", profilesAppInfo, profilesClient.roleName);

  /** Check if roleName is actually a cloneId */
  let maybeCloneId = undefined;
  let baseRoleName = profilesClient.roleName;
  const maybeBaseRoleName = destructureCloneId(profilesClient.roleName);
  if (maybeBaseRoleName) {
    baseRoleName = maybeBaseRoleName[0];
    maybeCloneId = profilesClient.roleName;
  }

  /** Determine profilesCellProxy */
  const hcl = new HCL(profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId);
  const profilesApi = new ProfilesApi(profilesClient);
  const profilesAppProxy = new ExternalAppProxy(profilesApi, 10 * 1000);
  await profilesAppProxy.fetchCells(profilesAppInfo.installed_app_id, baseRoleName);
  const profilesCellProxy = await profilesAppProxy.createCellProxy(hcl);
  console.log("createFeedApplet() profilesCellProxy", profilesCellProxy);

  /** Create ThreadsApp */
  const app = await CommunityFeedApp.fromWe(
      mainAppWs, undefined, false, mainAppInfo.installed_app_id,
      profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId, profilesClient.zomeName, profilesAppProxy,
      weServices,
      encodeHashToBase64(appletViewInfo.appletHash),
      appletViewInfo.view,
      );
  /** Done */
  return app;
}
