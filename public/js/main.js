document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? io() : null;

  // ========================
  // RENDER SESSION CARD
  // ========================
  function renderSession(s) {
    return `
      <div class="col-md-4">
        <div class="card h-100 clickable" data-session="${s.sessionId}">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <div class="fw-semibold">${s.label || s.sessionId}</div>
                <div class="small text-muted">ID: ${s.sessionId}</div>
              </div>
              <span class="badge bg-${
                s.status === "connected"
                  ? "success"
                  : s.status === "reconnecting"
                  ? "warning"
                  : "secondary"
              }">${s.status}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ========================
  // LOAD SESSION LIST
  // ========================
  async function loadSessions() {
    try {
      const res = await fetch("/wa/connect/list");
      const sessions = await res.json();
      document.getElementById("sessions").innerHTML = sessions
        .map(renderSession)
        .join("");

      // klik card → buka modal QR
      document.querySelectorAll(".clickable").forEach((el) => {
        el.addEventListener("click", () => {
          const sessionId = el.dataset.session;
          document.getElementById("qrModalTitle").innerText = `Session: ${sessionId}`;
          document.getElementById("qrContainer").innerHTML =
            "<div class='text-muted'>Menunggu QR / Pairing code...</div>";
          document.getElementById("qrNote").innerText = "";
          document.getElementById("qrModal").setAttribute("data-session", sessionId);
          new bootstrap.Modal(document.getElementById("qrModal")).show();
        });
      });
    } catch (e) {
      toastr.error("Gagal memuat session");
    }
  }

  // ========================
  // BUAT SESSION
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
  // PAIRING FORM
  // ========================
  const pairingForm = document.getElementById("pairingForm");
  if (pairingForm) {
    pairingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById("pairSession").value.trim();
      const phone = document.getElementById("pairPhone").value.trim();
      if (!sessionId || !phone) {
        Swal.fire({ icon: "error", title: "Data kosong", text: "SessionId & Nomor WA wajib" });
        return;
      }
      try {
        const res = await fetch("/wa/pairing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, phone }),
        }).then((r) => r.json());

        if (res.success) {
          // tampilkan di modal QR juga
          document.getElementById("qrModalTitle").innerText = `Pairing: ${sessionId}`;
          document.getElementById("qrContainer").innerHTML = `
            <div class="h3 text-primary">${res.code}</div>`;
          document.getElementById("qrNote").innerText =
            "Masukkan kode ini di WhatsApp → Perangkat Tertaut";
          document.getElementById("qrModal").setAttribute("data-session", sessionId);
          new bootstrap.Modal(document.getElementById("qrModal")).show();
          bootstrap.Modal.getInstance(document.getElementById("pairingModal")).hide();
        } else {
          Swal.fire({ icon: "error", title: "Gagal", text: res.error || "Error" });
        }
      } catch (err) {
        Swal.fire({ icon: "error", title: "Server Error", text: err.message });
      }
    });
  }

  // ========================
  // SOCKET.IO LISTENERS
  // ========================
  if (socket) {
    socket.on("wa_qr", ({ sessionId, qr }) => {
      const modal = document.getElementById("qrModal");
      const activeSession = modal.getAttribute("data-session");
      if (activeSession === sessionId) {
        const el = document.getElementById("qrContainer");
        el.innerHTML = "";
        new QRCode(el, { text: qr, width: 220, height: 220 });
        document.getElementById("qrNote").innerText =
          "Scan QR ini di WhatsApp → Perangkat Tertaut";
        toastr.info("QR baru untuk " + sessionId);
      }
    });

    socket.on("wa_status", ({ sessionId, status }) => {
      toastr.success(`Session ${sessionId}: ${status}`);
      loadSessions();
    });
  }

  // ========================
  // INIT LOAD
  // ========================
  if (document.getElementById("sessions")) {
    loadSessions();
  }
});
