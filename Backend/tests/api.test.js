const baseUrl = process.env.BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

function extractData(body) {
  if (body && typeof body === "object" && "data" in body) return body.data;
  return body;
}

async function run() {
  const results = [];
  const now = Date.now();
  const facultyId = `BVRIT${now}`;
  const email = `faculty${now}@bvrit.ac.in`;
  const password = "secret123";
  let token;
  let userId;
  let equipmentId;
  const reservationWindow = {
    start_at: "2026-03-01 10:00:00",
    end_at: "2026-03-01 12:00:00"
  };

  const push = (name, ok, status, body) => results.push([name, ok, status, body]);

  {
    const { res, body } = await request("/health");
    push("GET /health", res.status === 200, res.status, body);
  }

  {
    const { res, body } = await request("/ready");
    push("GET /ready", res.status === 200, res.status, body);
  }

  {
    const { res, body } = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Faculty",
        faculty_id: facultyId,
        department: "CSE",
        email,
        password
      })
    });
    push("POST /api/auth/register", res.status === 201, res.status, body);
  }

  {
    const { res, body } = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    token = extractData(body)?.token;
    push("POST /api/auth/login", res.status === 200 && !!token, res.status, body);
  }

  {
    const { res, body } = await request("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    });
    userId = extractData(body)?.user?.id;
    push("GET /api/auth/me", res.status === 200 && !!userId, res.status, body);
  }

  {
    const { res, body } = await request("/api/labs/assign", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId, lab_name: "CSE" })
    });
    push("POST /api/labs/assign", res.status === 201 || res.status === 409, res.status, body);
  }

  {
    const { res, body } = await request("/api/equipment?lab=CSE&page=1&limit=5", {
      headers: { Authorization: `Bearer ${token}` }
    });
    push("GET /api/equipment", res.status === 200, res.status, body);
  }

  {
    const { res, body } = await request("/api/equipment", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        lab_name: "CSE",
        equipment_name: `Test Scope ${now}`,
        status: "available",
        total_quantity: 3,
        available_quantity: 3
      })
    });
    equipmentId = extractData(body)?.id;
    push("POST /api/equipment", res.status === 201 && !!equipmentId, res.status, body);
  }

  {
    const { res, body } = await request("/api/reservations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        equipment_id: equipmentId,
        quantity: 1,
        ...reservationWindow
      })
    });
    push("POST /api/reservations", res.status === 201, res.status, body);
  }

  let failed = 0;
  for (const [name, ok, status, body] of results) {
    if (!ok) failed += 1;
    console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
    if (!ok) {
      console.log(`  status: ${status}`);
      console.log(`  body: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    }
  }
  if (failed) process.exitCode = 1;
}

run().catch(err => {
  console.error("Test runner error:", err);
  process.exitCode = 1;
});
