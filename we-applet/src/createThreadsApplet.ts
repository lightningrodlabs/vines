import {
  AppAgentClient,
  AppAgentWebsocket,
  EntryHash
} from "@holochain/client";
//import { msg } from "@lit/localize";

import {
  WeServices,
} from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@lightningrodlabs/we-applet/dist/elements/we-client-context.js";
import "@lightningrodlabs/we-applet/dist/elements/hrl-link.js";

import {ProfilesClient} from "@holochain-open-dev/profiles";
import {ProfilesApi} from "../profilesApi";
import {ExternalAppProxy} from "@ddd-qc/cell-proxy/";
import {destructureCloneId, HCL} from "@ddd-qc/lit-happ";
import {ThreadsApp} from "@threads/app";


/** */
export async function createThreadsApplet(
  client: AppAgentClient,
  thisAppletHash: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices,
  showCommentThreadOnly?: boolean,
): Promise<ThreadsApp> {

  console.log("createThreadsApplet() client", client);
  console.log("createThreadsApplet() thisAppletId", thisAppletHash);

  const mainAppInfo = await client.appInfo();

  /** Determine profilesAppInfo */
  const mainAppAgentWs = client as AppAgentWebsocket;
  const mainAppWs = mainAppAgentWs.appWebsocket;
  // const mainAppWs = client as unknown as AppWebsocket;
  // const mainAppInfo = await mainAppWs.appInfo({installed_app_id: 'threads-applet'});
  console.log("createThreadsApplet() mainAppInfo", mainAppInfo);
  //const profilesAppAgentClient: AppAgentClient = profilesClient.client;
  let profilesAppInfo = await profilesClient.client.appInfo();
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
      weServices, thisAppletHash, showCommentThreadOnly);
  /** Done */
  return app;
}
