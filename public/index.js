document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".card button");

  buttons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".card");
      const labName = card ? card.querySelector("h3")?.textContent : null;
      if (!labName) {
        return;
      }

      const lab = labName.replace(" Lab", "").trim();
      localStorage.setItem("managed_lab", lab);
      window.location.href = `lab.html?lab=${encodeURIComponent(lab)}`;
    });
  });
});
