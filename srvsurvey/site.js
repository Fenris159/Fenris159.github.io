// The site works without JavaScript; this adds mobile navigation and screenshot previews.
const menuButton = document.querySelector(".nav-toggle");
const navigation = document.querySelector("#navigation");
if (menuButton && navigation) {
  document.documentElement.classList.add("has-js");
  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    navigation.classList.toggle("is-open", !expanded);
  });
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      menuButton.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
    }
  });
}

const viewer = document.querySelector("#image-viewer");
if (viewer && typeof viewer.showModal === "function") {
  const image = viewer.querySelector("#viewer-image");
  const caption = viewer.querySelector("#image-caption");
  const original = viewer.querySelector("#viewer-original");
  document.querySelectorAll("[data-lightbox]").forEach((link) => {
    link.addEventListener("click", (event) => {
      // Preserve open-in-new-tab, download and other native link gestures.
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      image.src = link.href;
      image.alt = link.querySelector("img").alt;
      caption.textContent = link.dataset.caption;
      original.href = link.href;
      viewer.showModal();
    });
  });
  viewer
    .querySelector(".viewer-close")
    .addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", (event) => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      viewer.close();
  });
}
