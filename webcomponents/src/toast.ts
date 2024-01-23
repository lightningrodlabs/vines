import Toast from "@ui5/webcomponents/dist/Toast";


/** */
export function toastWarning(msg: string): void {
    toasty("Warning", msg);
}


/** */
export function toastError(msg: string): void {
    toasty("Error", msg);
}


/** Emit toast notifications */
export function toasty(title: string, message: string, placement = "TopCenter", duration = 2000, extraHtml = "", id?) {
    const toastElem: Toast = Object.assign(document.createElement('ui5-toast'), {
        id,
        placement,
        duration,
        innerHTML: `
        <strong>${escapeHtml(title)}</strong><br />
        ${escapeHtml(message)}
        ${extraHtml}
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
