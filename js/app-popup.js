(function () {
  "use strict";

  function ensureDialog() {
    let root = document.getElementById("srta-global-dialog");
    if (root) return root;

    root = document.createElement("div");
    root.id = "srta-global-dialog";
    root.className = "srta-dialog-backdrop";
    root.innerHTML = `
      <div class="srta-dialog-card" role="dialog" aria-modal="true" aria-labelledby="srta-global-title">
        <div class="srta-dialog-topbar"></div>
        <div class="srta-dialog-body">
          <div class="srta-dialog-icon">!</div>
          <h3 id="srta-global-title" class="srta-dialog-title">แจ้งเตือน</h3>
          <p class="srta-dialog-message"></p>
          <input class="srta-dialog-input" type="text" style="display:none" />
        </div>
        <div class="srta-dialog-actions">
          <button type="button" class="srta-dialog-btn secondary" data-role="cancel">ยกเลิก</button>
          <button type="button" class="srta-dialog-btn primary" data-role="ok">ตกลง</button>
        </div>
      </div>`;
    document.body.appendChild(root);
    return root;
  }

  function inferType(message, explicitType) {
    if (explicitType) return explicitType;
    const text = String(message || "");
    if (/สำเร็จ|เรียบร้อย|บันทึกแล้ว/i.test(text)) return "success";
    if (/ผิดพลาด|ไม่สำเร็จ|ไม่สามารถ|error/i.test(text)) return "error";
    return "warning";
  }

  function open(options) {
    const root = ensureDialog();
    const title = root.querySelector(".srta-dialog-title");
    const message = root.querySelector(".srta-dialog-message");
    const icon = root.querySelector(".srta-dialog-icon");
    const input = root.querySelector(".srta-dialog-input");
    const cancel = root.querySelector('[data-role="cancel"]');
    const ok = root.querySelector('[data-role="ok"]');

    const type = inferType(options.message, options.type);
    const icons = { success: "✓", error: "×", warning: "!", confirm: "?", prompt: "✎" };
    root.className = "srta-dialog-backdrop " + type;
    title.textContent = options.title || (type === "success" ? "ดำเนินการสำเร็จ" : type === "error" ? "เกิดข้อผิดพลาด" : "แจ้งเตือน");
    message.textContent = String(options.message || "");
    icon.textContent = icons[options.mode] || icons[type] || "i";
    cancel.style.display = options.mode === "alert" ? "none" : "inline-flex";
    input.style.display = options.mode === "prompt" ? "block" : "none";
    input.value = options.defaultValue || "";
    input.placeholder = options.placeholder || "";
    ok.textContent = options.okText || "ตกลง";
    cancel.textContent = options.cancelText || "ยกเลิก";

    return new Promise(function (resolve) {
      let settled = false;
      function close(value) {
        if (settled) return;
        settled = true;
        root.classList.remove("is-open");
        document.removeEventListener("keydown", keyHandler);
        setTimeout(function () { resolve(value); }, 170);
      }
      function keyHandler(event) {
        if (event.key === "Escape") close(options.mode === "prompt" ? null : false);
        if (event.key === "Enter" && options.mode === "prompt") close(input.value);
      }
      ok.onclick = function () { close(options.mode === "prompt" ? input.value : true); };
      cancel.onclick = function () { close(options.mode === "prompt" ? null : false); };
      root.onclick = function (event) {
        if (event.target === root && options.mode !== "alert") close(options.mode === "prompt" ? null : false);
      };
      document.addEventListener("keydown", keyHandler);
      requestAnimationFrame(function () {
        root.classList.add("is-open");
        setTimeout(function () { (options.mode === "prompt" ? input : ok).focus(); }, 60);
      });
    });
  }

  const api = {
    alert: function (message, title, type) { return open({ mode: "alert", message, title, type }); },
    confirm: function (message, title) { return open({ mode: "confirm", message, title: title || "ยืนยันการทำรายการ", type: "warning" }); },
    prompt: function (message, defaultValue, title) { return open({ mode: "prompt", message, defaultValue, title: title || "กรอกข้อมูล", type: "warning" }); }
  };

  window.SRTAAppPopup = api;
  window.showGlobalPopup = api.alert;
  window.showGlobalConfirm = api.confirm;
  window.showGlobalPrompt = api.prompt;
  window.alert = function (message) { api.alert(message); };
})();
