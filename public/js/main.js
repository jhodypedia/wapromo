document.addEventListener("DOMContentLoaded", () => {
  const socket = window.io ? io() : null;

  // Toastr setup
  toastr.options = {
    closeButton: true,
    progressBar: true,
    newestOnTop: true,
    positionClass: "toast-top-right",
    timeOut: "3000"
  };

  const container = document.getElementById("sessions");
  if (!container) return;

  /**
   * Render session card
   */
  function renderSessionCard(s) {
    return `
      <div class="col-sm-6 col-md-4 col-lg-3 session-card" id="session-${s.sessionId}">
        <div class="card h-100 d-flex flex-column">
          <div class="card-body flex-grow-1">
            <div class="fw-semibold">${s.label || s.sessionId}</div>
            <div class="small text-muted">ID: ${s.sessionId}</div>
            <span class="badge mt-2 bg-${
              s.status === "connected"
                ? "success"
                : s.status === "reconnecting"
                ? "warning"
                : "secondary"
            }">${s.status}</span>
          </div>
          <div class="card-footer d-flex justify-content-between">
            <button class="btn btn-sm btn-outline-primary open-session" data-session="${s.sessionId}">
              <i class="fa fa-qrcode me-1"></i>Buka
            </button>
            <button class="btn btn-sm btn-outline-danger delete-session" data-session="${s.sessionId}">
              <i class="fa fa-trash me-1"></i>Hapus
            </button>
          </div>
        </div>
      </div>`;
  }

  /**
   * Load daftar sessions
   */
  async function loadSessions() {
    try {
      const res = await fetch("/wa/connect/list");
      const sessions = await res.json();

      container.innerHTML = sessions.length
        ? sessions.map((s) => renderSessionCard(s)).join("")
        : `<div class="col-12 text-muted">Belum ada session, buat baru dulu.</div>`;

      bindSessionActions();
    } catch (err) {
      toastr.error("Gagal memuat session", "Error");
      console.error("❌ loadSessions error:", err);
    }
  }

  /**
   * Bind actions (open & delete)
   */
  function bindSessionActions() {
    container.querySelectorAll(".open-session").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sessionId = btn.dataset.session;
        openQrModal(sessionId, "Menunggu QR / Pairing...");
      });
    });

    container.querySelectorAll(".delete-session").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const sessionId = btn.dataset.session;
        const confirm = await Swal.fire({
          title: "Hapus Session?",
          text: `Apakah Anda yakin ingin menghapus session ${sessionId}?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Ya, hapus",
          cancelButtonText: "Batal",
          confirmButtonColor: "#d33",
          cancelButtonColor: "#6c757d"
        });

        if (confirm.isConfirmed) {
          try {
            const res = await fetch(`/wa/${sessionId}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
              toastr.success(`Session ${sessionId} berhasil dihapus`, "Deleted");

              // animasi fade-out
              const el = document.getElementById(`session-${sessionId}`);
              if (el) {
                el.style.transition = "all .4s ease";
                el.style.opacity = "0";
                el.style.transform = "scale(0.9)";
                setTimeout(() => el.remove(), 400);
              }
            } else {
              toastr.error(json.error || "Gagal menghapus session", "Error");
            }
          } catch (err) {
            toastr.error("Terjadi kesalahan server", "Error");
            console.error("❌ Delete session error:", err);
          }
        }
      });
    });
  }

  /**
   * Modal QR / Pairing
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
   * Form: Buat Session baru
   */
  const newSessionForm = document.getElementById("newSessionForm");
  if (newSessionForm) {
    newSessionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        sessionId: document.getElementById("sessionId").value.trim(),
        label: document.getElementById("label").value.trim()
      };

      bootstrap.Modal.getInstance(document.getElementById("sessionModal"))?.hide();
      openQrModal(data.sessionId, "Menunggu QR ...");

      try {
        const res = await fetch("/wa/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
          toastr.success("Session berhasil dibuat", "Berhasil");
          loadSessions();
        } else {
          toastr.error(json.error || "Gagal membuat session", "Error");
        }
      } catch (err) {
        toastr.error("Server error saat membuat session", "Error");
      }
    });
  }

  /**
   * Form: Pairing code
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

      try {
        const res = await fetch("/wa/pairing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, phone })
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
      } catch (err) {
        toastr.error("Server error saat generate pairing code", "Error");
      }
    });
  }

  /**
   * Socket listener
   */
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
        toastr.info("QR Code baru diterima", "Info");
      }
    });

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

  // Init
  loadSessions();
});
