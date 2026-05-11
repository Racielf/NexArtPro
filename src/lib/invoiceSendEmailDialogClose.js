import { base44 } from "@/api/base44Client";

// UX safety net for the invoice Send Email dialog.
// The component already closes the dialog after status update, but in production QA
// the email can be delivered while the modal remains open. This wrapper closes only
// after Core.SendEmail resolves successfully; failures keep the dialog open.
const WRAPPED_FLAG = "__nexartInvoiceSendEmailDialogCloseWrapped";

function findInvoiceSendDialog() {
  return Array.from(document.querySelectorAll('[role="dialog"]'))
    .find((dialog) => /Send Invoice Email|Resend Invoice Email/i.test(dialog.textContent || ""));
}

function closeInvoiceSendDialog() {
  const dialog = findInvoiceSendDialog();
  if (!dialog) return;

  const buttons = Array.from(dialog.querySelectorAll("button"));
  const closeButton = buttons.find((button) => {
    const label = (button.getAttribute("aria-label") || "").toLowerCase();
    const title = (button.getAttribute("title") || "").toLowerCase();
    const text = (button.textContent || "").trim().toLowerCase();
    return label.includes("close") || title.includes("close") || text === "×" || text === "x";
  });

  if (closeButton) {
    closeButton.click();
    return;
  }

  document.dispatchEvent(new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    keyCode: 27,
    which: 27,
    bubbles: true,
    cancelable: true,
  }));
}

function wrapInvoiceSendEmailDialogClose() {
  const sendEmail = base44?.integrations?.Core?.SendEmail;
  if (typeof sendEmail !== "function" || sendEmail[WRAPPED_FLAG]) return;

  const wrapped = async (...args) => {
    const result = await sendEmail(...args);
    window.setTimeout(closeInvoiceSendDialog, 0);
    return result;
  };

  wrapped[WRAPPED_FLAG] = true;
  base44.integrations.Core.SendEmail = wrapped;
}

wrapInvoiceSendEmailDialogClose();
