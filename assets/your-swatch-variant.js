// Avoid redefining or re-registering in development or with AJAX loads
if (!window.SwatchVariantInitialized) {
  class SwatchVariant extends HTMLElement {
    connectedCallback() {
      // Prevent re-initializing the same element twice
      if (this.initialized) return;
      this.initialized = true;

      // Log for debug purposes
    //   console.log("SwatchVariant initialized for product:", this.dataset.productId);

      // Extract and parse dataset
      this.variants = JSON.parse(this.dataset.variants || "[]");
      this.productId = this.dataset.productId;
      this.defaultId = this.dataset.defaultId;

      // Locate card DOM context
      this.card = this.closest(".product-card-wrapper");
      if (!this.card) return;

      this.priceContainer = this.card.querySelector(".price__container");
      this.imageTag = this.card.querySelector(".card__media img");

      // Set up swatch buttons
      this.querySelectorAll(".swatch-button").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();

          const selectedColor = button.dataset.color;

          // Match variant by sanitized color name
          const variant = this.variants.find((v) =>
            v.option.toLowerCase().replace(/\s+/g, "-") === selectedColor
          );

          if (!variant) return;

          // Update product image if available
          if (variant.image && this.imageTag) {
            this.imageTag.src = variant.image;
            this.imageTag.srcset = `${variant.image} 1x`;
          }

          // Update price display
          if (this.priceContainer) {
            this.priceContainer.innerHTML = `
              <div class="price__regular">
                <span class="visually-hidden visually-hidden--inline">Regular price</span>
                <span class="price-item price-item--regular">
                  ${variant.compare_at_price || variant.price}
                </span>
              </div>
              ${
                variant.compare_at_price
                  ? `<div class="price__sale">
                      <span class="visually-hidden visually-hidden--inline">Sale price</span>
                      <span class="price-item price-item--sale price-item--last">${variant.price}</span>
                    </div>`
                  : ""
              }
            `;
          }

          //Visual feedback (mark active swatch)
          this.querySelectorAll(".swatch-button").forEach((btn) =>
            btn.classList.remove("active")
          );
          button.classList.add("active");

        //   console.log("Swatch clicked:", selectedColor);
        //   console.log("Variant selected:", variant);
        });
      });
    }
  }

  // Register the custom element only once
  if (!customElements.get("swatch-variant")) {
    customElements.define("swatch-variant", SwatchVariant);
  }

  // Global flag to avoid redefinition
  window.SwatchVariantInitialized = true;
}

//Product Card Click Logic (outside component)
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".product-card-wrapper").forEach((card) => {
    card.addEventListener("click", (event) => {
      // Don't redirect if a swatch button was clicked
      if (event.target.closest(".swatch-button")) {
        event.stopPropagation();
        return;
      }

      const link = card.querySelector("a.full-unstyled-link");
      if (link) window.location.href = link.href;
    });
  });

  // Manually initialize <swatch-variant> if inserted via AJAX/Section Rendering
  document.querySelectorAll("swatch-variant").forEach((el) => {
    if (!el.initialized && typeof el.connectedCallback === "function") {
      el.connectedCallback();
    }
  });
});
