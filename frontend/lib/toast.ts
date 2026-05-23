"use client";

import { useSyncExternalStore } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type Listener = () => void;

let toasts: Toast[] = [];
const emptyToasts: Toast[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function remove(id: string) {
  toasts = toasts.filter((toastItem) => toastItem.id !== id);
  emit();
}

function add(type: ToastType, message: string, duration = 4000) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  toasts = [...toasts, { id, type, message, duration }];
  emit();
  window.setTimeout(() => remove(id), duration);
  return id;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

function getServerSnapshot() {
  return emptyToasts;
}

export function useToasts() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const toast = {
  success: (message: string, duration?: number) => add("success", message, duration),
  error: (message: string, duration?: number) => add("error", message, duration),
  warning: (message: string, duration?: number) => add("warning", message, duration),
  info: (message: string, duration?: number) => add("info", message, duration),
  dismiss: remove,
};
