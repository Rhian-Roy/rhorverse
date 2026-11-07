/** Tell the toast host to show a message. Any client code can call this. */
export const TOAST_EVENT = "rhorverse:toast";

export interface ToastMessage {
  title: string;
  body?: string;
  action?: { label: string; href: string };
}

export function announce(message: ToastMessage): void {
  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, { detail: message }));
}
