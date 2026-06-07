(function () {
  let currentArea = "cashier";
  let currentState = "pre-notification";
  let unblockStage = 0;

  const els = {
    areaSeg: document.getElementById("area-seg"),
    stateList: document.getElementById("state-list"),
    caption: document.getElementById("stage-caption"),

    cashierBanner: document.getElementById("cashier-banner"),
    cashierGrid: document.getElementById("cashier-pos-grid"),
    cashierCta: document.getElementById("cashier-cta"),
    cashierLock: document.getElementById("cashier-lock"),
    cashierNotifyBtn: document.getElementById("cashier-notify-btn"),

    consoleBanner: document.getElementById("console-banner"),
    consoleGrid: document.getElementById("console-main-grid"),
    consoleCtaZone: document.getElementById("console-cta-zone"),
    consoleLock: document.getElementById("console-lock"),
    consoleLockIcon: document.getElementById("console-lock-icon"),
    consoleLockTitle: document.getElementById("console-lock-title"),
    consoleLockDesc: document.getElementById("console-lock-desc"),
    consoleLockCta: document.getElementById("console-lock-cta"),
    consoleNavInvoices: document.getElementById("console-nav-invoices"),
    consoleNavLicense: document.getElementById("console-nav-license"),
    unblockWidget: document.getElementById("unblock-widget"),
  };

  function renderUnblockWidget(restricted) {
    const el = els.unblockWidget;
    el.innerHTML = "";

    if (!restricted) {
      return;
    }

    const stage = UNBLOCK_STAGES[unblockStage];

    if (stage.type === "action") {
      const btn = document.createElement("button");
      btn.className = "unblock-btn";
      btn.textContent = stage.label;
      btn.addEventListener("click", () => {
        flash(stage.flash);
        unblockStage = stage.next;
        renderUnblockWidget(true);
      });
      el.appendChild(btn);

      const note = document.createElement("p");
      note.className = "unblock-note";
      note.textContent = stage.note;
      el.appendChild(note);
    } else if (stage.type === "exhausted") {
      const status = document.createElement("div");
      status.className = "unblock-status tone-" + stage.tone;
      status.innerHTML = "<span>" + stage.icon + "</span><span>" + stage.text + "</span>";
      el.appendChild(status);

      const payBtn = document.createElement("button");
      payBtn.className = "unblock-btn";
      payBtn.textContent = "Pay invoice now";
      payBtn.addEventListener("click", () => handleAction("invoices"));
      el.appendChild(payBtn);
    } else {
      const status = document.createElement("div");
      status.className = "unblock-status tone-" + stage.tone;
      status.innerHTML = "<span>" + stage.icon + "</span><span>" + stage.text + "</span>";
      el.appendChild(status);

      const disabledBtn = document.createElement("button");
      disabledBtn.className = "unblock-btn";
      disabledBtn.textContent = "Unblock now";
      disabledBtn.disabled = true;
      el.appendChild(disabledBtn);

      const simulateBtn = document.createElement("button");
      simulateBtn.className = "unblock-simulate-link";
      simulateBtn.textContent = stage.simulateLabel;
      simulateBtn.addEventListener("click", () => {
        flash(stage.simulateFlash);
        unblockStage = stage.next;
        renderUnblockWidget(true);
      });
      el.appendChild(simulateBtn);
    }
  }

  function renderBanner(el, banner) {
    el.className = "banner";
    el.innerHTML = "";
    if (!banner) {
      return;
    }
    el.classList.add("show", "tone-" + banner.tone);

    const icon = document.createElement("span");
    icon.className = "banner-icon";
    icon.textContent = banner.icon;

    const text = document.createElement("span");
    text.className = "banner-text";
    text.innerHTML = banner.html;

    el.appendChild(icon);
    el.appendChild(text);

    if (banner.cta) {
      const btn = document.createElement("button");
      btn.className = "banner-cta";
      btn.innerHTML = "<span>" + banner.cta.label + "</span>";
      btn.addEventListener("click", () => handleAction(banner.cta.action));
      el.appendChild(btn);
    }
  }

  function renderCashier(def) {
    renderBanner(els.cashierBanner, def.banner);

    els.cashierGrid.classList.toggle("dimmed", def.access === "soft");
    els.cashierLock.classList.toggle("show", def.access === "hard");

    if (def.cta) {
      els.cashierCta.style.display = "";
      els.cashierCta.textContent = def.cta.label;
      els.cashierCta.className = "pos-pay-btn" + (def.cta.mode === "alert" ? " alert" : def.cta.mode === "muted" ? " muted" : "");
    } else {
      els.cashierCta.style.display = "none";
    }
  }

  function renderConsole(def) {
    renderBanner(els.consoleBanner, def.banner);

    const restricted = def.access.startsWith("restricted");
    els.consoleGrid.classList.toggle("dimmed", restricted);
    els.consoleLock.classList.toggle("show", restricted);
    renderUnblockWidget(restricted);

    // Reset nav emphasis
    els.consoleNavInvoices.className = "nav-item";
    els.consoleNavLicense.className = "nav-item";

    els.consoleCtaZone.innerHTML = "";
    if (def.cta) {
      const card = document.createElement("div");
      card.className = "cta-card tone-" + def.cta.tone;
      card.innerHTML =
        '<span class="cta-text"><strong>' + def.cta.title + "</strong>" + def.cta.body + "</span>";
      const btn = document.createElement("button");
      btn.textContent = def.cta.button;
      btn.addEventListener("click", () => handleAction(def.cta.action));
      card.appendChild(btn);
      els.consoleCtaZone.appendChild(card);
    }

    if (def.access === "restricted-soft") {
      els.consoleLockIcon.textContent = "🔒";
      els.consoleLockTitle.textContent = "Access restricted";
      els.consoleLockDesc.textContent = "Most pages are locked until your invoice is settled. You can still reach Invoices to pay, and unblocking-related notifications.";
      els.consoleLockCta.textContent = "Go to invoices";
      els.consoleLockCta.onclick = () => handleAction("invoices");
      els.consoleNavInvoices.classList.add("nav-emphasis");
      els.consoleNavLicense.classList.add("nav-locked");
    } else if (def.access === "restricted-hard") {
      els.consoleLockIcon.textContent = "⛔";
      els.consoleLockTitle.textContent = "Console locked";
      els.consoleLockDesc.textContent = "Access is blocked except for the License page (to make a payment) and unblocking-related notifications.";
      els.consoleLockCta.textContent = "Go to license";
      els.consoleLockCta.onclick = () => handleAction("license");
      els.consoleNavInvoices.classList.add("nav-locked");
      els.consoleNavLicense.classList.add("nav-emphasis");
    }
  }

  function handleAction(action) {
    const labels = {
      notify: "🔔 Notification sent to the merchant owner about the subscription status.",
      invoices: "🧾 Navigating to Invoices & billing…",
      license: "🔑 Navigating to the License page to complete payment…",
    };
    flash(labels[action] || "Action triggered.");
  }

  let flashTimer = null;
  function flash(message) {
    els.caption.textContent = message;
    els.caption.style.color = "var(--foodics-primary)";
    els.caption.style.fontWeight = "700";
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      els.caption.style.color = "";
      els.caption.style.fontWeight = "";
      renderCaption();
    }, 2200);
  }

  function renderCaption() {
    els.caption.textContent = STATES[currentState].caption;
  }

  function render() {
    document.querySelectorAll("[data-area-screen]").forEach((screen) => {
      screen.classList.toggle("hidden", screen.dataset.areaScreen !== currentArea);
    });

    const def = STATES[currentState];
    renderCashier(def.cashier);
    renderConsole(def.console);
    renderCaption();
  }

  els.areaSeg.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    currentArea = btn.dataset.area;
    els.areaSeg.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });

  els.stateList.addEventListener("click", (e) => {
    const btn = e.target.closest(".state-item");
    if (!btn) return;
    currentState = btn.dataset.state;
    els.stateList.querySelectorAll(".state-item").forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });

  els.cashierCta.addEventListener("click", () => {
    const def = STATES[currentState].cashier;
    if (def.access === "soft") {
      flash("⚠️ Order charged — but the owner has been reminded that payment is overdue.");
    } else if (def.access === "full") {
      flash("✅ Order charged successfully.");
    }
  });

  els.cashierNotifyBtn.addEventListener("click", () => handleAction("notify"));

  render();
})();
