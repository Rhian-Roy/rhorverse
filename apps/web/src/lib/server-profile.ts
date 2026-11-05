import { cookies } from "next/headers";
import { api } from "./api";
import { PROFILE_COOKIE } from "./profile";

/** The visitor's anonymous profile id in a server component. Snapshot mode has no profiles. */
export async function serverProfileId(): Promise<string | undefined> {
  return api.mode === "live" ? (await cookies()).get(PROFILE_COOKIE)?.value : undefined;
}
