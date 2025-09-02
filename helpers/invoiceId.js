import Counter from "../models/counter.js";

export async function getNextInvoiceId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "invoice" },
    { $inc: { value: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  // if it was just created, MongoDB will not have "value" set yet → fix it
  if (!counter.value) {
    counter = new Counter({ name: "invoice", value: 1001 });
    await counter.save();
  }

  // Always offset by 1000
  const invoiceNumber = 1000 + counter.value;

  return `INV-${invoiceNumber}`;
}
