import {
  CreatableName, CreatableType,
} from "@lightningrodlabs/we-applet";
import {wrapPathInSvg} from "@ddd-qc/we-utils";
import {mdiCommentTextMultiple} from "@mdi/js";

/** */
export const creatables: Record<CreatableName, CreatableType> = {
    // message: {
    //   label: "Message",
    //   icon_src: wrapPathInSvg(mdiComment),
    // },

    thread: {
      label: "Thread",
      icon_src: wrapPathInSvg(mdiCommentTextMultiple),
    }
};

