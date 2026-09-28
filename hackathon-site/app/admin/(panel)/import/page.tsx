import type { Metadata } from "next";
import ImportWizard from "./ImportWizard";

export const metadata: Metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <>
      <h1 className="admin-h1">
        Import from <em>Unstop</em>
      </h1>
      <p className="admin-sub">
        Close registrations on Unstop, export the registrations CSV from your organizer dashboard, and drop it here. The
        file is parsed in your browser; you&rsquo;ll see a preview before anything is saved. Re-importing later only adds
        new teams — existing teams keep their number and login code.
      </p>
      <ImportWizard />
    </>
  );
}
