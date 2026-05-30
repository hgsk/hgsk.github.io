const COMPONENT_TAG = "punch-line";

class PunchLine extends HTMLElement {
  private cleanupTimeout?: number;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: inline-block;
        cursor: pointer;
        transition: transform 0.1s ease-in-out;
        transform: scale(1);
      }
      :host(.active) {
        transform: scale(1.08);
      }
    `;
    const slot = document.createElement("slot");
    shadow.appendChild(style);
    shadow.appendChild(slot);
  }

  connectedCallback() {
    this.setAttribute("role", "text");
    this.addEventListener("click", this.handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
    if (this.cleanupTimeout) clearTimeout(this.cleanupTimeout);
  }

  private handleClick = () => {
    window.dispatchEvent(new CustomEvent("punchline:celebrate"));
    this.classList.add("active");
    if (this.cleanupTimeout) clearTimeout(this.cleanupTimeout);
    this.cleanupTimeout = window.setTimeout(() => {
      this.classList.remove("active");
    }, 100);
  };
}

if (!customElements.get(COMPONENT_TAG)) {
  customElements.define(COMPONENT_TAG, PunchLine);
}
