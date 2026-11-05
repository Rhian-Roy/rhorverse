// Light/dark theme: a `data-theme` attribute on <html>, remembered in localStorage. Dark is the default.
export type Theme = "light" | "dark";

export const THEME_KEY = "rhorverse_theme";

/** Runs before first paint (inlined in the root layout), so a light-theme visitor never sees a dark flash. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
