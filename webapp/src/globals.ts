/** -- HC_APP_PORT & friends -- */
import {DEFAULT_THREADS_DEF} from "./happDef";
import {HappBuildModeType} from "@ddd-qc/lit-happ";
import {HAPP_BUILD_MODE} from "@ddd-qc/lit-happ/dist/globals";


export let HC_APP_PORT: number;
export let HC_ADMIN_PORT: number;
try {
  HC_APP_PORT = Number(process.env.HC_APP_PORT);
  HC_ADMIN_PORT = Number(process.env.HC_ADMIN_PORT);
} catch (e) {
  console.log("HC_APP_PORT not defined")
}

console.log("      HAPP_ID =", DEFAULT_THREADS_DEF.id)
console.log("  HC_APP_PORT =", HC_APP_PORT);
console.log("HC_ADMIN_PORT =", HC_ADMIN_PORT);

/** Remove console.log() in Retail */
if (HAPP_BUILD_MODE === HappBuildModeType.Retail) {
  console.log("console.log() disabled");
  console.log = () => {};
}
