// Screenshot links remain usable without this optional dialog enhancement.
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
      image.src = link.dataset.preview || link.href;
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
