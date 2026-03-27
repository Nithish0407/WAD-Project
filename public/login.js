const API_BASE = window.API_BASE || window.location.origin;
const messageEl = document.getElementById("login-message");
const submitBtn = document.getElementById("login-submit");
const form = document.getElementById("loginForm");

submitBtn.addEventListener("click", async () => {

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  messageEl.textContent = "";

  if (!email || !password) {
    messageEl.textContent = "Email and password are required";
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Backend did not return JSON. Is the API running?");
    }
    if (!response.ok || !payload.success || !payload.data?.token) {
      const message = payload?.error?.message || "Login failed";
      throw new Error(message);
    }

    localStorage.setItem("auth_token", payload.data.token);
    localStorage.setItem("user_email", email);
    messageEl.style.color = "#067647";
    messageEl.textContent = "Login successful. Redirecting...";
    window.location.replace("/admin.html");
  } catch (err) {
    messageEl.style.color = "#b42318";
    messageEl.textContent = err.message || "Unable to login";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Login To Dashboard";
  }
});
