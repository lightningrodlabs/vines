import {
  AppWebsocket,
} from "@holochain/client";
//import { msg } from "@lit/localize";

import {
  RenderInfo,
  WeaveServices,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";

import {AppletViewInfo, ProfilesApi, CrossViewInfo} from "@ddd-qc/we-utils";
import {EntryId, ExternalAppProxy} from "@ddd-qc/cell-proxy/";
import {destructureCloneId, HCL} from "@ddd-qc/lit-happ";
import {AppletGroup, VinesApp} from "@vines/app";
import {ProfilesClient} from "@holochain-open-dev/profiles";
import {LitElement} from "lit";


/** */
export async function createVinesApplet(renderInfo: RenderInfo, weServices: WeaveServices): Promise<LitElement> {
  console.log("createVinesApplet() type:", renderInfo.type);
  let appletGroups: AppletGroup[] = [];
  /** cross-applet-view */
  if (renderInfo.type == "cross-applet-view") {
    const crossViewInfo = renderInfo as unknown as CrossViewInfo;
    //throw Error("cross-applet-view not implemented by Vines");
    console.log("createVinesApplet()         crossViewInfo", crossViewInfo);
    for (const [appletHash, appletClients] of crossViewInfo.applets.entries()) {
      const appWs = appletClients.appletClient as AppWebsocket;
      const [profilesHcl, profilesAppProxy] = await createProfilesCellProxy(appletClients.profilesClient);
      const appletGroup: AppletGroup = {
        appWs,
        appId: await getAppId(appWs),
        appletId: new EntryId(appletHash),
        profilesHcl,
        profilesAppProxy,
        appletView: crossViewInfo.view,
      }
      appletGroups.push(appletGroup);
    }
  } else {
    /** applet-view */
    const appletViewInfo = renderInfo as unknown as AppletViewInfo;
    console.log("createVinesApplet()         client", appletViewInfo.appletClient);
    console.log("createVinesApplet() thisAppletHash", appletViewInfo.appletHash);

    const appWs = appletViewInfo.appletClient as AppWebsocket;
    const [profilesHcl, profilesAppProxy] = await createProfilesCellProxy(appletViewInfo.profilesClient);

    const appletGroup: AppletGroup = {
      appWs,
      appId: await getAppId(appWs),
      appletId: new EntryId(appletViewInfo.appletHash),
      profilesHcl,
      profilesAppProxy,
      appletView: appletViewInfo.view,
    }
    appletGroups = [appletGroup];
  }

  /** -- Create VinesApp -- */
  const app = await VinesApp.fromWe(weServices, undefined, renderInfo.type == "cross-applet-view", appletGroups);
  return app;
}


/** -- main App ID -- */
export async function getAppId(appWs: AppWebsocket) {
  const mainAppInfo = await appWs.appInfo();
  if (!mainAppInfo) {
    throw Promise.reject("Missing Main AppInfo");
  }
  console.log("createVinesApplet() mainAppInfo", mainAppInfo);
  return mainAppInfo.installed_app_id;
}



/** */
export async function createProfilesCellProxy(profilesClient: ProfilesClient): Promise<[HCL, ExternalAppProxy]> {
  /** -- ProfilesClient -- */
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

  return [profilesHcl, profilesAppProxy];
}

