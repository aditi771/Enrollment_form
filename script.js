// =============================
// CONFIG
// =============================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxpxzNAlknNTmiKLkCk2xOsMXl0MnFyRX3UCBuQ24aelWkoGPdQ-yPIIBF_-_sZPOU/exec";

// Footer year
document.getElementById("yr").textContent = new Date().getFullYear();

// =============================
// FILE STORE
// =============================
const fileStore = {};

// =============================git cogit commit
// FILE → BASE64 HELPER
// =============================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]); // strip data:...;base64,
    reader.onerror = () => reject(new Error("Could not read file: " + file.name));
    reader.readAsDataURL(file);
  });
}

// =============================
// PROGRESS BAR
// =============================
const REQUIRED_TEXT_IDS = [
  "firstName", "lastName", "relName", "dob", "pob",
  "bloodGroup", "mobile", "email", "doj",
  "currentAddr", "permAddr", "emergencyName", "emergencyNumber"
];
const REQUIRED_RADIO_NAMES = ["currentAddrType", "permAddrType"];
const REQUIRED_FILE_IDS    = ["aadharFile", "panFile", "photoFile", "signFile"];
const REQUIRED_CHECK_IDS   = ["declaration"];

function updateProgress() {
  let filled = 0;
  const total =
    REQUIRED_TEXT_IDS.length +
    REQUIRED_RADIO_NAMES.length +
    REQUIRED_FILE_IDS.length +
    REQUIRED_CHECK_IDS.length;

  REQUIRED_TEXT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value.trim()) filled++;
  });

  REQUIRED_RADIO_NAMES.forEach(name => {
    if (document.querySelector(`input[name="${name}"]:checked`)) filled++;
  });

  REQUIRED_FILE_IDS.forEach(id => {
    if (fileStore[id]) filled++;
  });

  REQUIRED_CHECK_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.checked) filled++;
  });

  const pct = Math.min(100, Math.round((filled / total) * 100));
  document.getElementById("progressFill").style.width  = pct + "%";
  document.getElementById("progressLabel").textContent = pct + "% Complete";
}

// Wire up live progress updates
REQUIRED_TEXT_IDS.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", updateProgress);
});
REQUIRED_RADIO_NAMES.forEach(name => {
  document.querySelectorAll(`input[name="${name}"]`)
    .forEach(r => r.addEventListener("change", updateProgress));
});
REQUIRED_CHECK_IDS.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("change", updateProgress);
});

// =============================
// DRAG & DROP
// =============================
document.querySelectorAll(".drop-zone").forEach(zone => {
  const input   = zone.querySelector(".dz-input");
  const preview = zone.querySelector(".dz-preview");
  const field   = input.id;

  zone.addEventListener("click", e => {
    if (e.target !== input) input.click();
  });

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
      fileStore[field] = file;
      showPreview(file, zone, preview);
      updateProgress();
    }
  });

  zone.addEventListener("dragover", e => {
    e.preventDefault();
    zone.classList.add("drag-over");
  });

  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));

  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) {
      fileStore[field] = file;
      showPreview(file, zone, preview);
      updateProgress();
    }
  });
});

// =============================
// PREVIEW
// =============================
function showPreview(file, zone, preview) {
  zone.classList.add("has-file");
  preview.innerHTML = "";

  if (file.type.startsWith("image")) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  }

  const name = document.createElement("div");
  name.textContent = file.name;
  preview.appendChild(name);
}

// =============================
// RESET
// =============================
function resetForm() {
  // Clear file store
  Object.keys(fileStore).forEach(k => delete fileStore[k]);

  // Clear previews and drop-zone states
  document.querySelectorAll(".dz-preview").forEach(p => p.innerHTML = "");
  document.querySelectorAll(".drop-zone").forEach(z => z.classList.remove("has-file"));

  // Reset progress bar
  document.getElementById("progressFill").style.width  = "0%";
  document.getElementById("progressLabel").textContent = "0% Complete";
}

// =============================
// FORM SUBMIT — base64 approach
// No separate upload call; all files are base64-encoded inside the
// single JSON POST, so there are zero CORS issues.
// =============================
document.getElementById("enrollmentForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const btn = document.getElementById("submitBtn");
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Encoding files…';
  btn.disabled  = true;

  try {
    // ── Encode files to base64 ──────────────────────────────────────
    const encodeFile = async (id) => {
      const file = fileStore[id];
      if (!file) return null;
      const b64 = await fileToBase64(file);
      return { name: file.name, mimeType: file.type, data: b64 };
    };

    const [aadharFile, panFile, photoFile, signFile,
           relievingFile, experienceFile] = await Promise.all([
      encodeFile("aadharFile"),
      encodeFile("panFile"),
      encodeFile("photoFile"),
      encodeFile("signFile"),
      encodeFile("relievingFile"),
      encodeFile("experienceFile"),
    ]);

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';

    // ── Collect address type radios ─────────────────────────────────
    const currentAddrTypeEl = document.querySelector("input[name='currentAddrType']:checked");
    const permAddrTypeEl    = document.querySelector("input[name='permAddrType']:checked");

    // ── Build payload ───────────────────────────────────────────────
    const payload = {
      firstName:       document.getElementById("firstName").value.trim(),
      lastName:        document.getElementById("lastName").value.trim(),
      relName:         document.getElementById("relName").value.trim(),
      dob:             document.getElementById("dob").value,
      pob:             document.getElementById("pob").value.trim(),
      bloodGroup:      document.getElementById("bloodGroup").value,
      mobile:          document.getElementById("mobile").value.trim(),
      email:           document.getElementById("email").value.trim(),
      doj:             document.getElementById("doj").value,
      currentAddrType: currentAddrTypeEl ? currentAddrTypeEl.value : "",
      currentAddr:     document.getElementById("currentAddr").value.trim(),
      permAddrType:    permAddrTypeEl ? permAddrTypeEl.value : "",
      permAddr:        document.getElementById("permAddr").value.trim(),
      emergencyName:   document.getElementById("emergencyName").value.trim(),
      emergencyNumber: document.getElementById("emergencyNumber").value.trim(),
      dlNumber:        document.getElementById("dlNumber").value.trim(),
      passportNumber:  document.getElementById("passportNumber").value.trim(),

      // File objects (base64)
      aadharFile,
      panFile,
      photoFile,
      signFile,
      relievingFile,
      experienceFile,
    };

    // ── Send to Apps Script ─────────────────────────────────────────
    // IMPORTANT: Do NOT set Content-Type: application/json.
    // That triggers a CORS preflight OPTIONS request which Apps Script
    // does not handle, causing "Failed to fetch".
    // Sending as plain text (the default for a string body) skips the
    // preflight entirely. Apps Script still receives the JSON string
    // via e.postData.contents and we parse it server-side.
    const res  = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body:   JSON.stringify(payload),
    });

    const text = await res.text();
    const data = JSON.parse(text);

    if (data.status === "duplicate") {
      alert("A record with this email or mobile number already exists.");
    } else if (data.status === "success") {
      document.getElementById("enrollmentForm").reset();
      resetForm();
      showSuccess();
    } else {
      alert("Submission failed: " + (data.message || "Unknown error"));
    }

  } catch (err) {
    console.error(err);
    alert("An error occurred. Please try again.\n\n" + err.message);
  }

  btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Enrollment';
  btn.disabled  = false;
});

// =============================
// MODAL
// =============================
function showSuccess() {
  document.getElementById("successModal").classList.add("visible");
}

function closeModal() {
  document.getElementById("successModal").classList.remove("visible");
}
