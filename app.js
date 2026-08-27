import express from "express";
import expressLayouts from "express-ejs-layouts";
import { connectDatabase } from "./database.js";
import { initializeAdministrator, validateConfiguration } from "./modules/admin/admin.services.js";
import router from "./router.js";

const app = express();

app.set("view engine", "ejs");
app.set("layout", "layouts/main");

app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.static(import.meta.dirname + "/public"));

app.use(expressLayouts);
app.use(router);

app.use((request, response) => {
  response.status(404).send("Page introuvable");
});

const port = process.env.PORT || 3000;

validateConfiguration();
await connectDatabase();
await initializeAdministrator();

app.listen(port, () => {
  console.log(`Serveur accessible sur http://localhost:${port}`);
});
