/** -- HC_APP_PORT & friends -- */
import {DEFAULT_THREADS_DEF} from "./happDef";


export let HC_APP_PORT: number;
export let HC_ADMIN_PORT: number;
try {
  HC_APP_PORT = Number(process.env.HC_APP_PORT);
  HC_ADMIN_PORT = Number(process.env.HC_ADMIN_PORT);
} catch (e) {
  console.log("HC_APP_PORT not defined")
}

export let ALLOW_WE = true;
try {
  ALLOW_WE = !Boolean(process.env.NO_WE);
} catch (e) {
  console.log("NO_WE not defined")
}

console.log("     ALLOW_WE =", ALLOW_WE)
console.log("      HAPP_ID =", DEFAULT_THREADS_DEF.id)
console.log("  HC_APP_PORT =", HC_APP_PORT);
console.log("HC_ADMIN_PORT =", HC_ADMIN_PORT);
