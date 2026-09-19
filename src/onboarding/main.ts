import { sendMessage } from "../background/messaging";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("form");
const input = $<HTMLInputElement>("key");
const verify = $<HTMLButtonElement>("verify");
const status = $("status");
const error = $("error");

form.onsubmit = async (e) => {
  e.preventDefault();
  const key = input.value.trim();
  if (!key) return;
  verify.disabled = true;
  verify.textContent = "Checking…";
  error.hidden = true;
  status.textContent = "Verifying…";
  const r = await sendMessage({ type: "SET_KEY", key });
  input.value = "";
  verify.disabled = false;
  verify.textContent = "Verify key";
  if (r.ok) {
    $("model").textContent = r.value.model;
    status.textContent = "Key verified.";
    $("setup").hidden = true;
    $("done").hidden = false;
  } else {
    const message =
      r.error.jev?.kind === "auth" ? "That key was rejected. Check you copied the whole thing." : r.error.message;
    $("errorMsg").textContent = message;
    error.hidden = false;
    status.textContent = message;
  }
};
