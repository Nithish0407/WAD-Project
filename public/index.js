document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("auth_token");

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

  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (token) {
    if (loginBtn) {
      loginBtn.textContent = "Dashboard";
      loginBtn.addEventListener("click", () => window.location.href = "admin.html");
    }
    if (logoutBtn) {
      logoutBtn.style.display = "inline-block";
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_email");
        localStorage.removeItem("managed_lab");
        window.location.href = "login.html";
      });
    }
  } else {
    if (loginBtn) {
      loginBtn.textContent = "Login";
      loginBtn.addEventListener("click", () => window.location.href = "login.html");
    }
    if (logoutBtn) {
      logoutBtn.style.display = "none";
    }
  }

});
