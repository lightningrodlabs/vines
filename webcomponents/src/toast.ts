import Toast from "@ui5/webcomponents/dist/Toast";
import {html, LitElement, render} from "lit";
import {JumpEvent} from "./events";


// /** */
// export function toastWarning(msg: string): void {
//     toasty("Warning", msg, "warning");
// }
//
//
// /** */
// export function toastError(msg: string): void {
//     toasty("Error", msg, "error");
// }


/** Emit toast notifications */
export function toasty(title: string, jumpEvent?: CustomEvent<JumpEvent>, parent?: LitElement/*, extraHtml = ""*/) {
    const placement = "TopCenter";
    const duration = 3500

    /** Delete previous toast elements */
    const prevToasts = document.querySelectorAll("ui5-toast");
    console.log("prevToasts:", prevToasts.length);
    prevToasts.forEach((prevToast) => {prevToast.remove()});

    /** Create toast element */
    const toastElem: Toast = Object.assign(document.createElement('ui5-toast'), {
        // id
        style: "background:red;",
        placement,
        duration,
    }) as unknown as Toast;

    /** Render innerHtml */
    const litHtml = html`
        <div style="display:flex; flex-direction:row; gap:10px; margin:0px; padding:0px; white-space:pre-wrap; cursor:pointer"
             @click=${(_e) => {
                //console.log("Toasty jump", jumpEvent, parent);
                if (jumpEvent && parent) parent.dispatchEvent(jumpEvent);
            }}>
            <strong>${escapeHtml(title)}</strong>
        </div>   
      `;
    render(litHtml, toastElem);

    /** Add to document */
    document.body.append(toastElem);
    return toastElem.show();
}



/** */
export function escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}
