"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatearFecha } from "@/lib/formatDate";

const CLASIFICACION = "Clasificación";

const ESTADOS_VALIDOS = ["Pendiente", "En juego", "Finalizado", "Cerrado"];

type Team = {
  id: string;
  name: string;
  group_name: string | null;
};

type Match = {
  id: string;
  group_name: string | null;
  match_date: string | null;
  match_time: string | null;
  field: string | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type RawMatch = Omit<Match, "home_team" | "away_team"> & {
  home_team: { name: string }[] | { name: string } | null;
  away_team: { name: string }[] | { name: string } | null;
};

type ImportMatchPayload = {
  group_name: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  match_time: string;
  field: string;
  home_score: null;
  away_score: null;
  status: string;
  mvp_open: boolean;
};

function normalizarEquipo(
  equipo: RawMatch["home_team"]
): { name: string } | null {
  if (!equipo) return null;
  if (Array.isArray(equipo)) return equipo[0] ?? null;
  return equipo;
}

function formatearFechaSegura(fecha: string | null) {
  if (!fecha) return "Fecha pendiente";
  return formatearFecha(fecha);
}

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizarClave(valor: string) {
  return valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function leerCampo(row: Record<string, unknown>, posiblesClaves: string[]) {
  const normalizado: Record<string, unknown> = {};

  Object.entries(row).forEach(([key, value]) => {
    normalizado[normalizarClave(key)] = value;
  });

  for (const key of posiblesClaves) {
    const value = normalizado[normalizarClave(key)];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function fechaDesdeExcel(valor: unknown) {
  if (valor instanceof Date) {
    const year = valor.getFullYear();
    const month = String(valor.getMonth() + 1).padStart(2, "0");
    const day = String(valor.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (typeof valor === "number") {
    const parsed = XLSX.SSF.parse_date_code(valor);

    if (parsed) {
      const year = String(parsed.y).padStart(4, "0");
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }
  }

  const texto = String(valor ?? "").trim();

  if (!texto) return "";

  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (iso) {
    const year = iso[1];
    const month = iso[2].padStart(2, "0");
    const day = iso[3].padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const europeo = texto.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);

  if (europeo) {
    const day = europeo[1].padStart(2, "0");
    const month = europeo[2].padStart(2, "0");
    const year =
      europeo[3].length === 2 ? `20${europeo[3]}` : europeo[3].padStart(4, "0");

    return `${year}-${month}-${day}`;
  }

  return "";
}

function horaDesdeExcel(valor: unknown) {
  if (valor instanceof Date) {
    const hour = String(valor.getHours()).padStart(2, "0");
    const minute = String(valor.getMinutes()).padStart(2, "0");

    return `${hour}:${minute}`;
  }

  if (typeof valor === "number") {
    const totalMinutes = Math.round(valor * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  const texto = String(valor ?? "").trim();

  if (!texto) return "";

  const normalizado = texto.replace(".", ":");
  const match = normalizado.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);

  if (match) {
    const hours = match[1].padStart(2, "0");
    const minutes = match[2].padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  const soloHora = normalizado.match(/^(\d{1,2})$/);

  if (soloHora) {
    return `${soloHora[1].padStart(2, "0")}:00`;
  }

  return "";
}

function estadoDesdeExcel(valor: unknown) {
  const texto = String(valor ?? "").trim();

  if (!texto) return "Pendiente";

  const encontrado = ESTADOS_VALIDOS.find(
    (estado) => normalizarTexto(estado) === normalizarTexto(texto)
  );

  return encontrado ?? "Pendiente";
}

function clavePartido(
  fecha: string | null,
  hora: string | null,
  homeTeamId: string,
  awayTeamId: string
) {
  return `${fecha ?? ""}|${(hora ?? "").slice(0, 5)}|${homeTeamId}|${awayTeamId}`;
}

export default function AdminGestionarPartidosPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [selectedId, setSelectedId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [campo, setCampo] = useState("Campo 1");
  const [estado, setEstado] = useState("Pendiente");

  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos(mantenerId?: string) {
    setLoading(true);

    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("id, name, group_name")
      .order("name", { ascending: true });

    if (teamsError) {
      console.error("Error cargando equipos:", teamsError);
      setMensaje("Error cargando equipos.");
      setLoading(false);
      return;
    }

    const equipos = (teamsData ?? []) as Team[];
    setTeams(equipos);

    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select(
        `
        id,
        group_name,
        match_date,
        match_time,
        field,
        home_team_id,
        away_team_id,
        home_score,
        away_score,
        status,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      `
      )
      .order("match_date", { ascending: true })
      .order("match_time", { ascending: true });

    if (matchesError) {
      console.error("Error cargando partidos:", matchesError);
      setMensaje("Error cargando partidos de clasificación.");
      setLoading(false);
      return;
    }

    const partidos: Match[] = ((matchesData as unknown as RawMatch[]) || []).map(
      (match) => ({
        ...match,
        home_team: normalizarEquipo(match.home_team),
        away_team: normalizarEquipo(match.away_team),
      })
    );

    setMatches(partidos);

    const partidoMantener = mantenerId
      ? partidos.find((match) => match.id === mantenerId)
      : null;

    if (partidoMantener) {
      cargarPartido(partidoMantener);
    } else if (!selectedId) {
      prepararNuevo(equipos);
    }

    setLoading(false);
  }

  function prepararNuevo(equiposBase = teams) {
    setSelectedId("");
    setHomeTeamId(equiposBase[0]?.id ?? "");
    setAwayTeamId(equiposBase[1]?.id ?? "");
    setFecha("");
    setHora("");
    setCampo("Campo 1");
    setEstado("Pendiente");
    setMensaje("");
  }

  function cargarPartido(match: Match) {
    setSelectedId(match.id);
    setHomeTeamId(match.home_team_id);
    setAwayTeamId(match.away_team_id);
    setFecha(match.match_date ?? "");
    setHora((match.match_time ?? "").slice(0, 5));
    setCampo(match.field ?? "Campo 1");
    setEstado(match.status ?? "Pendiente");
    setMensaje("");
  }

  function cambiarPartido(id: string) {
    if (!id) {
      prepararNuevo();
      return;
    }

    const match = matches.find((item) => item.id === id);

    if (match) {
      cargarPartido(match);
    }
  }

  function validarPartido() {
    if (!homeTeamId || !awayTeamId) {
      setMensaje("Selecciona los dos equipos.");
      return false;
    }

    if (homeTeamId === awayTeamId) {
      setMensaje("El equipo local y visitante no pueden ser el mismo.");
      return false;
    }

    if (!fecha) {
      setMensaje("Indica la fecha del partido.");
      return false;
    }

    if (!hora) {
      setMensaje("Indica la hora del partido.");
      return false;
    }

    if (!campo.trim()) {
      setMensaje("Indica el campo.");
      return false;
    }

    return true;
  }

  async function guardarPartido() {
    if (!validarPartido()) return;

    setSaving(true);
    setMensaje("");

    const payload = {
      group_name: CLASIFICACION,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: fecha,
      match_time: hora,
      field: campo.trim(),
      status: estado,
    };

    const { error } = selectedId
      ? await supabase.from("matches").update(payload).eq("id", selectedId)
      : await supabase.from("matches").insert({
          ...payload,
          home_score: null,
          away_score: null,
          mvp_open: false,
        });

    if (error) {
      console.error("Error guardando partido:", error);
      setMensaje("No se ha podido guardar el partido.");
      setSaving(false);
      return;
    }

    setMensaje(
      selectedId
        ? "Partido actualizado correctamente."
        : "Partido creado correctamente."
    );

    await cargarDatos(selectedId);
    setSaving(false);
  }

  async function eliminarPartido() {
    if (!selectedId) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres eliminar este partido?\n\nTambién se eliminarán datos relacionados si existen."
    );

    if (!confirmar) return;

    setSaving(true);
    setMensaje("");

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", selectedId);

    if (error) {
      console.error("Error eliminando partido:", error);
      setMensaje("No se ha podido eliminar el partido.");
      setSaving(false);
      return;
    }

    setMensaje("Partido eliminado correctamente.");
    setSelectedId("");
    prepararNuevo();
    await cargarDatos();
    setSaving(false);
  }

  function descargarPlantillaCalendario() {
    const rows = [
      {
        FECHA: "01/07/2026",
        HORA: "18:00",
        CAMPO: "Campo 1",
        LOCAL: "Equipo 1",
        VISITANTE: "Equipo 2",
        ESTADO: "Pendiente",
      },
      {
        FECHA: "01/07/2026",
        HORA: "18:30",
        CAMPO: "Campo 1",
        LOCAL: "Equipo 3",
        VISITANTE: "Equipo 4",
        ESTADO: "Pendiente",
      },
      {
        FECHA: "02/07/2026",
        HORA: "19:00",
        CAMPO: "Campo 2",
        LOCAL: "Equipo 5",
        VISITANTE: "Equipo 6",
        ESTADO: "Pendiente",
      },
    ];

    const instrucciones = [
      ["Columna", "Uso"],
      [
        "FECHA",
        "Obligatoria. Formato recomendado: dd/mm/yyyy, por ejemplo 01/07/2026.",
      ],
      ["HORA", "Obligatoria. Formato recomendado: HH:mm, por ejemplo 18:00."],
      ["CAMPO", "Obligatoria. Ejemplo: Campo 1."],
      [
        "LOCAL",
        "Obligatoria. Debe coincidir con el nombre exacto de un equipo ya creado.",
      ],
      [
        "VISITANTE",
        "Obligatoria. Debe coincidir con el nombre exacto de un equipo ya creado.",
      ],
      [
        "ESTADO",
        "Opcional. Pendiente, En juego, Finalizado o Cerrado. Si está vacío se usa Pendiente.",
      ],
    ];

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    const sheetInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);

    XLSX.utils.book_append_sheet(workbook, sheet, "Calendario");
    XLSX.utils.book_append_sheet(workbook, sheetInstrucciones, "Instrucciones");
    XLSX.writeFile(workbook, "plantilla_calendario_partidos.xlsx");
  }

  async function importarCalendarioDesdeExcel(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (teams.length === 0) {
      setMensaje("Primero importa o crea los equipos antes de cargar partidos.");
      event.target.value = "";
      return;
    }

    setImportando(true);
    setMensaje("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        setMensaje("El Excel no tiene ninguna hoja válida.");
        setImportando(false);
        event.target.value = "";
        return;
      }

      const excelRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      if (excelRows.length === 0) {
        setMensaje("El Excel no tiene filas de partidos.");
        setImportando(false);
        event.target.value = "";
        return;
      }

      const equiposPorNombre = new Map<string, Team>(
        teams.map((team) => [normalizarTexto(team.name), team])
      );

      const partidosExistentes = new Set(
        matches.map((match) =>
          clavePartido(
            match.match_date,
            match.match_time,
            match.home_team_id,
            match.away_team_id
          )
        )
      );

      const partidosExcel = new Set<string>();
      const nuevosPartidos: ImportMatchPayload[] = [];
      const errores: string[] = [];
      let omitidos = 0;

      excelRows.forEach((row, index) => {
        const fila = index + 2;

        const fechaExcel = leerCampo(row, ["FECHA", "DATE"]);
        const horaExcel = leerCampo(row, ["HORA", "HOUR", "TIME"]);
        const campoExcel = leerCampo(row, ["CAMPO", "FIELD"]);
        const localExcel = leerCampo(row, [
          "LOCAL",
          "EQUIPO_LOCAL",
          "HOME",
          "HOME_TEAM",
        ]);
        const visitanteExcel = leerCampo(row, [
          "VISITANTE",
          "EQUIPO_VISITANTE",
          "AWAY",
          "AWAY_TEAM",
        ]);
        const estadoExcel = leerCampo(row, ["ESTADO", "STATUS"]);

        const fechaImportada = fechaDesdeExcel(fechaExcel);
        const horaImportada = horaDesdeExcel(horaExcel);
        const campoImportado = String(campoExcel ?? "").trim();
        const localNombre = String(localExcel ?? "").trim();
        const visitanteNombre = String(visitanteExcel ?? "").trim();
        const estadoImportado = estadoDesdeExcel(estadoExcel);

        if (
          !fechaImportada &&
          !horaImportada &&
          !campoImportado &&
          !localNombre &&
          !visitanteNombre
        ) {
          return;
        }

        if (!fechaImportada) {
          errores.push(`Fila ${fila}: fecha no válida.`);
          return;
        }

        if (!horaImportada) {
          errores.push(`Fila ${fila}: hora no válida.`);
          return;
        }

        if (!campoImportado) {
          errores.push(`Fila ${fila}: falta el campo.`);
          return;
        }

        if (!localNombre || !visitanteNombre) {
          errores.push(`Fila ${fila}: falta local o visitante.`);
          return;
        }

        const local = equiposPorNombre.get(normalizarTexto(localNombre));
        const visitante = equiposPorNombre.get(normalizarTexto(visitanteNombre));

        if (!local) {
          errores.push(`Fila ${fila}: no existe el equipo local "${localNombre}".`);
          return;
        }

        if (!visitante) {
          errores.push(
            `Fila ${fila}: no existe el equipo visitante "${visitanteNombre}".`
          );
          return;
        }

        if (local.id === visitante.id) {
          errores.push(`Fila ${fila}: local y visitante son el mismo equipo.`);
          return;
        }

        const key = clavePartido(
          fechaImportada,
          horaImportada,
          local.id,
          visitante.id
        );

        if (partidosExistentes.has(key) || partidosExcel.has(key)) {
          omitidos += 1;
          return;
        }

        partidosExcel.add(key);

        nuevosPartidos.push({
          group_name: CLASIFICACION,
          home_team_id: local.id,
          away_team_id: visitante.id,
          match_date: fechaImportada,
          match_time: horaImportada,
          field: campoImportado,
          home_score: null,
          away_score: null,
          status: estadoImportado,
          mvp_open: false,
        });
      });

      if (nuevosPartidos.length > 0) {
        const { error } = await supabase.from("matches").insert(nuevosPartidos);

        if (error) {
          console.error("Error importando calendario:", error);
          setMensaje(`No se ha podido importar el calendario: ${error.message}`);
          setImportando(false);
          event.target.value = "";
          return;
        }
      }

      const resumen = [
        `${nuevosPartidos.length} partido${
          nuevosPartidos.length === 1 ? "" : "s"
        } creado${nuevosPartidos.length === 1 ? "" : "s"}`,
        `${omitidos} duplicado${omitidos === 1 ? "" : "s"} omitido${
          omitidos === 1 ? "" : "s"
        }`,
      ];

      if (errores.length > 0) {
        resumen.push(`${errores.length} aviso${errores.length === 1 ? "" : "s"}`);
      }

      setMensaje(
        `${resumen.join(" · ")}. ${
          errores.length > 0 ? errores.slice(0, 5).join(" ") : ""
        }`
      );

      await cargarDatos();
    } catch (error) {
      console.error("Error leyendo Excel:", error);
      setMensaje("No se ha podido leer el Excel. Revisa el formato del archivo.");
    } finally {
      setImportando(false);
      event.target.value = "";
    }
  }

  const mensajeCorrecto =
    mensaje.includes("correctamente") ||
    mensaje.includes("eliminado") ||
    mensaje.includes("creado");

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

            <h1 className="mt-2 text-center text-3xl font-black">
              Gestionar calendario y partidos
            </h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Partidos de clasificación
            </p>
          </div>

          <Link
            href="/admin"
            className="mt-4 block rounded-2xl bg-white/95 p-4 text-center font-black text-slate-900 shadow"
          >
            Volver al panel admin
          </Link>

          {mensaje && (
            <div
              className={`mt-4 rounded-2xl p-4 text-sm font-bold shadow ${
                mensajeCorrecto
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {mensaje}
            </div>
          )}

          {loading ? (
            <div className="mt-6 rounded-3xl bg-white/95 p-5 font-bold shadow-2xl">
              Cargando partidos...
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <p className="text-sm font-black uppercase tracking-widest text-red-600">
                  Importar calendario desde Excel
                </p>

                <p className="mt-2 text-sm font-bold text-slate-500">
                  Carga partidos de clasificación de golpe. Los equipos deben
                  existir antes y los nombres del Excel deben coincidir con los
                  equipos importados.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <button
                    onClick={descargarPlantillaCalendario}
                    className="rounded-xl bg-slate-900 py-3 text-sm font-black text-white shadow"
                  >
                    Descargar plantilla Excel
                  </button>

                  <label className="block cursor-pointer rounded-xl bg-red-600 py-3 text-center text-sm font-black text-white shadow">
                    {importando ? "Importando calendario..." : "Subir Excel calendario"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      disabled={importando}
                      onChange={(event) => void importarCalendarioDesdeExcel(event)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-100 p-4 text-xs font-bold text-slate-500">
                  Columnas admitidas: FECHA, HORA, CAMPO, LOCAL, VISITANTE y
                  ESTADO. El estado es opcional.
                </div>
              </div>

              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <label className="text-sm font-black uppercase text-slate-500">
                  Partido existente
                </label>

                <select
                  value={selectedId}
                  onChange={(event) => cambiarPartido(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                >
                  <option value="">Nuevo partido</option>

                  {matches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.home_team?.name ?? "Local"} vs{" "}
                      {match.away_team?.name ?? "Visitante"} ·{" "}
                      {formatearFechaSegura(match.match_date)} ·{" "}
                      {(match.match_time ?? "Hora pendiente").slice(0, 5)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => prepararNuevo()}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow"
                >
                  Crear nuevo partido
                </button>
              </div>

              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-xs font-black uppercase text-slate-500">
                    Fase
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-950">
                    Clasificación
                  </p>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-black uppercase text-slate-500">
                    Equipo local
                  </label>

                  <select
                    value={homeTeamId}
                    onChange={(event) => setHomeTeamId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    <option value="">Selecciona equipo local</option>

                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-black uppercase text-slate-500">
                    Equipo visitante
                  </label>

                  <select
                    value={awayTeamId}
                    onChange={(event) => setAwayTeamId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    <option value="">Selecciona equipo visitante</option>

                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Fecha
                    </label>

                    <input
                      type="date"
                      value={fecha}
                      onChange={(event) => setFecha(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase text-slate-500">
                      Hora
                    </label>

                    <input
                      type="time"
                      value={hora}
                      onChange={(event) => setHora(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-black uppercase text-slate-500">
                    Campo
                  </label>

                  <input
                    value={campo}
                    onChange={(event) => setCampo(event.target.value)}
                    placeholder="Campo 1"
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-bold"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs font-black uppercase text-slate-500">
                    Estado
                  </label>

                  <select
                    value={estado}
                    onChange={(event) => setEstado(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-bold"
                  >
                    <option>Pendiente</option>
                    <option>En juego</option>
                    <option>Finalizado</option>
                    <option>Cerrado</option>
                  </select>
                </div>

                <button
                  onClick={guardarPartido}
                  disabled={saving}
                  className="mt-6 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar partido"}
                </button>

                {selectedId && (
                  <button
                    onClick={eliminarPartido}
                    disabled={saving}
                    className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-60"
                  >
                    Eliminar partido
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}