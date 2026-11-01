/** Focus helpers that see through shadow roots. */


/** The element that actually has focus, following activeElement into open shadow roots. */
export function deepActiveElement(root: DocumentOrShadowRoot = document): Element | null {
  let active = root.activeElement;
  while (active && active.shadowRoot && active.shadowRoot.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}


const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);


/** True when the user is typing in an editable element that is not `own` or inside it
 *  (light or shadow DOM). Used before stealing focus back to a default input. */
export function isTypingElsewhere(own: Element | null | undefined): boolean {
  const active = deepActiveElement();
  if (!active || active === document.body) {
    return false;
  }
  if (own && (active === own || own.contains(active) || (own.shadowRoot?.contains(active) ?? false))) {
    return false;
  }
  return EDITABLE_TAGS.has(active.tagName) || (active as HTMLElement).isContentEditable === true;
}
