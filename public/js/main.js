document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? io() : null;

  // Spinner loader
  const loader = `<div class="d-flex justify-content-center align-items-center my-3">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>`;

  // Klik card session → buka modal QR
  function bindSessionClick() {
    document.querySelectorAll(".clickable").forEach((el) => {
      el.addEventListener("click", () => {
        const sessionId = el.dataset.session;
        document.getElementById("qrModalTitle").innerText = `Session: ${sessionId}`;
        document.getElementById("qrContainer").innerHTML = loader;
        document.getElementById("qrNote").innerText = "";
        document.getElementById("qrModal").setAttribute("data-session", sessionId);
        new bootstrap.Modal(document.getElementById("qrModal")).show();
      });
    });
  }

  // Load sessions
  async function loadSessions() {
    const res = await fetch("/wa/connect/list");
    const sessions = await res.json();
    document.getElementById("sessions").innerHTML = sessions
      .map((s) => {
        const badge =
          s.status === "connected"
            ? `<span class="badge bg-success"><i class="fa fa-check-circle me-1"></i>Connected</span>`
            : s.status === "reconnecting"
            ? `<span class="badge bg-warning text-dark"><i class="fa fa-sync-alt me-1"></i>Reconnecting</span>`
            : `<span class="badge bg-secondary"><i class="fa fa-times-circle me-1"></i>Disconnected</span>`;

        return `
        <div class="col-md-4">
          <div class="card shadow-sm h-100 clickable" data-session="${s.sessionId}">
            <div class="card-body d-flex flex-column justify-content-between">
              <div>
                <div class="fw-bold">${s.label || s.sessionId}</div>
                <div class="small text-muted">ID: ${s.sessionId}</div>
              </div>
              <div class="mt-2">${badge}</div>
            </div>
          </div>
        </div>`;
      })
      .join("");
    bindSessionClick();
  }

  // Buat session baru
  const newSessionForm = document.getElementById("newSessionForm");
  if (newSessionForm) {
    newSessionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        sessionId: document.getElementById("sessionId").value.trim(),
        label: document.getElementById("label").value.trim(),
        mode: document.getElementById("mode").value
      };

      document.getElementById("qrModalTitle").innerText = `Session: ${data.sessionId}`;
      document.getElementById("qrContainer").innerHTML = loader;
      document.getElementById("qrModal").setAttribute("data-session", data.sessionId);
      new bootstrap.Modal(document.getElementById("qrModal")).show();

      const res = await fetch("/wa/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then((r) => r.json());

      if (!res.success) {
        document.getElementById("qrContainer").innerHTML =
          `<div class="text-danger">❌ ${res.error || "Gagal membuat session"}</div>`;
        Swal.fire("Error", res.error || "Gagal membuat session", "error");
      }
    });
  }

  // Pairing Form
  const pairingForm = document.getElementById("pairingForm");
  if (pairingForm) {
    pairingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById("pairSession").value.trim();
      const phone = document.getElementById("pairPhone").value.trim();
      if (!sessionId || !phone) {
        Swal.fire("Error", "SessionId & Nomor WA wajib", "warning");
        return;
      }

      document.getElementById("qrModalTitle").innerText = `Pairing: ${sessionId}`;
      document.getElementById("qrContainer").innerHTML = loader;
      document.getElementById("qrNote").innerText = "";
      document.getElementById("qrModal").setAttribute("data-session", sessionId);
      new bootstrap.Modal(document.getElementById("qrModal")).show();

      const res = await fetch("/wa/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, phone })
      }).then((r) => r.json());

      if (res.success) {
        const digits = res.code.trim().split("");
        document.getElementById("qrContainer").innerHTML = `
          <div class="d-flex justify-content-center gap-2 pairing-code">
            ${digits.map((d, i) =>
              i === 4
                ? `<div class="pairing-dash">-</div><div class="pairing-box">${d}</div>`
                : `<div class="pairing-box">${d}</div>`
            ).join("")}
          </div>`;
        document.getElementById("qrNote").innerText =
          "Masukkan kode ini di WhatsApp → Perangkat Tertaut";
      } else {
        document.getElementById("qrContainer").innerHTML =
          `<div class="text-danger">❌ ${res.error || "Tidak bisa generate kode"}</div>`;
        Swal.fire("Error", res.error || "Tidak bisa generate kode", "error");
      }
    });
  }

  // Socket: QR update
  if (socket) {
    socket.on("wa_qr", ({ sessionId, qr }) => {
      const modal = document.getElementById("qrModal");
      const activeSession = modal.getAttribute("data-session");
      if (activeSession === sessionId) {
        const el = document.getElementById("qrContainer");
        el.innerHTML = "";
        new QRCode(el, { text: qr, width: 240, height: 240 });
        document.getElementById("qrNote").innerText =
          "📱 Scan QR ini di WhatsApp → Perangkat Tertaut";
      }
    });

    socket.on("wa_status", () => {
      loadSessions();
    });
  }

  // Init
  if (document.getElementById("sessions")) loadSessions();
});
