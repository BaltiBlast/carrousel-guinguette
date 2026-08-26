import mongoose from "mongoose";

import MagicLinkToken from "./magic-link-token.mapper.js";
import User from "./user.mapper.js";

export const MagicLinkTokenMapper = new MagicLinkToken(mongoose);
export const UserMapper = new User(mongoose);
