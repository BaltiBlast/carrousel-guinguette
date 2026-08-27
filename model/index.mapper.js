import mongoose from "mongoose";

import MagicLinkToken from "./magic-link-token.mapper.js";
import Session from "./session.mapper.js";
import User from "./user.mapper.js";

export const MagicLinkTokenMapper = new MagicLinkToken(mongoose);
export const SessionMapper = new Session(mongoose);
export const UserMapper = new User(mongoose);
