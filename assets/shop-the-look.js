// Shop The Look Modal and Carousel Logic
let currentVideoIndex = 0;
let currentProductSwiper = null;
const totalSlides = window.ShopTheLookTotalSlides || 0;

function openLookModal(index) {
  currentVideoIndex = index;
  document.getElementById('lookVideoModal').classList.remove('hidden');
  showCurrentVideoSlide();
}

function showCurrentVideoSlide() {
  for (let i = 0; i < totalSlides; i++) {
    const slide = document.getElementById('lookModalSlide-' + i);
    slide.classList.remove('swiper-slide-prev', 'swiper-slide-active', 'swiper-slide-next');
    if (i === currentVideoIndex) {
      slide.classList.add('swiper-slide-active');
      slide.style.zIndex = 3;
    } else if (i === currentVideoIndex - 1) {
      slide.classList.add('swiper-slide-prev');
      slide.style.zIndex = 2;
    } else if (i === currentVideoIndex + 1) {
      slide.classList.add('swiper-slide-next');
      slide.style.zIndex = 2;
    } else {
      slide.style.zIndex = 1;
    }
    // SHOW product cards only for the active slide
    const productsSection = slide.querySelector('.look-modal-products-section');
    if (productsSection) {
      productsSection.style.display = (i === currentVideoIndex) ? 'flex' : 'none';
    }
  }
  document.getElementById('lookModalPrevBtn').style.display = (currentVideoIndex > 0) ? '' : 'none';
  document.getElementById('lookModalNextBtn').style.display = (currentVideoIndex < totalSlides - 1) ? '' : 'none';
  // Destroy old Swiper
  if (window.currentProductSwiper && typeof window.currentProductSwiper.destroy === 'function') {
    window.currentProductSwiper.destroy(true, true);
    window.currentProductSwiper = null;
  }
  // Create Swiper for current product cards only
  setTimeout(function() {
    const swiperEl = document.querySelector('.look-modal-slide.swiper-slide-active .look-modal-product-swiper');
    if (swiperEl) {
      window.currentProductSwiper = new Swiper(swiperEl, {
        slidesPerView: 'auto',
        spaceBetween: 12,
        allowTouchMove: true,
        navigation: false,
        pagination: false,
        breakpoints: {
          768: {
            slidesPerView: 'auto',
            spaceBetween: 16
          }
        }
      });
    }
  }, 150);
}

function showPrevVideo() {
  if (currentVideoIndex > 0) {
    currentVideoIndex--;
    showCurrentVideoSlide();
  }
}
function showNextVideo() {
  if (currentVideoIndex < totalSlides - 1) {
    currentVideoIndex++;
    showCurrentVideoSlide();
  }
}
function closeLookModal() {
  document.getElementById('lookVideoModal').classList.add('hidden');
}

function quickViewProduct(productUrl) {
  window.open(productUrl, '_blank');
}

function addToCart(productId, btn) {
  if (!btn) {
    btn = document.querySelector(`[onclick*="${productId}"]`);
  }
  if (btn) {
    btn.textContent = 'Adding...';
    btn.classList.add('adding');
    btn.disabled = true;
  }
  fetch('/cart/add.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: productId,
      quantity: 1
    })
  })
  .then(response => response.json())
  .then(data => {
    if (btn) {
      btn.textContent = 'Added!';
      setTimeout(() => {
        btn.textContent = 'Add to Cart';
        btn.classList.remove('adding');
        btn.disabled = false;
      }, 2000);
    }
    // Update cart count bubble
    fetch('/cart.js')
      .then(res => res.json())
      .then(cart => {
        if (cart && cart.item_count !== undefined) {
          const count = cart.item_count;
          const cartCountEls = document.querySelectorAll('.cart-count, .cart-count-bubble, .header__cart-count');
          cartCountEls.forEach(el => {
            el.textContent = count;
            el.classList.add('cart-bubble-animate');
            setTimeout(() => el.classList.remove('cart-bubble-animate'), 500);
          });
        }
      });
    // Open cart drawer if available
    if (window.Shopify && window.Shopify.theme && window.Shopify.theme.cartDrawer && typeof Shopify.theme.cartDrawer.open === 'function') {
      Shopify.theme.cartDrawer.open();
    }
    // Show toast
    showAddToCartToast();
  })
  .catch(error => {
    if (btn) {
      btn.textContent = 'Error';
      btn.classList.remove('adding');
      btn.disabled = false;
    }
    console.error('Error adding to cart:', error);
  });
}

function showAddToCartToast() {
  const addedMsg = document.createElement('div');
  addedMsg.textContent = 'Product added to cart!';
  addedMsg.className = 'add-to-cart-toast';
  document.body.appendChild(addedMsg);
  setTimeout(() => addedMsg.remove(), 2000);
}

document.addEventListener('DOMContentLoaded', function () {
  // Set totalSlides for modal logic
  window.ShopTheLookTotalSlides = document.querySelectorAll('.look-modal-slide').length;
  // Main carousel
  new Swiper('.shop-the-look-swiper', {
    slidesPerView: window.ShopTheLookDesktopPerPage || 4,
    spaceBetween: window.ShopTheLookGap || 16,
    navigation: {
      nextEl: '.shop-the-look-swiper .swiper-button-next',
      prevEl: '.shop-the-look-swiper .swiper-button-prev'
    },
    pagination: window.ShopTheLookPagination ? {
      el: '.swiper-pagination',
      clickable: true
    } : false,
    breakpoints: {
      768: {
        slidesPerView: window.ShopTheLookMobilePerPage || 1,
        spaceBetween: window.ShopTheLookGapMobile || 8
      }
    }
  });
});