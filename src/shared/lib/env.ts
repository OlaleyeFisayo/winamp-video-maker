import { z } from "zod";

export const envSchema = z.object({
  VITE_SITE_URL: z.url(),
});

export const env = envSchema.parse(import.meta.env);
export type Env = z.infer<typeof envSchema>;
