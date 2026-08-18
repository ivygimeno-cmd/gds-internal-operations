"use client";

import { useState } from "react";

type Project = {
  id: string;
  client_name: string | null;
  business_name: string | null;
  project_name: string | null;
  registered_by_name: string | null;
};

type Props = {
  projects: Project[];
};

export default function CommissionProjectSelector({
  projects,
}: Props) {
  const [selectedId, setSelectedId] =
    useState("");

  const selectedProject = projects.find(
    (project) => project.id === selectedId
  );

  return (
    <>
      <select
        name="work_queue_id"
        required
        value={selectedId}
        onChange={(event) =>
          setSelectedId(event.target.value)
        }
        className="w-full rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm text-white"
      >
        <option value="">
          Select claimed project
        </option>

        {projects.map((project) => (
          <option
            key={project.id}
            value={project.id}
          >
            {project.business_name ||
              project.client_name ||
              "Unnamed Client"}{" "}
            —{" "}
            {project.project_name ||
              "Unnamed Project"}
          </option>
        ))}
      </select>

      {selectedProject && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
          <p className="text-xs text-slate-500">
            Client
          </p>

          <p className="mt-1 text-sm font-medium text-white">
            {selectedProject.business_name ||
              selectedProject.client_name}
          </p>

          <p className="mt-3 text-xs text-slate-500">
            Project
          </p>

          <p className="mt-1 text-sm font-medium text-white">
            {selectedProject.project_name}
          </p>

          <p className="mt-3 text-xs text-slate-500">
            Registered By
          </p>

          <p className="mt-1 text-sm font-medium text-blue-400">
            {selectedProject.registered_by_name ||
              "Unknown"}
          </p>
        </div>
      )}
    </>
  );
}