"use client";

import { useEffect } from "react";
export default function PageEnhancer() {
  useEffect(() => {
    const body = document.body;
    const burger = document.querySelector<HTMLButtonElement>(".burger");
    const nav = document.getElementById("site-nav");
    const backdrop = document.querySelector<HTMLElement>(".menu-backdrop");
    const desktop = window.matchMedia("(min-width: 901px)");

    const setOpen = (open: boolean) => {
      body.classList.toggle("menu-open", open);
      burger?.setAttribute("aria-expanded", String(open));
      burger?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    const onBurger = () => setOpen(!body.classList.contains("menu-open"));
    const onNav = (e: Event) => {
      if ((e.target as Element).closest("a")) setOpen(false);
    };
    const onClose = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };

    burger?.addEventListener("click", onBurger);
    nav?.addEventListener("click", onNav);
    backdrop?.addEventListener("click", onClose);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);

    const targets = Array.from(document.querySelectorAll<HTMLElement>(".appear, .hero-photo"));
    const handlers = targets.map((el) => {
      const done = (e: AnimationEvent) => {
        if (e.target !== el) return; 
        el.classList.add("is-in");
        el.removeEventListener("animationend", done);
      };
      el.addEventListener("animationend", done);
      return () => el.removeEventListener("animationend", done);
    });

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const probe = targets[0];
        if (!probe) return;
        const alive =
          typeof probe.getAnimations === "function" &&
          probe.getAnimations().some((a) => a.playState === "running" || a.playState === "finished");
        if (!alive) targets.forEach((el) => el.classList.add("is-in"));
      });
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelector<HTMLVideoElement>(".hero-photo video")?.pause();
    }

    return () => {
      burger?.removeEventListener("click", onBurger);
      nav?.removeEventListener("click", onNav);
      backdrop?.removeEventListener("click", onClose);
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
      handlers.forEach((off) => off());
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      setOpen(false);
    };
  }, []);

  return null;
}
