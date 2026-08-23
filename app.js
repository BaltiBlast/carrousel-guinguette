import express from "express";
import expressLayouts from "express-ejs-layouts";
import router from "./router.js";

const app = express();

app.set("view engine", "ejs");
app.set("layout", "layouts/main");

app.use(express.static(import.meta.dirname + "/public"));

app.use(expressLayouts);
app.use(router);

app.use((request, response) => {
  response.status(404).send("Page introuvable");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Serveur accessible sur http://localhost:${port}`);
});
