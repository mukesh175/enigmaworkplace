"use client";

import { useState } from "react";

type Row = { description: string; hsnSac: string; quantity: number; rate: number };

export default function InvoiceLineItems({
  initialItems,
}: {
  initialItems?: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(
    initialItems && initialItems.length > 0
      ? initialItems
      : [
          { description: "", hsnSac: "", quantity: 1, rate: 0 },
          { description: "", hsnSac: "", quantity: 1, rate: 0 },
          { description: "", hsnSac: "", quantity: 1, rate: 0 },
        ]
  );

  function addRow() {
    setRows((r) => [...r, { description: "", hsnSac: "", quantity: 1, rate: 0 }]);
  }

  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="grid grid-cols-12 gap-2 mb-2 text-xs text-base-400">
        <div className="col-span-5">Description</div>
        <div className="col-span-2">HSN/SAC</div>
        <div className="col-span-2">Qty</div>
        <div className="col-span-2">Rate (INR)</div>
        <div className="col-span-1"></div>
      </div>

      {rows.map((row, i) => (
        <div className="grid grid-cols-12 gap-2 mb-2" key={i}>
          <input
            name="itemDescription"
            defaultValue={row.description}
            className="input col-span-5"
            placeholder="e.g. Performance Marketing Budget"
          />
          <input name="itemHsn" defaultValue={row.hsnSac} className="input col-span-2" placeholder="998365" />
          <input name="itemQuantity" type="number" step="0.5" min="0" defaultValue={row.quantity} className="input col-span-2" />
          <input name="itemRate" type="number" step="0.01" min="0" defaultValue={row.rate} className="input col-span-2" placeholder="0.00" />
          <button
            type="button"
            onClick={() => removeRow(i)}
            disabled={rows.length <= 1}
            className="col-span-1 text-base-500 hover:text-danger disabled:opacity-30 flex items-center justify-center"
            title="Remove line"
          >
            ✕
          </button>
        </div>
      ))}

      <button type="button" onClick={addRow} className="text-signal text-sm hover:underline mt-1">
        + Add line item
      </button>
    </div>
  );
}
