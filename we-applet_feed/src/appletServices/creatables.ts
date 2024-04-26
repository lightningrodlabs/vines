import {
  CreatableName, CreatableType,
} from "@lightningrodlabs/we-applet";
import {wrapPathInSvg} from "@ddd-qc/we-utils";
import {mdiPost} from "@mdi/js";


/** */
export const creatables: Record<CreatableName, CreatableType> = {
    // message: {
    //   label: "Message",
    //   icon_src: wrapPathInSvg(mdiComment),
    // },

    post: {
      label: "Post",
      icon_src: wrapPathInSvg(mdiPost),
    }
};

