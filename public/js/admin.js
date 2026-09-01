const filterGroup = document.querySelector("[data-review-filters]");

const reservationFilterGroup = document.querySelector("[data-reservation-filters]");

if (reservationFilterGroup) {
  const buttons = [...reservationFilterGroup.querySelectorAll("[data-reservation-filter]")];
  const reservations = [...document.querySelectorAll("[data-reservation-status]")];
  const events = [...document.querySelectorAll("[data-reservation-event]")];
  const status = reservationFilterGroup.querySelector("[data-reservation-filter-status]");

  function filterReservations(selectedButton) {
    const selectedStatus = selectedButton.dataset.reservationFilter;
    let visibleCount = 0;

    buttons.forEach((button) => button.setAttribute("aria-pressed", String(button === selectedButton)));
    reservations.forEach((reservation) => {
      const visible = selectedStatus === "all" || reservation.dataset.reservationStatus === selectedStatus;
      reservation.hidden = !visible;
      visibleCount += Number(visible);
    });
    events.forEach((event) => {
      event.hidden = !event.querySelector("[data-reservation-status]:not([hidden])");
    });
    status.textContent = `${visibleCount} réservation${visibleCount > 1 ? "s" : ""} affichée${visibleCount > 1 ? "s" : ""}.`;
  }

  reservationFilterGroup.addEventListener("click", (event) => {
    const button = event.target.closest("[data-reservation-filter]");
    if (button) filterReservations(button);
  });

  const targetedEvent = window.location.hash ? document.querySelector(window.location.hash) : null;
  if (targetedEvent?.matches("[data-reservation-event]")) targetedEvent.open = true;
}

const checkIn = document.querySelector("[data-checkin]");

if (checkIn) {
  const entries = [...checkIn.querySelectorAll("[data-checkin-entry]")];
  const search = checkIn.querySelector("[data-checkin-search]");
  const searchStatus = checkIn.querySelector("[data-checkin-search-status]");
  const empty = checkIn.querySelector("[data-checkin-empty]");
  const present = checkIn.querySelector("[data-checkin-present]");
  const remaining = checkIn.querySelector("[data-checkin-remaining]");
  const expected = Number(checkIn.dataset.expectedAttendees);

  function updateCheckInTotals() {
    const presentCount = entries.reduce((total, entry) => {
      if (!entry.classList.contains("is-checked-in")) return total;
      return total + Number(entry.querySelector("[data-checkin-count]").value);
    }, 0);
    present.textContent = presentCount;
    remaining.textContent = Math.max(0, expected - presentCount);
  }

  checkIn.addEventListener("input", (event) => {
    if (event.target.matches("[data-checkin-count]")) updateCheckInTotals();
  });

  search.addEventListener("input", () => {
    const query = search.value.trim().toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let visibleCount = 0;
    entries.forEach((entry) => {
      const searchableValue = entry.dataset.checkinSearchValue.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const visible = searchableValue.includes(query);
      entry.hidden = !visible;
      visibleCount += Number(visible);
    });
    empty.hidden = visibleCount !== 0;
    searchStatus.textContent = `${visibleCount} réservation${visibleCount > 1 ? "s" : ""} trouvée${visibleCount > 1 ? "s" : ""}.`;
  });
}

const richTextEditor = document.querySelector("[data-rich-text-editor]");
let eventDescriptionEditor = null;

if (richTextEditor && window.Quill) {
  const form = richTextEditor.closest("form");
  const input = form.querySelector("[data-rich-text-input]");
  const error = form.querySelector("[data-rich-text-error]");
  const quill = new window.Quill(richTextEditor, {
    theme: "snow",
    formats: ["header", "bold", "italic", "underline", "strike", "blockquote", "list", "link"],
    modules: {
      toolbar: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        ["blockquote"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    },
  });
  eventDescriptionEditor = quill;

  if (input.value) quill.clipboard.dangerouslyPasteHTML(input.value);

  quill.on("text-change", () => {
    richTextEditor.setAttribute("aria-invalid", "false");
    error.hidden = true;
  });

  form.addEventListener("submit", (event) => {
    const description = quill.getText().trim();
    input.value = typeof quill.getSemanticHTML === "function" ? quill.getSemanticHTML() : quill.root.innerHTML;

    if (description.length >= 20 && description.length <= 5000) return;

    event.preventDefault();
    error.textContent = description.length < 20
      ? "La description doit contenir au moins 20 caractères."
      : "La description ne peut pas dépasser 5 000 caractères.";
    error.hidden = false;
    richTextEditor.setAttribute("aria-invalid", "true");
    quill.focus();
  });
}

const eventAssistant = document.querySelector("[data-event-assistant]");

if (eventAssistant && eventDescriptionEditor) {
  const form = eventAssistant.closest("form");
  const optimizeButton = eventAssistant.querySelector("[data-optimize-event]");
  const applyButton = eventAssistant.querySelector("[data-apply-suggestion]");
  const dismissButton = eventAssistant.querySelector("[data-dismiss-suggestion]");
  const status = eventAssistant.querySelector("[data-optimize-status]");
  const suggestionPanel = eventAssistant.querySelector("[data-event-suggestion]");
  const suggestionTitle = eventAssistant.querySelector("[data-suggestion-title]");
  const suggestionPriceDetails = eventAssistant.querySelector("[data-suggestion-price-details]");
  const suggestionDescription = eventAssistant.querySelector("[data-suggestion-description]");
  let suggestion = null;

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
    status.hidden = false;
  }

  optimizeButton.addEventListener("click", async () => {
    const descriptionInput = form.querySelector("[data-rich-text-input]");
    descriptionInput.value = typeof eventDescriptionEditor.getSemanticHTML === "function"
      ? eventDescriptionEditor.getSemanticHTML()
      : eventDescriptionEditor.root.innerHTML;
    const formData = new FormData(form);

    optimizeButton.disabled = true;
    optimizeButton.setAttribute("aria-busy", "true");
    suggestionPanel.hidden = true;
    showStatus("Votre contenu est en cours de correction et d’optimisation… Le traitement peut prendre plus d’une minute.");

    try {
      const response = await fetch("/admin/evenements/optimiser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "L’optimisation a échoué.");

      suggestion = result;
      suggestionTitle.textContent = result.title;
      suggestionPriceDetails.textContent = result.priceDetails || "Aucune précision tarifaire";
      suggestionDescription.innerHTML = result.descriptionHtml;
      suggestionPanel.hidden = false;
      showStatus("Une suggestion est prête. Vérifiez-la avant de l’appliquer.");
    } catch (error) {
      suggestion = null;
      showStatus(error.message, true);
    } finally {
      optimizeButton.disabled = false;
      optimizeButton.removeAttribute("aria-busy");
    }
  });

  applyButton.addEventListener("click", () => {
    if (!suggestion) return;
    form.elements.title.value = suggestion.title;
    form.elements.priceDetails.value = suggestion.priceDetails;
    eventDescriptionEditor.setContents([]);
    eventDescriptionEditor.clipboard.dangerouslyPasteHTML(suggestion.descriptionHtml);
    suggestionPanel.hidden = true;
    showStatus("La suggestion a été appliquée. Vous pouvez encore la modifier avant l’enregistrement.");
    suggestion = null;
  });

  dismissButton.addEventListener("click", () => {
    suggestion = null;
    suggestionPanel.hidden = true;
    showStatus("Votre texte actuel est conservé.");
  });
}

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
