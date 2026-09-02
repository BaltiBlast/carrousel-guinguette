import userSchema from "../schemas/user.schema.js";
import CoreMapper from "./core.mapper.js";

class User extends CoreMapper {
  constructor(mongoose) {
    super(mongoose);

    this.model = this.mongoose.models.User || this.mongoose.model("User", userSchema, "users");
  }

  findUserById(userId) {
    return this.model.findById(userId);
  }

  findUserByEmail(email) {
    return this.model.findOne({ email });
  }

  findActiveAdministrators() {
    return this.model.find({ role: "admin", isActive: true });
  }

  upsertUserByEmail(email, userData) {
    return this.model.findOneAndUpdate({ email }, userData, {
      returnDocument: "after",
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });
  }

  deleteUsersExcept(userId) {
    return this.model.deleteMany({ _id: { $ne: userId } });
  }

  updateLastLoginAt(userId, lastLoginAt) {
    return this.model.findByIdAndUpdate(userId, { lastLoginAt }, { returnDocument: "after" });
  }
}

export default User;
