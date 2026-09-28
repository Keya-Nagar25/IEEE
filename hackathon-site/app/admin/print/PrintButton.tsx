"use client";

export default function PrintButton() {
  return (
    <button type="button" className="btn btn-solid" onClick={() => window.print()}>
      Print
    </button>
  );
}
