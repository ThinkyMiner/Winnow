import { sendMessage } from "../background/messaging";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("form");
const input = $<HTMLInputElement>("key");
const verify = $<HTMLButtonElement>("verify");
const status = $("status");

form.onsubmit = async (e) => {
  e.preventDefault();
  const key = input.value.trim();
  if (!key) return;
  verify.disabled = true;
  status.className = "";
  status.textContent = "Verifying…";
  const r = await sendMessage({ type: "SET_KEY", key });
  input.value = "";
  verify.disabled = false;
  if (r.ok) {
    $("model").textContent = r.value.model;
    form.hidden = true;
    $("done").hidden = false;
  } else {
    status.className = "err";
    status.textContent = r.error.jev?.kind === "auth" ? "That key was rejected." : r.error.message;
  }
};
