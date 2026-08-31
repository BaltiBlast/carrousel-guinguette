const filterGroup = document.querySelector("[data-review-filters]");

if (filterGroup) {
  const filterButtons = [...filterGroup.querySelectorAll("[data-review-filter]")];
  const reviews = [...document.querySelectorAll("[data-review-status]")];
  const emptyMessage = document.querySelector("[data-review-filter-empty]");
  const statusMessage = document.querySelector("[data-review-filter-status]");
  const formFilters = [...document.querySelectorAll("[data-review-form-filter]")];
  const allowedFilters = filterButtons.map((button) => button.dataset.reviewFilter);

  function applyFilter(selectedButton, updateUrl = true) {
    const selectedStatus = selectedButton.dataset.reviewFilter;
    let visibleCount = 0;

    filterButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button === selectedButton));
    });

    reviews.forEach((review) => {
      const isVisible = selectedStatus === "all" || review.dataset.reviewStatus === selectedStatus;
      review.hidden = !isVisible;
      visibleCount += Number(isVisible);
    });

    if (emptyMessage) {
      emptyMessage.hidden = visibleCount !== 0 || reviews.length === 0;
    }

    if (statusMessage) {
      statusMessage.textContent = `${visibleCount} avis affiché${visibleCount > 1 ? "s" : ""}.`;
    }

    formFilters.forEach((input) => {
      input.value = selectedStatus;
    });

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("filter", selectedStatus);
      window.history.replaceState({}, "", url);
    }
  }

  filterGroup.addEventListener("click", (event) => {
    const selectedButton = event.target.closest("[data-review-filter]");

    if (!selectedButton) {
      return;
    }

    applyFilter(selectedButton);
  });

  const requestedFilter = new URLSearchParams(window.location.search).get("filter");
  const initialFilter = allowedFilters.includes(requestedFilter) ? requestedFilter : "all";
  const initialButton = filterButtons.find((button) => button.dataset.reviewFilter === initialFilter);
  applyFilter(initialButton, false);
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-confirm]");
  if (form && !window.confirm(form.dataset.confirm)) event.preventDefault();
});
