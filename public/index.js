document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

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

  const loginBtn = document.querySelector(".login-btn");
  if (loginBtn) {
    loginBtn.textContent = "Logout";
    loginBtn.addEventListener("click", () => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_email");
      localStorage.removeItem("managed_lab");
      window.location.href = "login.html";
    });
  }

});
