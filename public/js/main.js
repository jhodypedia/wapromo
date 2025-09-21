document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? io() : null;

  // ========================
  // UTIL RENDER SESSION CARD
  // ========================
  function renderSession(s) {
    return `
      <div class="col-md-4">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="fw-semibold">${s.label || s.sessionId}</div>
                <div class="small text-muted">ID: ${s.sessionId}</div>
              </div>
              <span class="badge bg-${s.status === "connected" ? "success" : s.status === "reconnecting" ? "warning" : "secondary"}">${s.status}</span>
            </div>
            <hr>
            <div id="qr-${s.sessionId}" class="text-center"></div>
            <div class="small text-muted mt-2 text-center">Scan QR via WhatsApp → Perangkat Tertaut</div>
          </div>
        </div>
      </div>
    `;
  }

  // ========================
  // LOAD SESSION LIST (AJAX)
  // ========================
  async function loadSessions() {
    try {
      const res = await fetch("/wa/connect/list");
      const sessions = await res.json();
      document.getElementById("sessions").innerHTML = sessions.map(renderSession).join("");
    } catch (e) {
      console.error(e);
      toastr.error("Gagal memuat session");
    }
  }

  // ========================
  // EVENT: BUAT SESSION
  // ========================
  const newSessionForm = document.getElementById("newSessionForm");
  if (newSessionForm) {
    newSessionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        sessionId: document.getElementById("sessionId").value.trim(),
        label: document.getElementById("label").value.trim(),
      };
      const res = await fetch("/wa/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toastr.success("Session dibuat");
        loadSessions();
        bootstrap.Modal.getInstance(document.getElementById("newSession")).hide();
      } else {
        toastr.error("Gagal membuat session");
      }
    });
  }

  // ========================
  // EVENT: PAIRING FORM
  // ========================
  const pairingForm = document.getElementById("pairingForm");
  if (pairingForm) {
    pairingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById("pairSession").value.trim();
      const phone = document.getElementById("pairPhone").value.trim();
      const res = await fetch("/wa/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, phone }),
      }).then((r) => r.json());

      if (res.success) {
        document.getElementById("pairResult").innerHTML = `
          <div class="h4 text-primary">${res.code}</div>
          <div>Masukkan kode ini di WhatsApp → Perangkat Tertaut</div>`;
      } else {
        Swal.fire({ icon: "error", title: "Gagal", text: res.error || "Error" });
      }
    });
  }

  // ========================
  // SOCKET.IO LISTENERS
  // ========================
  if (socket) {
    socket.on("wa_qr", ({ sessionId, qr }) => {
      const el = document.getElementById(`qr-${sessionId}`);
      if (el) {
        el.innerHTML = "";
        new QRCode(el, { text: qr, width: 220, height: 220 });
        toastr.info("QR baru untuk " + sessionId);
      }
    });

    socket.on("wa_status", ({ sessionId, status }) => {
      toastr.success(`Session ${sessionId}: ${status}`);
      loadSessions(); // refresh status di card
    });
  }

  // load pertama kali
  if (document.getElementById("sessions")) {
    loadSessions();
  }
});
