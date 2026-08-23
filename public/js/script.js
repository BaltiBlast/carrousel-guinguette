const menuToggle = document.querySelector(".navbar__toggle");
const navigation = document.querySelector(".navbar__menu");

if (menuToggle && navigation) {
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    navigation.dataset.open = "false";
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";

    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    navigation.dataset.open = String(!isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 992) {
      closeMenu();
    }
  });
}

const guestbookCarousel = document.querySelector("[data-guestbook-carousel]");

if (guestbookCarousel) {
  const reviews = [...guestbookCarousel.querySelectorAll(".guestbook-card")];
  const progressBar = document.querySelector("[data-guestbook-progress]");
  const carouselStatus = document.querySelector("[data-guestbook-status]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mediumScreen = window.matchMedia("(max-width: 56rem)");
  const smallScreen = window.matchMedia("(max-width: 38rem)");
  const displayDuration = 10000;
  let firstVisibleReview = 0;
  let progressAnimation;

  const getVisibleCount = () => {
    if (smallScreen.matches) return 1;
    if (mediumScreen.matches) return 2;
    return 3;
  };

  const showCurrentReviews = (animate = false) => {
    const visibleCount = getVisibleCount();
    const visibleIndexes = Array.from(
      { length: Math.min(visibleCount, reviews.length) },
      (_, offset) => (firstVisibleReview + offset) % reviews.length,
    );

    reviews.forEach((review, index) => {
      review.hidden = !visibleIndexes.includes(index);

      if (animate && !review.hidden) {
        review.animate(
          [
            { opacity: 0, transform: "translateY(0.75rem)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 350, easing: "ease-out" },
        );
      }
    });

    const displayedPositions = visibleIndexes.map((index) => index + 1).join(", ");
    carouselStatus.textContent = `Avis ${displayedPositions} sur ${reviews.length}`;
  };

  const startProgress = () => {
    progressAnimation?.cancel();

    if (reducedMotion.matches || reviews.length <= getVisibleCount() || !progressBar) return;

    progressAnimation = progressBar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      duration: displayDuration,
      easing: "linear",
    });

    progressAnimation.onfinish = () => {
      firstVisibleReview = (firstVisibleReview + getVisibleCount()) % reviews.length;
      showCurrentReviews(true);
      startProgress();
    };
  };

  const pauseProgress = () => progressAnimation?.pause();
  const resumeProgress = () => progressAnimation?.play();
  const resetCarousel = () => {
    firstVisibleReview = 0;
    showCurrentReviews();
    startProgress();
  };

  guestbookCarousel.dataset.enhanced = "true";
  showCurrentReviews();
  startProgress();

  guestbookCarousel.addEventListener("mouseenter", pauseProgress);
  guestbookCarousel.addEventListener("mouseleave", resumeProgress);
  guestbookCarousel.addEventListener("focusin", pauseProgress);
  guestbookCarousel.addEventListener("focusout", resumeProgress);
  mediumScreen.addEventListener("change", resetCarousel);
  smallScreen.addEventListener("change", resetCarousel);
  reducedMotion.addEventListener("change", resetCarousel);
}
