"use client";
import SubmissionsTable from "@/components/shared/SubmissionsTable";

export default function MasterAdminSubmissions() {
  return (
    <SubmissionsTable
      submissionsEndpoint="/api/master-admin/submissions"
      exportEndpoint="/api/master-admin/export"
      exportFilename={`All_Submissions_${new Date().toISOString().slice(0, 10)}.xlsx`}
      passwordProtectedExport
      canDelete
      deleteEndpoint={(id) => `/api/admin/submissions/${id}`}
      title="All Submissions"
      subtitle="Complete view across all admins and clients"
      accent="purple"
    />
  );
}
