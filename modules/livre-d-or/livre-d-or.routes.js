import { Router } from "express";
import * as controller from "./livre-d-or.controllers.js";

const router = Router();

router.get("/", controller.showGuestbook);
router.get("/deposer", controller.showReviewForm);
router.post("/deposer", controller.submitReview);

export { router };
