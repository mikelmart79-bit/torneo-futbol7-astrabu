"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestPage() {
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    async function cargarEquipos() {
      const { data, error } = await supabase.from("teams").select("*");

      if (error) {
        console.error("Error:", error);
      } else {
        setTeams(data);
      }
    }

    cargarEquipos();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-black mb-4">Test Supabase</h1>

      {teams.length === 0 && <p>No hay equipos todavía</p>}

      {teams.map((team) => (
        <div key={team.id} className="mb-2 rounded bg-slate-100 p-3">
          {team.name} - {team.group_name}
        </div>
      ))}
    </main>
  );
}