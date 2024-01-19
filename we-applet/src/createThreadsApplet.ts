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
import {ThreadsApp} from "@threads/app";


/** */
export async function createThreadsApplet(
  renderInfo: RenderInfo,
  weServices: WeServices,
): Promise<ThreadsApp> {

  if (renderInfo.type =="cross-applet-view") {
    throw Error("cross-applet-view not implemented by Threads");
  }

  const appletViewInfo = renderInfo as unknown as AppletViewInfo;

  console.log("createThreadsApplet()         client", appletViewInfo.appletClient);
  console.log("createThreadsApplet() thisAppletHash", appletViewInfo.appletHash);
  console.log("createThreadsApplet()   thisAppletId", encodeHashToBase64(appletViewInfo.appletHash));

  const profilesClient = appletViewInfo.profilesClient;
  const mainAppInfo = await appletViewInfo.appletClient.appInfo();

  /** Determine profilesAppInfo */
  const mainAppAgentWs = appletViewInfo.appletClient as AppAgentWebsocket;
  const mainAppWs = mainAppAgentWs.appWebsocket;
  let profilesAppInfo = await profilesClient.client.appInfo();
  console.log("createThreadsApplet() mainAppInfo", mainAppInfo);
  console.log("createThreadsApplet() profilesAppInfo", profilesAppInfo, profilesClient.roleName);

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
  console.log("createThreadsApplet() profilesCellProxy", profilesCellProxy);

  /** Create ThreadsApp */
  const app = await ThreadsApp.fromWe(
      mainAppWs, undefined, false, mainAppInfo.installed_app_id,
      profilesAppInfo.installed_app_id, baseRoleName, maybeCloneId, profilesClient.zomeName, profilesAppProxy,
      weServices,
      encodeHashToBase64(appletViewInfo.appletHash),
      appletViewInfo.view,
      );
  /** Done */
  return app;
}
