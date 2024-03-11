import Toast from "@ui5/webcomponents/dist/Toast";
import {html} from "lit";


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
export function toasty(title: string, icon = 'message-success', placement = "TopCenter", duration = 3500/*, extraHtml = ""*/) {
    const prevToasts = document.querySelectorAll("ui5-toast");
    console.log("prevToasts:", prevToasts.length);
    //for (const prevToast of prevToasts) { };
    prevToasts.forEach((prevToast) => {prevToast.remove()})
    //         ${extraHtml}
    const toastElem: Toast = Object.assign(document.createElement('ui5-toast'), {
        // id
        style: "background:red;",
        placement,
        duration,
        innerHTML: `
        <div style="display:flex;flex-direction: row; gap:10px;margin:0px; padding:0px;white-space: pre-wrap;">
            <ui5-icon name="${icon}"></ui5-icon>
            <strong>${escapeHtml(title)}</strong>
        </div>   
      `
    }) as unknown as Toast;

    document.body.append(toastElem);
    return toastElem.show();
}



/** */
export function escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}
