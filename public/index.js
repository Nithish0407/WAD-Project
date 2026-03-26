document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("auth_token");

  // If not authenticated, send users straight to login
  if (!token) {
    window.location.replace("login.html");
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

  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (token) {
    if (loginBtn) {
      loginBtn.style.display = "none";
    }
    if (logoutBtn) {
      logoutBtn.classList.remove("d-none");
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
      logoutBtn.classList.add("d-none");
    }
  }

});
