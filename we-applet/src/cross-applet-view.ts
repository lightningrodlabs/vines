import {AppAgentClient, EntryHash} from "@holochain/client";
import {ProfilesClient} from "@holochain-open-dev/profiles";
import {CrossAppletViews, WeServices} from "@lightningrodlabs/we-applet";
import {html, render} from "lit";


/** */
export async function crossAppletViews(
  applets: ReadonlyMap<EntryHash, { profilesClient: ProfilesClient; appletClient: AppAgentClient }>, // Segmented by groupId
  weServices: WeServices,
): Promise<CrossAppletViews> {
  // .store=${new ProfilesStore(applets[random].profilesClient)}
  return {
    main: (element) =>
      render(
        html`
          <we-services-context .services=${weServices}>
            <!-- <profiles-context> -->
              <cross-applet-main .applets=${applets}></cross-applet-main>
            <!-- </profiles-context> -->
          </we-services-context>
        `,
        element
      ),
    blocks: {},
  };
}
