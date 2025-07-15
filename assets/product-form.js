if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData();
        const items = [];

        const mainVariantId = this.variantIdInput.value;

        items.push({
          id: mainVariantId,
          quantity: parseInt(this.form.querySelector('[name="quantity"]')?.value || '1')
        });

        document.querySelectorAll('.bundle-checkbox:checked').forEach((checkbox) => {
          items.push({
            id: checkbox.value,
            quantity: 1
          });
          console.log('Bundle item added:', checkbox.value);
        });
       
        const bundleGroupId = `bundle-${Date.now()}`;

        items.forEach((item, index) => {
          formData.append(`items[${index}][id]`, item.id);
          formData.append(`items[${index}][quantity]`, item.quantity);
          formData.append(`items[${index}][properties][_bundle_group]`, bundleGroupId);
        });

        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');
            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              }).then(() => {
                CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    CartPerformance.measure("add:paint-updated-sections", () => {
                      this.cart.renderContents(response);
                    });
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              CartPerformance.measure("add:paint-updated-sections", () => {
                this.cart.renderContents(response);
              });
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty')) this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');

            CartPerformance.measureFromEvent("add:user-action", evt);
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent = window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}
// Avoid redefining or re-registering in development or with AJAX loads
if (!window.SwatchVariantInitialized) {
  class SwatchVariant extends HTMLElement {
    connectedCallback() {
      // Extract and parse dataset
      this.variants = JSON.parse(this.dataset.variants || "[]");
      this.productId = this.dataset.productId;
      this.defaultId = this.dataset.defaultId;
 
      // console.log("SwatchVariant connected for product:", this.variants);
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

          //Visual feedback 
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
