/**
 * Who is asking the API. A signed-in user sends their access token (the API then picks their profile
 * and ignores any profile id). A guest sends the anonymous cookie id.
 */
export interface Who {
  token?: string;
  guestId?: string;
}

export const isPersonal = (who: Who | null | undefined): who is Who => !!(who?.token || who?.guestId);
