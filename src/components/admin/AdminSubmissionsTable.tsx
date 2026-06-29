"use client";
import SubmissionsTable from "@/components/shared/SubmissionsTable";

export default function AdminSubmissionsTable() {
  return (
    <SubmissionsTable
      submissionsEndpoint="/api/admin/submissions"
      exportEndpoint="/api/admin/export"
      exportFilename={`Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`}
      title="All Submissions"
      subtitle="View and filter all client interaction records"
      accent="indigo"
    />
  );
}
