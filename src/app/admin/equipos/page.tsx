"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

const CLASIFICACION = "Clasificación";

const COLOR_LOCAL_DEFAULT = "#047857";
const COLOR_VISITANTE_DEFAULT = "#dc2626";

type Team = {
  id: string;
  name: string;
  group_name: string | null;
  home_color: string | null;
  away_color: string | null;
};

type Player = {
  id: string;
  team_id: string;
  name: string;
  number: number | null;
  municipio: boolean | null;
  federado: boolean | null;
};

type ExcelRow = Record<string, unknown>;

type ImportedTeam = {
  name: string;
  homeColor: string | null;
  awayColor: string | null;
};

type ImportedPlayer = {
  teamName: string;
  name: string;
  number: number | null;
  municipio: boolean | null;
  federado: boolean | null;
};

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function normalizarClave(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function valorTexto(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function valorColumna(row: ExcelRow, aliases: string[]) {
  const aliasesNormalizados = aliases.map((alias) => normalizarClave(alias));

  for (const [key, value] of Object.entries(row)) {
    if (aliasesNormalizados.includes(normalizarClave(key))) {
      return valorTexto(value);
    }
  }

  return "";
}

function parseDorsal(valor: string) {
  if (!valor.trim()) return null;

  const numero = Number.parseInt(valor, 10);

  return Number.isNaN(numero) ? null : numero;
}

function parseBoolean(valor: string) {
  const limpio = normalizarTexto(valor);

  if (!limpio) return null;

  if (["si", "sí", "s", "x", "1", "true", "verdadero", "yes", "y"].includes(limpio)) {
    return true;
  }

  if (["no", "n", "0", "false", "falso"].includes(limpio)) {
    return false;
  }

  return null;
}


function colorSeguro(valor: string) {
  const color = valor.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }

  return null;
}

export default function AdminEquiposPage() {
  const [teams, setTeams] = useState<Team[]>([]);

  const [equipoId, setEquipoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [colorLocal, setColorLocal] = useState(COLOR_LOCAL_DEFAULT);
  const [colorVisitante, setColorVisitante] = useState(COLOR_VISITANTE_DEFAULT);
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos(mantenerId?: string) {
    setLoading(true);

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name, home_color, away_color")
      .order("name", { ascending: true });

    if (teamsError) {
      setMensaje("No se han podido cargar los equipos.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

    const equipoMantener = mantenerId
      ? equipos.find((team) => team.id === mantenerId)
      : null;

    if (equipoMantener) {
      seleccionarEquipo(equipoMantener, false);
    } else if (equipos.length > 0 && !equipoId) {
      seleccionarEquipo(equipos[0], false);
    } else if (equipos.length === 0) {
      nuevoEquipo(false);
    }

    setLoading(false);
  }

  function seleccionarEquipo(team: Team, limpiarMensaje = true) {
    setEquipoId(team.id);
    setNombre(team.name);
    setColorLocal(team.home_color || COLOR_LOCAL_DEFAULT);
    setColorVisitante(team.away_color || COLOR_VISITANTE_DEFAULT);

    if (limpiarMensaje) {
      setMensaje("");
    }
  }

  function cambiarEquipo(id: string) {
    if (!id) {
      nuevoEquipo();
      return;
    }

    const team = teams.find((item) => item.id === id);

    if (team) {
      seleccionarEquipo(team);
    }
  }

  function nuevoEquipo(limpiarMensaje = true) {
    setEquipoId("");
    setNombre("");
    setColorLocal(COLOR_LOCAL_DEFAULT);
    setColorVisitante(COLOR_VISITANTE_DEFAULT);

    if (limpiarMensaje) {
      setMensaje("");
    }
  }

  function existeEquipoDuplicado(nombreEquipo: string) {
    const nombreLimpio = nombreEquipo.trim().toLowerCase();

    return teams.some((team) => {
      if (team.id === equipoId) return false;

      return team.name.trim().toLowerCase() === nombreLimpio;
    });
  }

  async function actualizarReferenciasFinales(
    nombreAnterior: string,
    nombreNuevo: string
  ) {
    if (!nombreAnterior || !nombreNuevo || nombreAnterior === nombreNuevo) {
      return;
    }

    const { error: homeError } = await supabase
      .from("final_matches")
      .update({ home_ref: nombreNuevo })
      .eq("home_ref", nombreAnterior);

    if (homeError) {
      throw new Error(
        "Equipo guardado, pero no se pudo actualizar la fase final."
      );
    }

    const { error: awayError } = await supabase
      .from("final_matches")
      .update({ away_ref: nombreNuevo })
      .eq("away_ref", nombreAnterior);

    if (awayError) {
      throw new Error(
        "Equipo guardado, pero no se pudo actualizar la fase final."
      );
    }
  }

  async function guardarEquipo() {
    const nombreLimpio = nombre.trim();

    if (!nombreLimpio) {
      setMensaje("Escribe el nombre del equipo.");
      return;
    }

    if (existeEquipoDuplicado(nombreLimpio)) {
      setMensaje("Ya existe un equipo con ese nombre.");
      return;
    }

    const equipoActual = teams.find((team) => team.id === equipoId);
    const nombreAnterior = equipoActual?.name ?? "";

    const payload = {
      name: nombreLimpio,
      group_name: CLASIFICACION,
      home_color: colorLocal,
      away_color: colorVisitante,
    };

    const { data, error } = equipoId
      ? await supabase
          .from("teams")
          .update(payload)
          .eq("id", equipoId)
          .select("id")
          .single()
      : await supabase.from("teams").insert(payload).select("id").single();

    if (error) {
      setMensaje(`Error guardando equipo: ${error.message}`);
      return;
    }

    try {
      if (equipoId && nombreAnterior && nombreAnterior !== nombreLimpio) {
        await actualizarReferenciasFinales(nombreAnterior, nombreLimpio);
      }

      setMensaje("Equipo guardado correctamente.");
      await cargarDatos(data?.id ?? equipoId);
    } catch (err) {
      const texto =
        err instanceof Error
          ? err.message
          : "Equipo guardado, pero hubo un problema actualizando referencias.";

      setMensaje(texto);
      await cargarDatos(data?.id ?? equipoId);
    }
  }

  async function descargarPlantillaExcel() {
    try {
      const XLSX = await import("xlsx");

      const plantilla = [
        [
          "EQUIPO",
          "JUGADOR",
          "DORSAL",
          "MUNICIPIO",
          "FEDERADO",
          "COLOR_LOCAL",
          "COLOR_VISITANTE",
        ],
        ["Apurtumadre", "Jugador Uno", 7, "Sí", "No", COLOR_LOCAL_DEFAULT, COLOR_VISITANTE_DEFAULT],
        ["Apurtumadre", "Jugador Dos", 10, "No", "Sí", COLOR_LOCAL_DEFAULT, COLOR_VISITANTE_DEFAULT],
        ["Equipo 10", "Jugador Tres", 4, "Sí", "Sí", COLOR_LOCAL_DEFAULT, COLOR_VISITANTE_DEFAULT],
        ["Equipo 10", "Jugador Cuatro", 9, "No", "No", COLOR_LOCAL_DEFAULT, COLOR_VISITANTE_DEFAULT],
      ];

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(plantilla);

      worksheet["!cols"] = [
        { wch: 24 },
        { wch: 30 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 16 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Equipos");
      XLSX.writeFile(workbook, "plantilla_equipos_plantillas.xlsx");
    } catch (err) {
      console.error("Error creando plantilla:", err);
      setMensaje("No se ha podido crear la plantilla Excel.");
    }
  }

  async function importarExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setMensaje("Selecciona un archivo Excel válido: .xlsx, .xls o .csv.");
      return;
    }

    setImportando(true);
    setMensaje("");

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        setMensaje("El Excel no contiene ninguna hoja.");
        setImportando(false);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const excelRows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, {
        defval: "",
      });

      if (excelRows.length === 0) {
        setMensaje("El Excel está vacío.");
        setImportando(false);
        return;
      }

      const equiposImportados = new Map<string, ImportedTeam>();
      const jugadoresImportados: ImportedPlayer[] = [];

      excelRows.forEach((row) => {
        const nombreEquipo = valorColumna(row, [
          "EQUIPO",
          "TEAM",
          "CLUB",
          "NOMBRE EQUIPO",
          "NOMBRE_EQUIPO",
        ]);

        if (!nombreEquipo) return;

        const colorLocalExcel = colorSeguro(
          valorColumna(row, ["COLOR_LOCAL", "COLOR LOCAL", "LOCAL_COLOR"])
        );

        const colorVisitanteExcel = colorSeguro(
          valorColumna(row, [
            "COLOR_VISITANTE",
            "COLOR VISITANTE",
            "AWAY_COLOR",
            "VISITANTE_COLOR",
          ])
        );

        const equipoKey = normalizarTexto(nombreEquipo);

        if (!equiposImportados.has(equipoKey)) {
          equiposImportados.set(equipoKey, {
            name: nombreEquipo.trim(),
            homeColor: colorLocalExcel,
            awayColor: colorVisitanteExcel,
          });
        }

        const nombreJugador = valorColumna(row, [
          "JUGADOR",
          "PLAYER",
          "NOMBRE JUGADOR",
          "NOMBRE_JUGADOR",
          "NOMBRE",
        ]);

        if (!nombreJugador) return;

        const dorsal = parseDorsal(
          valorColumna(row, ["DORSAL", "NUMERO", "NÚMERO", "NUMBER"])
        );

        const municipio = parseBoolean(
          valorColumna(row, ["MUNICIPIO", "M", "LOCAL", "DEL MUNICIPIO"])
        );

        const federado = parseBoolean(
          valorColumna(row, ["FEDERADO", "F", "FED", "FEDERADA", "FEDERADO/A"])
        );

        jugadoresImportados.push({
          teamName: nombreEquipo.trim(),
          name: nombreJugador.trim(),
          number: dorsal,
          municipio,
          federado,
        });
      });

      if (equiposImportados.size === 0) {
        setMensaje(
          "No se ha encontrado ningún equipo. El Excel debe tener una columna EQUIPO."
        );
        setImportando(false);
        return;
      }

      const { data: equiposActualesData, error: equiposActualesError } =
        await supabase
          .from("teams")
          .select("id, name, group_name, home_color, away_color");

      if (equiposActualesError) {
        setMensaje(
          `No se han podido revisar los equipos actuales: ${equiposActualesError.message}`
        );
        setImportando(false);
        return;
      }

      const equiposActuales = (equiposActualesData ?? []) as Team[];
      const equipoIdPorNombre = new Map<string, string>();
      let equiposCreados = 0;
      let equiposReutilizados = 0;

      for (const equipo of equiposImportados.values()) {
        const key = normalizarTexto(equipo.name);
        const existente = equiposActuales.find(
          (item) => normalizarTexto(item.name) === key
        );

        if (existente) {
          equipoIdPorNombre.set(key, existente.id);
          equiposReutilizados += 1;
          continue;
        }

        const { data: nuevoEquipo, error: insertTeamError } = await supabase
          .from("teams")
          .insert({
            name: equipo.name,
            group_name: CLASIFICACION,
            home_color: equipo.homeColor || COLOR_LOCAL_DEFAULT,
            away_color: equipo.awayColor || COLOR_VISITANTE_DEFAULT,
          })
          .select("id")
          .single();

        if (insertTeamError || !nuevoEquipo) {
          setMensaje(
            `No se ha podido crear el equipo ${equipo.name}: ${insertTeamError?.message ?? "Error desconocido"}`
          );
          setImportando(false);
          return;
        }

        equipoIdPorNombre.set(key, nuevoEquipo.id);
        equiposCreados += 1;
      }

      const teamIds = Array.from(new Set(equipoIdPorNombre.values()));
      let jugadoresCreados = 0;
      let jugadoresActualizados = 0;
      let jugadoresDuplicadosExcel = 0;

      const { data: jugadoresActualesData, error: jugadoresActualesError } =
        teamIds.length > 0
          ? await supabase
              .from("players")
              .select("id, team_id, name, number, municipio, federado")
              .in("team_id", teamIds)
          : { data: [], error: null };

      if (jugadoresActualesError) {
        setMensaje(
          `No se han podido revisar los jugadores actuales: ${jugadoresActualesError.message}`
        );
        setImportando(false);
        return;
      }

      const jugadoresActuales = (jugadoresActualesData ?? []) as Player[];
      const jugadorActualPorClave = new Map<string, Player>();

      jugadoresActuales.forEach((player) => {
        jugadorActualPorClave.set(
          `${player.team_id}-${normalizarTexto(player.name)}`,
          player
        );
      });

      const jugadoresProcesados = new Set<string>();
      const jugadoresNuevos: Array<{
        team_id: string;
        name: string;
        number: number | null;
        municipio: boolean;
        federado: boolean;
      }> = [];
      const jugadoresActualizar: Array<{
        id: string;
        number?: number | null;
        municipio?: boolean;
        federado?: boolean;
      }> = [];

      jugadoresImportados.forEach((player) => {
        const teamId = equipoIdPorNombre.get(normalizarTexto(player.teamName));

        if (!teamId) return;

        const key = `${teamId}-${normalizarTexto(player.name)}`;

        if (jugadoresProcesados.has(key)) {
          jugadoresDuplicadosExcel += 1;
          return;
        }

        jugadoresProcesados.add(key);

        const existente = jugadorActualPorClave.get(key);

        if (existente) {
          const cambios: {
            id: string;
            number?: number | null;
            municipio?: boolean;
            federado?: boolean;
          } = { id: existente.id };

          if (player.number !== null && existente.number !== player.number) {
            cambios.number = player.number;
          }

          if (player.municipio !== null && existente.municipio !== player.municipio) {
            cambios.municipio = player.municipio;
          }

          if (player.federado !== null && existente.federado !== player.federado) {
            cambios.federado = player.federado;
          }

          if (Object.keys(cambios).length > 1) {
            jugadoresActualizar.push(cambios);
          }

          return;
        }

        jugadoresNuevos.push({
          team_id: teamId,
          name: player.name,
          number: player.number,
          municipio: player.municipio ?? false,
          federado: player.federado ?? false,
        });
      });

      if (jugadoresNuevos.length > 0) {
        const { error: insertPlayersError } = await supabase
          .from("players")
          .insert(jugadoresNuevos);

        if (insertPlayersError) {
          setMensaje(
            `Los equipos se cargaron, pero no se pudieron crear los jugadores: ${insertPlayersError.message}`
          );
          setImportando(false);
          await cargarDatos();
          return;
        }

        jugadoresCreados = jugadoresNuevos.length;
      }

      for (const player of jugadoresActualizar) {
        const { id, ...payload } = player;

        const { error: updatePlayerError } = await supabase
          .from("players")
          .update(payload)
          .eq("id", id);

        if (updatePlayerError) {
          setMensaje(
            `La importación se hizo parcialmente, pero no se pudo actualizar un jugador: ${updatePlayerError.message}`
          );
          setImportando(false);
          await cargarDatos();
          return;
        }

        jugadoresActualizados += 1;
      }

      await cargarDatos();

      setMensaje(
        `Importación completada: ${equiposCreados} equipos creados, ${equiposReutilizados} equipos existentes reutilizados, ${jugadoresCreados} jugadores creados, ${jugadoresActualizados} dorsales actualizados${
          jugadoresDuplicadosExcel > 0
            ? ` y ${jugadoresDuplicadosExcel} filas duplicadas ignoradas`
            : ""
        }.`
      );
    } catch (err) {
      console.error("Error importando Excel:", err);
      const texto =
        err instanceof Error
          ? err.message
          : "No se ha podido importar el archivo Excel.";

      setMensaje(`No se ha podido importar el Excel: ${texto}`);
    } finally {
      setImportando(false);
    }
  }

  async function equipoTieneDatosAsociados(teamId: string, teamName: string) {
    const { data: partidosLocal } = await supabase
      .from("matches")
      .select("id")
      .eq("home_team_id", teamId)
      .limit(1);

    if ((partidosLocal ?? []).length > 0) return true;

    const { data: partidosVisitante } = await supabase
      .from("matches")
      .select("id")
      .eq("away_team_id", teamId)
      .limit(1);

    if ((partidosVisitante ?? []).length > 0) return true;

    const { data: jugadores } = await supabase
      .from("players")
      .select("id")
      .eq("team_id", teamId)
      .limit(1);

    if ((jugadores ?? []).length > 0) return true;

    const { data: finalLocal } = await supabase
      .from("final_matches")
      .select("id")
      .eq("home_ref", teamName)
      .limit(1);

    if ((finalLocal ?? []).length > 0) return true;

    const { data: finalVisitante } = await supabase
      .from("final_matches")
      .select("id")
      .eq("away_ref", teamName)
      .limit(1);

    if ((finalVisitante ?? []).length > 0) return true;

    return false;
  }

  async function eliminarEquipo() {
    if (!equipoId) return;

    const equipoActual = teams.find((team) => team.id === equipoId);

    if (!equipoActual) {
      setMensaje("No se ha encontrado el equipo seleccionado.");
      return;
    }

    const tieneDatos = await equipoTieneDatosAsociados(
      equipoActual.id,
      equipoActual.name
    );

    if (tieneDatos) {
      setMensaje(
        "No se puede eliminar este equipo porque tiene jugadores, partidos o eliminatorias asociadas. Borra primero esos datos."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar el equipo "${equipoActual.name}"?`
    );

    if (!confirmar) return;

    const { error } = await supabase.from("teams").delete().eq("id", equipoId);

    if (error) {
      setMensaje(`Error eliminando equipo: ${error.message}`);
      return;
    }

    setMensaje("Equipo eliminado.");
    setEquipoId("");
    setNombre("");
    setColorLocal(COLOR_LOCAL_DEFAULT);
    setColorVisitante(COLOR_VISITANTE_DEFAULT);

    await cargarDatos();
  }

  const mensajeCorrecto =
    mensaje.includes("correctamente") ||
    mensaje.includes("eliminado") ||
    mensaje.includes("Importación completada");

  return (
    <AdminGuard>
      <main className="relative min-h-screen overflow-x-hidden bg-black text-slate-900">
        <img
          src="/torneo-verano.png"
          alt="Fondo torneo"
          className="fixed inset-0 h-screen w-screen object-cover opacity-35 blur-sm"
        />

        <section className="relative z-10 mx-auto max-w-md px-4 py-6 pb-24">
          <div className="rounded-3xl bg-black/60 px-4 py-5 text-white shadow-2xl backdrop-blur">
            <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
              Torneo Fútbol 7 Astrabudua
            </p>

            <h1 className="mt-2 text-center text-3xl font-black">Equipos</h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Gestión de equipos y plantillas del torneo
            </p>
          </div>

          <Link
            href="/admin"
            className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
          >
            Volver al panel admin
          </Link>

          {loading ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Cargando equipos...
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <p className="text-sm font-black uppercase text-slate-500">
                  Importar desde Excel
                </p>

                <p className="mt-2 text-sm font-bold text-slate-600">
                  Carga equipos y plantillas de golpe. Columnas necesarias:
                  EQUIPO, JUGADOR y DORSAL. M/MUNICIPIO y F/FEDERADO son opcionales.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <button
                    onClick={descargarPlantillaExcel}
                    disabled={importando}
                    className="rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                  >
                    Descargar plantilla Excel
                  </button>

                  <label
                    className={`block rounded-xl py-3 text-center font-black shadow ${
                      importando
                        ? "bg-slate-200 text-slate-400"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {importando ? "Importando..." : "Seleccionar Excel"}
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      disabled={importando}
                      onChange={importarExcel}
                      className="hidden"
                    />
                  </label>
                </div>

                <p className="mt-3 text-xs font-bold text-slate-500">
                  Si un equipo ya existe, se reutiliza. Si un jugador ya existe en
                  ese equipo, no se duplica; si cambia el dorsal, municipio o federado, se actualiza.
                </p>
              </div>

              <div className="mt-6 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <label className="text-sm font-black uppercase text-slate-500">
                  Equipo existente
                </label>

                <select
                  value={equipoId}
                  onChange={(event) => cambiarEquipo(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="">Nuevo equipo</option>

                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => nuevoEquipo()}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                >
                  Crear nuevo equipo
                </button>
              </div>

              <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <div>
                  <label className="text-sm font-black uppercase text-slate-500">
                    Nombre
                  </label>

                  <input
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    placeholder="Nombre del equipo"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3">
                    <label className="text-xs font-black uppercase text-slate-500">
                      Color local
                    </label>

                    <input
                      type="color"
                      value={colorLocal}
                      onChange={(event) => setColorLocal(event.target.value)}
                      className="mt-2 h-12 w-full rounded-xl"
                    />
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-3">
                    <label className="text-xs font-black uppercase text-slate-500">
                      Color visitante
                    </label>

                    <input
                      type="color"
                      value={colorVisitante}
                      onChange={(event) => setColorVisitante(event.target.value)}
                      className="mt-2 h-12 w-full rounded-xl"
                    />
                  </div>
                </div>

                <button
                  onClick={guardarEquipo}
                  className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow"
                >
                  Guardar equipo
                </button>

                {equipoId && (
                  <button
                    onClick={eliminarEquipo}
                    className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                  >
                    Eliminar equipo
                  </button>
                )}

                {mensaje && (
                  <div
                    className={`mt-4 rounded-xl p-3 text-sm font-bold ${
                      mensajeCorrecto
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {mensaje}
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black uppercase text-slate-500">
                    Equipos actuales
                  </p>

                  <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    {teams.length}
                  </p>
                </div>

                {teams.length === 0 ? (
                  <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    Todavía no hay equipos creados.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => seleccionarEquipo(team)}
                        className={`w-full rounded-2xl p-4 text-left shadow-sm ${
                          equipoId === team.id
                            ? "bg-red-600 text-white"
                            : "bg-slate-50 text-slate-900"
                        }`}
                      >
                        <p className="break-words text-lg font-black leading-tight">
                          {team.name}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}
