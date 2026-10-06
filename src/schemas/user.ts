import { z } from "zod";

import { isoDateTimeSchema, userRoleSchema, uuidSchema } from "./common";

export const userProfileSchema = z.object({
  id: uuidSchema,
  business_id: uuidSchema,
  role: userRoleSchema,
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const updateUserRoleSchema = z.object({
  user_id: uuidSchema,
  role: userRoleSchema,
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
