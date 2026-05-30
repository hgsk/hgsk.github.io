const COMPONENT_TAG = "punch-line";

class PunchLine extends HTMLElement {
  connectedCallback() {
    this.setAttribute("role", "text");
  }
}

if (!customElements.get(COMPONENT_TAG)) {
  customElements.define(COMPONENT_TAG, PunchLine);
}
