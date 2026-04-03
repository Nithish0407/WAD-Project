const API_BASE = window.API_BASE || window.location.origin;

document.getElementById("signupForm").addEventListener("submit", async event => {
  event.preventDefault();

  const facultyId = document.getElementById("facultyId").value.trim();
  const name = document.getElementById("name").value.trim();
  const department = document.getElementById("department").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!facultyId || !name || !department || !email || !password || !confirmPassword) {
    alert("All fields are required");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  try {
    const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        faculty_id: facultyId,
        department,
        email,
        password
      })
    });

    let registerPayload;
    try {
      registerPayload = await registerResponse.json();
    } catch {
      throw new Error("Backend did not return JSON. Is the API running?");
    }
    if (!registerResponse.ok || !registerPayload.success) {
      throw new Error(registerPayload?.error?.message || "Registration failed");
    }

    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    let loginPayload;
    try {
      loginPayload = await loginResponse.json();
    } catch {
      throw new Error("Backend did not return JSON. Is the API running?");
    }
    if (!loginResponse.ok || !loginPayload.success || !loginPayload.data?.token) {
      throw new Error(loginPayload?.error?.message || "Login after registration failed");
    }

    const token = loginPayload.data.token;
    const userResponse = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    let userPayload;
    try {
      userPayload = await userResponse.json();
    } catch {
      throw new Error("Backend did not return JSON. Is the API running?");
    }
    if (!userResponse.ok || !userPayload.success) {
      throw new Error(userPayload?.error?.message || "Unable to load user");
    }

    const userId = userPayload.data.user.id;
    await fetch(`${API_BASE}/api/labs/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ user_id: userId, lab_name: department })
    });

    localStorage.setItem("auth_token", token);
    localStorage.setItem("user_email", email);
    localStorage.setItem("managed_lab", department);
    window.location.replace("/admin.html");
  } catch (err) {
    alert(err.message || "Unable to register");
  }
});
