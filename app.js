import express from "express";
import expressLayouts from "express-ejs-layouts";
import { ORGANIZER_CONTACT } from "./config/contact.js";
import { connectDatabase } from "./database.js";
import { EventMapper, ReservationMapper } from "./model/index.mapper.js";
import { initializeAdministrator, validateConfiguration } from "./modules/admin/admin.services.js";
import { validateGuestbookConfiguration } from "./modules/livre-d-or/livre-d-or.services.js";
import { validateNotificationConfiguration } from "./modules/notifications/notifications.services.js";
import router from "./router.js";

const app = express();

app.set("view engine", "ejs");
app.set("layout", "layouts/main");
app.locals.contact = ORGANIZER_CONTACT;

app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.static(import.meta.dirname + "/public"));
app.use("/vendor/quill", express.static(import.meta.dirname + "/node_modules/quill/dist"));

app.use(expressLayouts);
app.use(router);

app.use((request, response) => {
  response.status(404).render("errors/404", {
    title: "Page introuvable | Le Carrousel",
    description: "Cette page n’existe pas ou n’est plus disponible.",
    currentYear: new Date().getFullYear(),
    robots: "noindex, follow",
  });
});

const port = process.env.PORT || 3000;

validateConfiguration();
validateGuestbookConfiguration();
validateNotificationConfiguration();
await connectDatabase();
await ReservationMapper.synchronizeEmailIndex();
await ReservationMapper.synchronizeEventReservedSeats(EventMapper.model);
await initializeAdministrator();

app.listen(port, () => {
  console.log(`Serveur accessible sur http://localhost:${port}`);
});
