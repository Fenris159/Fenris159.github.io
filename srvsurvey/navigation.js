// Run before the body is parsed so mobile navigation has its final first-paint height.
document.documentElement.classList.add("has-js");
document.addEventListener("click", (event) => {
  const button = event.target.closest(".nav-toggle");
  const link = event.target.closest("#navigation a");
  if (!button && !link) return;

  const toggle = button || document.querySelector(".nav-toggle");
  const navigation = document.querySelector("#navigation");
  if (!toggle || !navigation) return;

  const expanded = button && toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(Boolean(expanded)));
  navigation.classList.toggle("is-open", Boolean(expanded));
});
