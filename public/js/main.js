document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? io() : null;

  // 🔔 Toastr Config
  toastr.options = {
    closeButton: true,
    progressBar: true,
    newestOnTop: true,
    positionClass: "toast-top-right",
    timeOut: "3000"
  };

  /**
   * Load daftar sessions dari server
   */
  async function loadSessions() {
    try {
      const res = await fetch("/wa/connect/list");
      const sessions = await res.json();

      document.getElementById("sessions").innerHTML = sessions
        .map(
          (s) => `
          <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="card h-100 clickable" data-session="${s.sessionId}">
              <div class="card-body d-flex flex-column justify-content-between">
                <div>
                  <div class="fw-semibold">${s.label || s.sessionId}</div>
                  <div class="small text-muted">ID: ${s.sessionId}</div>
                </div>
                <span class="badge mt-2 bg-${
                  s.status === "connected"
                    ? "success"
                    : s.status === "reconnecting"
                    ? "warning"
                    : "secondary"
                }">${s.status}</span>
              </div>
            </div>
          </div>`
        )
        .join("");

      // klik session card → buka modal QR
      document.querySelectorAll(".clickable").forEach((el) => {
        el.addEventListener("click", () => {
          const sessionId = el.dataset.session;
          openQrModal(sessionId, "Menunggu QR ...");
        });
      });
    } catch (err) {
      toastr.error("Gagal memuat session", "Error");
      console.error("❌ loadSessions error:", err);
    }
  }

  /**
   * Buka modal utama QR / Pairing
   */
  function openQrModal(sessionId, message = "Loading...") {
    document.getElementById("qrModalTitle").innerText = `Session: ${sessionId}`;
    document.getElementById("qrContainer").innerHTML =
      `<div class="text-muted">${message}</div>`;
    document.getElementById("qrNote").innerText = "";
    document.getElementById("qrModal").setAttribute("data-session", sessionId);
    new bootstrap.Modal(document.getElementById("qrModal")).show();
  }

  /**
   * Form: Buat Session baru (mode QR)
   */
  const newSessionForm = document.getElementById("newSessionForm");
  if (newSessionForm) {
    newSessionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        sessionId: document.getElementById("sessionId").value.trim(),
        label: document.getElementById("label").value.trim(),
      };

      bootstrap.Modal.getInstance(document.getElementById("sessionModal"))?.hide();
      openQrModal(data.sessionId, "Menunggu QR ...");

      setTimeout(async () => {
        const res = await fetch("/wa/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          toastr.error("Gagal membuat session", "Error");
          document.getElementById("qrContainer").innerHTML =
            "<div class='text-danger'>Gagal membuat session</div>";
        } else {
          toastr.success("Session berhasil dibuat", "Berhasil");
        }
      }, 1000);
    });
  }

  /**
   * Form: Pairing code (kode asli dari Baileys)
   */
  const pairingForm = document.getElementById("pairingForm");
  if (pairingForm) {
    pairingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById("pairSession").value.trim();
      const phone = document.getElementById("pairPhone").value.trim();
      if (!sessionId || !phone) {
        toastr.warning("Isi SessionId & Nomor WA dulu", "Perhatian");
        return;
      }

      bootstrap.Modal.getInstance(document.getElementById("sessionModal"))?.hide();
      openQrModal(sessionId, "Menunggu kode pairing...");

      setTimeout(async () => {
        const res = await fetch("/wa/pairing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, phone }),
        }).then((r) => r.json());

        if (res.success) {
          document.getElementById("qrContainer").innerHTML = `
            <div class="p-3 bg-light rounded border fw-bold text-primary fs-4 animate__animated animate__fadeIn">
              ${res.code}
            </div>`;
          document.getElementById("qrNote").innerText =
            "Masukkan kode ini di WhatsApp → Perangkat Tertaut";
          toastr.success("Pairing code berhasil dibuat", "Berhasil");
        } else {
          document.getElementById("qrContainer").innerHTML =
            `<div class="text-danger">Gagal: ${res.error || "Tidak bisa generate kode"}</div>`;
          toastr.error(res.error || "Gagal generate pairing code", "Error");
        }
      }, 1000);
    });
  }

  /**
   * Socket.io listener
   */
  if (socket) {
    // update QR code
    socket.on("wa_qr", ({ sessionId, qr }) => {
      const modal = document.getElementById("qrModal");
      const activeSession = modal.getAttribute("data-session");
      if (activeSession === sessionId) {
        const el = document.getElementById("qrContainer");
        el.innerHTML = "";
        new QRCode(el, { text: qr, width: 220, height: 220 });
        document.getElementById("qrNote").innerText =
          "Scan QR ini di WhatsApp → Perangkat Tertaut";
        toastr.info("QR Code baru diterima", "Info");
      }
    });

    // update status
    socket.on("wa_status", ({ sessionId, status }) => {
      loadSessions();
      if (status === "connected") {
        toastr.success(`Session ${sessionId} tersambung`, "Connected");
      } else if (status === "reconnecting") {
        toastr.warning(`Session ${sessionId} mencoba reconnect`, "Reconnecting");
      } else if (status === "disconnected") {
        toastr.error(`Session ${sessionId} terputus`, "Disconnected");
      }
    });
  }

  // Init pertama kali
  if (document.getElementById("sessions")) loadSessions();
});
