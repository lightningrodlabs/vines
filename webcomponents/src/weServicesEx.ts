import {AppletInfo, HrlWithContext, WeNotification, WeServices} from "@lightningrodlabs/we-applet";
import {
  AppletHash,
  AttachableLocationAndInfo,
  AttachmentName,
  AttachmentType
} from "@lightningrodlabs/we-applet/dist/types";
import {stringifyHrl} from "@ddd-qc/we-utils";
import {ActionHash, DnaHash, DnaHashB64, encodeHashToBase64, EntryHash, EntryHashB64} from "@holochain/client";


/** WeServices wrapper that caches requested infos */
export class WeServicesEx implements WeServices {

  attachmentTypes: ReadonlyMap<AppletHash, Record<AttachmentName, AttachmentType>>;

  constructor(private _inner: WeServices) {
    this.attachmentTypes = _inner.attachmentTypes;
  }

  /** hrlStr -> AttachableLocationAndInfo */
  private _attachableInfoCache: Record<string, AttachableLocationAndInfo | undefined> = {};
  /** DnaHashB64 -> groupProfile */
  private _groupProfileCache: Record<string, any | undefined> = {};
  /** appletId -> AppletInfo */
  private _appletInfoCache: Record<string, AppletInfo | undefined> = {};


  /** -- Getters -- */


  getAttachableInfo(hrlc_or_str: HrlWithContext | string): AttachableLocationAndInfo | undefined {
    let hrlStr = hrlc_or_str as string;
    if (typeof hrlc_or_str == 'object') {
      hrlStr = stringifyHrl(hrlc_or_str.hrl);
    }
    return this._attachableInfoCache[hrlStr];
  }
  getAttachables(): string[] {
    return Object.keys(this._attachableInfoCache);
  }


  getGroupProfile(groupdId: DnaHash | DnaHashB64): any | undefined {
    let index = groupdId as DnaHashB64;
    if (typeof groupdId != 'string') {
      index = encodeHashToBase64(groupdId);
    }
    return this._groupProfileCache[index];
  }
  getGroupIds(): DnaHashB64[] {
    return Object.keys(this._groupProfileCache);
  }

  getAppletInfo(appletId: EntryHash | EntryHashB64): AppletInfo | undefined {
    let index = appletId as EntryHashB64;
    if (typeof appletId != 'string') {
      index = encodeHashToBase64(appletId);
    }
    return this._appletInfoCache[index];
  }
  getAppletIds(): EntryHashB64[] {
    return Object.keys(this._appletInfoCache);
  }


  /** -- Call & cache info  -- */

  /** */
  async attachableInfo(hrlc: HrlWithContext): Promise<AttachableLocationAndInfo | undefined> {
    const hrlStr = stringifyHrl(hrlc.hrl);
    if (this._attachableInfoCache[hrlStr]) {
      return this._attachableInfoCache[hrlStr];
    }
    this._attachableInfoCache[hrlStr] = await this._inner.attachableInfo(hrlc);
    return this._attachableInfoCache[hrlStr];
  }


  /** */
  async groupProfile(groupId: DnaHash): Promise<any> {
    const groupIdB64 = encodeHashToBase64(groupId);
    if (this._groupProfileCache[groupIdB64]) {
      return this._groupProfileCache[groupIdB64];
    }
    this._groupProfileCache[groupIdB64] = await this._inner.groupProfile(groupId);
    return this._groupProfileCache[groupIdB64];
  }


  /** */
  async appletInfo(appletHash: EntryHash): Promise<AppletInfo | undefined> {
    const appletId = encodeHashToBase64(appletHash);
    if (this._appletInfoCache[appletId]) {
      return this._appletInfoCache[appletId];
    }
    this._appletInfoCache[appletId] = await this._inner.appletInfo(appletHash);
    return this._appletInfoCache[appletId];
  }


  /** -- Passthrough  -- */

  async openAppletMain(appletHash: EntryHash): Promise<void> {return this._inner.openAppletMain(appletHash)}
  async openAppletBlock(appletHash: EntryHash, block: string, context: any): Promise<void> {return this._inner.openAppletBlock(appletHash, block, context)}
  async openCrossAppletMain(appletBundleId: ActionHash): Promise<void>  {return this._inner.openCrossAppletMain(appletBundleId)}
  async openCrossAppletBlock(appletHash: EntryHash, block: string, context: any): Promise<void>  {return this._inner.openCrossAppletBlock(appletHash, block, context)}
  async openHrl(hrlc: HrlWithContext): Promise<void>  {return this._inner.openHrl(hrlc)}
  async hrlToClipboard(hrlc: HrlWithContext): Promise<void>  {return this._inner.hrlToClipboard(hrlc)}
  async search(searchFilter: string): Promise<any>  {return this._inner.search(searchFilter)}
  async userSelectHrl(): Promise<HrlWithContext | undefined>  {return this._inner.userSelectHrl()}
  async notifyWe(notifications: Array<WeNotification>): Promise<any>  {return this._inner.notifyWe(notifications)}
  async userSelectScreen(): Promise<string>  {return this._inner.userSelectScreen()}




}
