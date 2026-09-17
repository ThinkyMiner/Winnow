import type { SendMessage } from "../types";

/** Typed chrome.runtime.sendMessage for content scripts and extension pages. */
export const sendMessage: SendMessage = (msg) => chrome.runtime.sendMessage(msg);
