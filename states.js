// Definitions for the 5 RMS subscription lifecycle states, per experience (cashier / console).
// Mirrors the product spec:
//   Pre-notification -> Pre-renewal -> Grace period -> Soft block -> Hard block.

const STATES = {
  "pre-notification": {
    label: "Pre-notification",
    caption: "Subscription is healthy and far from its renewal date. Full access for both Cashier and Console — no banners, no warnings, business as usual.",
    cashier: {
      banner: null,
      access: "full",
      cta: { label: "Charge order", mode: "normal" }
    },
    console: {
      banner: null,
      access: "full",
      cta: null
    }
  },

  "pre-renewal": {
    label: "Pre-renewal",
    caption: "Payment date is approaching. Both experiences keep full access but show a countdown banner reminding the merchant to pay soon — pay if permitted, otherwise notify someone who can.",
    cashier: {
      banner: {
        tone: "blue",
        icon: "⏳",
        html: "<strong>3 days left</strong> until your subscription payment is due — full access continues. Ask the owner to settle the invoice in time.",
        cta: { label: "Notify owner", action: "notify" }
      },
      access: "full",
      cta: { label: "Charge order", mode: "normal" }
    },
    console: {
      banner: {
        tone: "blue",
        icon: "⏳",
        html: "<strong>3 days left</strong> until your subscription payment is due. Pay now to avoid any interruption.",
        cta: { label: "Pay now", action: "invoices" }
      },
      access: "full",
      cta: {
        tone: "blue",
        title: "Renewal due in 3 days",
        body: "Settle the upcoming invoice now to keep uninterrupted access for your whole team.",
        button: "Go to invoices",
        action: "invoices"
      }
    }
  },

  "grace-period": {
    label: "Grace period",
    caption: "Payment is overdue and the merchant is in the grace period. Both experiences keep full access but show a countdown banner reminding the merchant to pay soon — pay if permitted, otherwise notify someone who can.",
    cashier: {
      banner: {
        tone: "green",
        icon: "⏳",
        html: "<strong>Payment overdue.</strong> You have <strong>3 days left</strong> of grace-period access. Ask the owner to settle the invoice before it ends.",
        cta: { label: "Notify owner", action: "notify" }
      },
      access: "full",
      cta: { label: "Charge order", mode: "normal" }
    },
    console: {
      banner: {
        tone: "green",
        icon: "⏳",
        html: "<strong>Payment overdue.</strong> You have <strong>3 days left</strong> of grace-period access. Pay now to avoid interruption.",
        cta: { label: "Pay now", action: "invoices" }
      },
      access: "full",
      cta: {
        tone: "green",
        title: "Grace period — 3 days left",
        body: "Your payment is overdue but full access continues for now. Settle the invoice before the grace period ends.",
        button: "Go to invoices",
        action: "invoices"
      }
    }
  },

  "soft-block": {
    label: "Soft block",
    caption: "Payment is far overdue and the grace period is over. The cashier can still process orders but sees a persistent warning banner with a soft-blocked visual treatment. The console becomes restricted — most pages are locked except Invoices/billing and unblocking-related areas.",
    cashier: {
      banner: {
        tone: "yellow",
        icon: "⚠️",
        html: "<strong>Payment overdue.</strong> Access is allowed for now, but will be blocked soon. Please ask the owner to settle the subscription invoice.",
        cta: { label: "Notify owner", action: "notify" }
      },
      access: "soft",
      cta: { label: "Charge order (grace mode)", mode: "alert" }
    },
    console: {
      banner: {
        tone: "yellow",
        icon: "⚠️",
        html: "<strong>Payment overdue.</strong> Console access is restricted to billing and unblocking pages until the invoice is settled.",
        cta: { label: "Pay now", action: "invoices" }
      },
      access: "restricted-soft",
      cta: {
        tone: "yellow",
        title: "Restricted access",
        body: "Most pages are locked. You can still reach the Invoices page to enable payment, and any unblocking-related notifications.",
        button: "Go to invoices",
        action: "invoices"
      }
    }
  },

  "hard-block": {
    label: "Hard block",
    caption: "Subscription is fully overdue. The cashier can no longer operate the POS but can still notify the owner. The console is locked except for the License page (payment) and unblocking notifications.",
    cashier: {
      banner: {
        tone: "red",
        icon: "⛔",
        html: "<strong>POS blocked.</strong> Your subscription is overdue and the cashier can no longer process orders.",
        cta: null
      },
      access: "hard",
      cta: null
    },
    console: {
      banner: {
        tone: "red",
        icon: "⛔",
        html: "<strong>Console locked.</strong> Access is blocked except for the License page where you can make a payment.",
        cta: { label: "Go to license", action: "license" }
      },
      access: "restricted-hard",
      cta: null
    }
  }
};

// Stage machine for the "Unblock" button (Console, shown only while soft/hard blocked).
// The click count is remembered globally — it represents the merchant's unblock history,
// independent of which lifecycle state is currently being viewed in the demo.
//   0, 2, 4 -> an actionable "Unblock now" button (1st, 2nd, 3rd use)
//   1       -> 1st use granted: 5 days of normal access, confirmation shown
//   3       -> 2nd use: SF request sent to Team A, button disabled until they act
//   5       -> 3rd use: SF request sent to Team B, button disabled until they act
//   6       -> all self-service unblocks exhausted: button is gone for good,
//              the merchant must pay the invoice to restore access
const UNBLOCK_STAGES = [
  {
    type: "action",
    label: "Unblock now",
    note: "First use restores full, normal access for 5 days.",
    flash: "✅ Unblocked — full access restored for the next 5 days.",
    next: 1,
  },
  {
    type: "status",
    tone: "success",
    icon: "✅",
    text: "Unblocked — you have normal access for the next 5 days. The button will return once that period ends.",
    simulateLabel: "Simulate: 5 days pass — blocked again",
    simulateFlash: "⏰ 5 days have passed — the merchant is blocked again.",
    next: 2,
  },
  {
    type: "action",
    label: "Unblock now",
    note: "Next use will create an SF request and route it to Team A.",
    flash: "🧾 SF request created and routed to Team A. Button disabled until they unblock you.",
    next: 3,
  },
  {
    type: "status",
    tone: "pending",
    icon: "⏳",
    text: "An SF request is with Team A. The button stays disabled until they unblock the account.",
    simulateLabel: "Simulate: Team A unblocks the account",
    simulateFlash: "🔓 Team A resolved the SF request — account unblocked.",
    next: 4,
  },
  {
    type: "action",
    label: "Unblock now",
    note: "Next use will create an SF request and route it to Team B.",
    flash: "🧾 SF request created and routed to Team B. Button disabled until they unblock you.",
    next: 5,
  },
  {
    type: "status",
    tone: "pending",
    icon: "⏳",
    text: "An SF request is with Team B. The button stays disabled until they unblock the account.",
    simulateLabel: "Simulate: Team B unblocks the account",
    simulateFlash: "🔓 Team B resolved the SF request — account unblocked.",
    next: 6,
  },
  {
    type: "exhausted",
    tone: "pending",
    icon: "🚫",
    text: "All self-service unblock options have been used. The merchant must settle the outstanding invoice to restore access — no more unblock requests can be made from here.",
  },
];

const AREAS = ["cashier", "console"];
const STATE_ORDER = ["pre-notification", "pre-renewal", "grace-period", "soft-block", "hard-block"];
