for (const copyable of document.querySelectorAll(".copyable"))
  copyable.insertAdjacentHTML(
    "afterend",
    `<br><button class="copy-button" data-clipboard-text="${copyable.innerText}">Copy</button>`
  );
new ClipboardJS(".copy-button").on("success", (event) => {
  event.trigger.innerText = "Copied";
  window.setTimeout(() => {
    event.trigger.innerText = "Copy";
  }, 500);
});
