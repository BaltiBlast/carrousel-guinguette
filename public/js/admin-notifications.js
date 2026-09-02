const pushSection = document.querySelector("[data-admin-push]");

function isIosDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isStandalonePwa() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function subscriptionUsesPublicKey(subscription, publicKey) {
  const registeredKey = subscription?.options?.applicationServerKey;
  if (!registeredKey) return true;

  const expectedKey = urlBase64ToUint8Array(publicKey);
  const currentKey = new Uint8Array(registeredKey);
  return currentKey.length === expectedKey.length && currentKey.every((value, index) => value === expectedKey[index]);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(result.error || `La requête a échoué (${response.status}).`);
  return result;
}

if (pushSection) {
  const status = pushSection.querySelector("[data-admin-push-status]");
  const toggle = pushSection.querySelector("[data-admin-push-toggle]");

  pushSection.hidden = false;

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    status.textContent = "Les notifications ne sont pas prises en charge sur cet appareil.";
    toggle.hidden = true;
  } else if (isIosDevice() && !isStandalonePwa()) {
    status.textContent = "Installez d’abord Le Carrousel sur l’écran d’accueil, puis ouvrez l’application installée.";
    toggle.hidden = true;
  } else {
    initializePushNotifications().catch(() => {
      status.textContent = "Impossible d’initialiser les notifications sur cet appareil.";
      toggle.hidden = true;
    });
  }

  async function initializePushNotifications() {
    const registration = await navigator.serviceWorker.register("/service-worker.js");
    let subscription;
    let isRegistered = false;

    async function saveCurrentSubscription() {
      await requestJson("/admin/notifications/subscriptions", {
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
    }

    async function synchronizeSubscription() {
      subscription = await registration.pushManager.getSubscription();
      if (Notification.permission !== "granted") return;

      const { publicKey } = await requestJson("/admin/notifications/public-key");

      if (subscription && !subscriptionUsesPublicKey(subscription, publicKey)) {
        await requestJson("/admin/notifications/subscriptions", {
          method: "DELETE",
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});
        await subscription.unsubscribe();
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await saveCurrentSubscription();
    }

    async function refreshInterface() {
      subscription = await registration.pushManager.getSubscription();
      isRegistered = false;

      if (subscription) {
        const query = new URLSearchParams({ endpoint: subscription.endpoint });
        const result = await requestJson(`/admin/notifications/status?${query}`);
        isRegistered = result.subscribed;
      }

      status.textContent = isRegistered
        ? "Les alertes concernant les nouveaux avis et les demandes de réservation sont actives sur cet appareil."
        : Notification.permission === "denied"
          ? "Les notifications sont bloquées dans les réglages de cet appareil."
          : "Les alertes concernant les nouveaux avis et les demandes de réservation sont désactivées sur cet appareil.";
      toggle.textContent = isRegistered ? "Désactiver sur cet appareil" : "Activer les notifications";
      toggle.disabled = Notification.permission === "denied";
    }

    toggle.addEventListener("click", async () => {
      toggle.disabled = true;

      try {
        subscription = await registration.pushManager.getSubscription();

        if (subscription && isRegistered) {
          await requestJson("/admin/notifications/subscriptions", {
            method: "DELETE",
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        } else {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") throw new Error("La permission n’a pas été accordée.");

          if (!subscription) {
            const { publicKey } = await requestJson("/admin/notifications/public-key");
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
          }

          await saveCurrentSubscription();
        }
      } catch (error) {
        status.textContent = error.message;
      } finally {
        await refreshInterface();
      }
    });

    await synchronizeSubscription();
    await refreshInterface();
  }
}
