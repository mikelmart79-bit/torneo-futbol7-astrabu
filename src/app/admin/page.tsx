"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type AdminLink = {
  href: string;
  title: string;
  description: string;
  variant?: "primary" | "normal";
};

type BackupData = {
  version: number;
  created_at: string;
  tables: Record<string, Array<Record<string, unknown>>>;
};

type FinalMatchMaintenance = {
  id: string;
  home_ref: string;
  away_ref: string;
  home_source_type: string | null;
  home_source_match_title: string | null;
  away_source_type: string | null;
  away_source_match_title: string | null;
};

const principales: AdminLink[] = [
  {
    href: "/admin/fichas-partido",
    title: "Resultados y fichas de partido",
    description: "Marcador, jugadores, goles, tarjetas, sanciones y MVP.",
    variant: "primary",
  },
  {
    href: "/admin/sanciones",
    title: "Gestionar sanciones",
    description: "Crear sanciones manuales, cumplirlas o reactivarlas.",
  },
  {
    href: "/admin/gestionar-partidos",
    title: "Gestionar calendario y partidos",
    description: "Crear, editar o eliminar partidos de clasificación.",
  },
  {
    href: "/admin/fase-final",
    title: "Gestionar eliminatorias",
    description: "Crear y editar octavos, cuartos, semis, tercer puesto y final.",
  },
];

const datos: AdminLink[] = [
  {
    href: "/admin/equipos",
    title: "Gestionar equipos",
    description: "Añadir, editar o eliminar equipos.",
  },
  {
    href: "/admin/jugadores",
    title: "Gestionar jugadores",
    description: "Plantillas y dorsales.",
  },
];

const extras: AdminLink[] = [
  {
    href: "/admin/mvp",
    title: "Votaciones MVP",
    description: "Abrir, cerrar y revisar votaciones.",
  },
  {
    href: "/admin/normativa",
    title: "Editar normativa",
    description: "Crear y modificar reglas del torneo.",
  },
];

const BACKUP_TABLES = [
  "teams",
  "players",
  "matches",
  "final_matches",
  "match_players",
  "match_goals",
  "match_cards",
  "suspensions",
  "suspension_served_matches",
  "mvp_votes",
  "rules",
];

const RESTORE_INSERT_ORDER = [
  "teams",
  "players",
  "matches",
  "final_matches",
  "match_players",
  "match_goals",
  "match_cards",
  "suspensions",
  "suspension_served_matches",
  "mvp_votes",
  "rules",
];

function AdminCard({ item }: { item: AdminLink }) {
  const principal = item.variant === "primary";

  return (
    <Link
      href={item.href}
      className={`block rounded-2xl p-5 shadow ${
        principal ? "bg-red-600 text-white" : "bg-white/95 text-slate-900"
      }`}
    >
      <p className="text-lg font-black leading-tight">{item.title}</p>

      <p
        className={`mt-1 text-sm font-bold ${
          principal ? "text-red-100" : "text-slate-500"
        }`}
      >
        {item.description}
      </p>
    </Link>
  );
}

function nombreArchivoBackup() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `backup_torneo_astrabu_${year}${month}${day}_${hour}${minute}.json`;
}

function descargarJson(data: BackupData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nombreArchivoBackup();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function normalizarTexto(texto: string | null | undefined) {
  return (texto ?? "").trim().toLowerCase();
}

function referenciaOriginalEliminatoria(
  sourceType: string | null,
  sourceMatchTitle: string | null,
  valorActual: string,
) {
  const tipo = normalizarTexto(sourceType);
  const titulo = (sourceMatchTitle ?? "").trim();

  if (!titulo) return valorActual;

  if (tipo === "winner" || tipo === "ganador") {
    return `Ganador ${titulo}`;
  }

  if (tipo === "loser" || tipo === "perdedor") {
    return `Perdedor ${titulo}`;
  }

  return valorActual;
}

async function comprobarError(
  resultado: PromiseLike<{ error: { message: string } | null }>,
  accion: string,
) {
  const { error } = await resultado;

  if (error) {
    throw new Error(`${accion}: ${error.message}`);
  }
}

export default function AdminPage() {
  const [mostrarZonaPeligrosa, setMostrarZonaPeligrosa] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [mensajeMantenimiento, setMensajeMantenimiento] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vieneDeAccesoOculto = params.get("danger") === "1";
    const permisoTemporal =
      sessionStorage.getItem("zonaPeligrosaAdmin") === "true";

    setMostrarZonaPeligrosa(vieneDeAccesoOculto && permisoTemporal);
  }, []);

  function ocultarZonaPeligrosa() {
    sessionStorage.removeItem("zonaPeligrosaAdmin");
    setMostrarZonaPeligrosa(false);
    window.history.replaceState(null, "", "/admin");
  }

  function confirmarOperacion(titulo: string, detalle: string) {
    const confirmar1 = window.confirm(
      `⚠️ ${titulo}\n\n${detalle}\n\n¿Quieres continuar?`,
    );

    if (!confirmar1) return false;

    const confirmar2 = window.confirm(
      `🚨 Última confirmación.\n\nEsta acción no se puede deshacer.\n\n¿Confirmas "${titulo}"?`,
    );

    return confirmar2;
  }

  async function ejecutarOperacion(
    titulo: string,
    detalle: string,
    callback: () => Promise<void>,
  ) {
    if (trabajando) return;
    if (!confirmarOperacion(titulo, detalle)) return;

    setTrabajando(true);
    setMensajeMantenimiento("");

    try {
      await callback();
      setMensajeMantenimiento(`${titulo} realizado correctamente.`);
    } catch (error) {
      console.error(error);
      setMensajeMantenimiento(
        `No se ha podido completar la operación: ${
          error instanceof Error ? error.message : "error desconocido"
        }`,
      );
    } finally {
      setTrabajando(false);
    }
  }

  async function limpiarDatosPartidosGrupo() {
    const db = supabase as any;

    await comprobarError(
      db.from("mvp_votes").delete().not("match_id", "is", null),
      "Borrando votos MVP de clasificación",
    );

    await comprobarError(
      db
        .from("suspension_served_matches")
        .delete()
        .not("match_id", "is", null),
      "Borrando partidos de sanción cumplidos de clasificación",
    );

    await comprobarError(
      db.from("suspensions").delete().not("match_id", "is", null),
      "Borrando sanciones de clasificación",
    );

    await comprobarError(
      db.from("match_cards").delete().not("match_id", "is", null),
      "Borrando tarjetas de clasificación",
    );

    await comprobarError(
      db.from("match_goals").delete().not("match_id", "is", null),
      "Borrando goles de clasificación",
    );

    await comprobarError(
      db.from("match_players").delete().not("match_id", "is", null),
      "Borrando jugadores de fichas de clasificación",
    );
  }

  async function limpiarDatosEliminatorias() {
    const db = supabase as any;

    await comprobarError(
      db.from("mvp_votes").delete().not("final_match_id", "is", null),
      "Borrando votos MVP de eliminatorias",
    );

    await comprobarError(
      db
        .from("suspension_served_matches")
        .delete()
        .not("final_match_id", "is", null),
      "Borrando partidos de sanción cumplidos de eliminatorias",
    );

    await comprobarError(
      db.from("suspensions").delete().not("final_match_id", "is", null),
      "Borrando sanciones de eliminatorias",
    );

    await comprobarError(
      db.from("match_cards").delete().not("final_match_id", "is", null),
      "Borrando tarjetas de eliminatorias",
    );

    await comprobarError(
      db.from("match_goals").delete().not("final_match_id", "is", null),
      "Borrando goles de eliminatorias",
    );

    await comprobarError(
      db.from("match_players").delete().not("final_match_id", "is", null),
      "Borrando jugadores de fichas de eliminatorias",
    );
  }

  async function borrarResultadosClasificacion() {
    const db = supabase as any;

    await limpiarDatosPartidosGrupo();

    await comprobarError(
      db
        .from("matches")
        .update({
          home_score: null,
          away_score: null,
          status: "Pendiente",
          mvp_open: false,
          incidents: null,
        })
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Quitando resultados de clasificación",
    );
  }

  async function borrarResultadosEliminatorias() {
    const db = supabase as any;

    await limpiarDatosEliminatorias();

    const { data, error } = await db
      .from("final_matches")
      .select(
        `
        id,
        home_ref,
        away_ref,
        home_source_type,
        home_source_match_title,
        away_source_type,
        away_source_match_title
      `,
      )
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(`Leyendo eliminatorias: ${error.message}`);
    }

    const eliminatorias = (data ?? []) as FinalMatchMaintenance[];

    for (const eliminatoria of eliminatorias) {
      const homeRefOriginal = referenciaOriginalEliminatoria(
        eliminatoria.home_source_type,
        eliminatoria.home_source_match_title,
        eliminatoria.home_ref,
      );

      const awayRefOriginal = referenciaOriginalEliminatoria(
        eliminatoria.away_source_type,
        eliminatoria.away_source_match_title,
        eliminatoria.away_ref,
      );

      await comprobarError(
        db
          .from("final_matches")
          .update({
            home_ref: homeRefOriginal,
            away_ref: awayRefOriginal,
            home_score: null,
            away_score: null,
            home_penalties: null,
            away_penalties: null,
            status: "Pendiente",
            mvp_open: false,
            incidents: null,
          })
          .eq("id", eliminatoria.id),
        `Quitando resultado de ${eliminatoria.id}`,
      );
    }
  }

  async function borrarActasYFichas() {
    const db = supabase as any;

    await comprobarError(
      db
        .from("mvp_votes")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando votos MVP",
    );

    await comprobarError(
      db
        .from("suspension_served_matches")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando partidos de sanción cumplidos",
    );

    await comprobarError(
      db
        .from("suspensions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando sanciones",
    );

    await comprobarError(
      db
        .from("match_cards")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando tarjetas",
    );

    await comprobarError(
      db
        .from("match_goals")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando goles",
    );

    await comprobarError(
      db
        .from("match_players")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando jugadores de fichas",
    );

    await comprobarError(
      db
        .from("matches")
        .update({
          incidents: null,
          mvp_open: false,
        })
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Limpiando incidencias de clasificación",
    );

    await comprobarError(
      db
        .from("final_matches")
        .update({
          incidents: null,
          mvp_open: false,
        })
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Limpiando incidencias de eliminatorias",
    );
  }

  async function borrarSanciones() {
    const db = supabase as any;

    await comprobarError(
      db
        .from("suspension_served_matches")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando partidos de sanción cumplidos",
    );

    await comprobarError(
      db
        .from("suspensions")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando sanciones",
    );
  }

  async function borrarCalendarioClasificacion() {
    const db = supabase as any;

    await limpiarDatosPartidosGrupo();

    await comprobarError(
      db
        .from("matches")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando calendario",
    );
  }

  async function borrarEliminatorias() {
    const db = supabase as any;

    await limpiarDatosEliminatorias();

    await comprobarError(
      db
        .from("final_matches")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando eliminatorias",
    );
  }

  async function borrarJugadores() {
    const db = supabase as any;

    await borrarActasYFichas();

    await comprobarError(
      db
        .from("players")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando jugadores",
    );
  }

  async function borrarEquipos() {
    const db = supabase as any;

    await borrarActasYFichas();
    await borrarCalendarioClasificacion();
    await borrarEliminatorias();

    await comprobarError(
      db
        .from("players")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando jugadores",
    );

    await comprobarError(
      db
        .from("teams")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"),
      "Borrando equipos",
    );
  }

  async function borrarDatosTorneo() {
    await ejecutarOperacion(
      "Borrar TODO el torneo",
      "Se eliminarán equipos, jugadores, calendario, eliminatorias, fichas, goles, tarjetas, sanciones, votos MVP y normativa.",
      async () => {
        const { error } = await supabase.rpc("reset_torneo");

        if (error) {
          throw new Error(error.message);
        }

        sessionStorage.removeItem("zonaPeligrosaAdmin");
      },
    );

    window.location.reload();
  }

  async function crearCopiaSeguridad() {
    if (trabajando) return;

    const confirmar = window.confirm(
      "Se descargará una copia de seguridad en formato JSON con los datos principales del torneo.\n\n¿Continuar?",
    );

    if (!confirmar) return;

    setTrabajando(true);
    setMensajeMantenimiento("");

    try {
      const db = supabase as any;
      const tables: BackupData["tables"] = {};

      for (const tableName of BACKUP_TABLES) {
        const { data, error } = await db.from(tableName).select("*");

        if (error) {
          throw new Error(`Error leyendo ${tableName}: ${error.message}`);
        }

        tables[tableName] = (data ?? []) as Array<Record<string, unknown>>;
      }

      descargarJson({
        version: 1,
        created_at: new Date().toISOString(),
        tables,
      });

      setMensajeMantenimiento("Copia de seguridad descargada correctamente.");
    } catch (error) {
      console.error(error);
      setMensajeMantenimiento(
        `No se ha podido crear la copia: ${
          error instanceof Error ? error.message : "error desconocido"
        }`,
      );
    } finally {
      setTrabajando(false);
    }
  }

  function abrirSelectorRestauracion() {
    if (trabajando) return;
    fileInputRef.current?.click();
  }

  async function restaurarDesdeArchivo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const confirmar1 = window.confirm(
      "⚠️ Restaurar una copia sustituirá los datos actuales del torneo.\n\nAntes de restaurar, es recomendable descargar una copia de seguridad del estado actual.\n\n¿Quieres continuar?",
    );

    if (!confirmar1) return;

    const confirmar2 = window.confirm(
      "🚨 Última confirmación.\n\nSe borrarán los datos actuales y se cargarán los del archivo seleccionado.\n\n¿Restaurar copia?",
    );

    if (!confirmar2) return;

    setTrabajando(true);
    setMensajeMantenimiento("");

    try {
      const text = await file.text();
      const backup = JSON.parse(text) as BackupData;

      if (!backup || backup.version !== 1 || !backup.tables) {
        throw new Error("El archivo no parece una copia válida.");
      }

      const db = supabase as any;

      await borrarActasYFichas();
      await borrarCalendarioClasificacion();
      await borrarEliminatorias();

      await comprobarError(
        db
          .from("rules")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"),
        "Borrando normativa",
      );

      await comprobarError(
        db
          .from("players")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"),
        "Borrando jugadores",
      );

      await comprobarError(
        db
          .from("teams")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"),
        "Borrando equipos",
      );

      for (const tableName of RESTORE_INSERT_ORDER) {
        const rows = backup.tables[tableName] ?? [];

        if (rows.length === 0) continue;

        const { error } = await db.from(tableName).insert(rows);

        if (error) {
          throw new Error(`Error restaurando ${tableName}: ${error.message}`);
        }
      }

      setMensajeMantenimiento("Copia restaurada correctamente.");
      window.location.reload();
    } catch (error) {
      console.error(error);
      setMensajeMantenimiento(
        `No se ha podido restaurar la copia: ${
          error instanceof Error ? error.message : "error desconocido"
        }`,
      );
    } finally {
      setTrabajando(false);
    }
  }

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
              Panel admin
            </h1>

            <p className="mt-2 text-center text-sm font-bold text-emerald-100">
              Gestión del torneo
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-red-600">
                Operativa del torneo
              </p>

              <div className="space-y-3">
                {principales.map((item) => (
                  <AdminCard key={item.href} item={item} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">
                Datos base
              </p>

              <div className="space-y-3">
                {datos.map((item) => (
                  <AdminCard key={item.href} item={item} />
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/95 p-4 shadow-2xl backdrop-blur">
              <p className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">
                Contenido y MVP
              </p>

              <div className="space-y-3">
                {extras.map((item) => (
                  <AdminCard key={item.href} item={item} />
                ))}
              </div>
            </div>
          </div>

          {mostrarZonaPeligrosa && (
            <div className="mt-8 space-y-5">
              <div className="rounded-3xl border-2 border-red-600 bg-red-50 p-5 shadow-2xl">
                <p className="text-sm font-black uppercase tracking-widest text-red-700">
                  Zona peligrosa
                </p>

                <p className="mt-2 text-sm font-bold text-red-900">
                  Herramientas de mantenimiento para limpiar datos de prueba por
                  partes.
                </p>

                {mensajeMantenimiento && (
                  <div
                    className={`mt-4 rounded-xl p-3 text-sm font-bold ${
                      mensajeMantenimiento.includes("correctamente") ||
                      mensajeMantenimiento.includes("descargada") ||
                      mensajeMantenimiento.includes("restaurada")
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {mensajeMantenimiento}
                  </div>
                )}
              </div>

              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <p className="text-sm font-black uppercase tracking-widest text-red-600">
                  Copia de seguridad
                </p>

                <p className="mt-2 text-sm font-bold text-slate-600">
                  Descarga o restaura los datos principales del torneo.
                </p>

                <button
                  onClick={crearCopiaSeguridad}
                  disabled={trabajando}
                  className="mt-4 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                >
                  Descargar copia de seguridad
                </button>

                <button
                  onClick={abrirSelectorRestauracion}
                  disabled={trabajando}
                  className="mt-3 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:opacity-50"
                >
                  Restaurar desde copia
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={restaurarDesdeArchivo}
                  className="hidden"
                />
              </div>

              <div className="rounded-3xl bg-white/95 p-5 shadow-2xl backdrop-blur">
                <p className="text-sm font-black uppercase tracking-widest text-red-600">
                  Limpieza individual
                </p>

                <div className="mt-4 space-y-3">
                  <button
                    onClick={() =>
                      ejecutarOperacion(
                        "Borrar equipos",
                        "Se borrarán equipos, jugadores, calendario, eliminatorias, fichas, resultados, sanciones y votos asociados.",
                        borrarEquipos,
                      )
                    }
                    disabled={trabajando}
                    className="w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                  >
                    Borrar equipos
                  </button>

                  <button
                    onClick={() =>
                      ejecutarOperacion(
                        "Borrar jugadores",
                        "Se borrarán jugadores y todos sus datos asociados: fichas, goles, tarjetas, sanciones y votos.",
                        borrarJugadores,
                      )
                    }
                    disabled={trabajando}
                    className="w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                  >
                    Borrar jugadores
                  </button>

                  <button
                    onClick={() =>
                      ejecutarOperacion(
                        "Quitar resultados de clasificación",
                        "Se pondrán a cero los marcadores, estados, MVP, incidencias, fichas, goles, tarjetas, sanciones y votos de los partidos de clasificación. No se eliminará el calendario.",
                        borrarResultadosClasificacion,
                      )
                    }
                    disabled={trabajando}
                    className="w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                  >
                    Quitar resultados de clasificación
                  </button>

                  <button
                    onClick={() =>
                      ejecutarOperacion(
                        "Quitar resultados de eliminatorias",
                        "Se pondrán a cero los marcadores, penaltis, estados, MVP, incidencias, fichas, goles, tarjetas, sanciones y votos de eliminatorias. No se eliminarán los cruces.",
                        borrarResultadosEliminatorias,
                      )
                    }
                    disabled={trabajando}
                    className="w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                  >
                    Quitar resultados de eliminatorias
                  </button>

                  <button
                    onClick={() =>
                      ejecutarOperacion(
                        "Borrar calendario",
                        "Se borrarán todos los partidos de clasificación y sus datos asociados.",
                        borrarCalendarioClasificacion,
                      )
                    }
                    disabled={trabajando}
                    className="w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                  >
                    Borrar calendario
                  </button>

                  <button
                    onClick={() =>
                      ejecutarOperacion(
                        "Borrar eliminatorias",
                        "Se borrarán todos los cruces de eliminatorias y sus datos asociados.",
                        borrarEliminatorias,
                      )
                    }
                    disabled={trabajando}
                    className="w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                  >
                    Borrar eliminatorias
                  </button>

                  <button
                    onClick={() =>
                      ejecutarOperacion(
                        "Borrar actas y fichas",
                        "Se borrarán participantes, goles, tarjetas, incidencias, sanciones y votos MVP asociados a las fichas.",
                        borrarActasYFichas,
                      )
                    }
                    disabled={trabajando}
                    className="w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                  >
                    Borrar actas y fichas
                  </button>

                  <button
                    onClick={() =>
                      ejecutarOperacion(
                        "Borrar sanciones",
                        "Se borrarán sanciones y partidos de sanción cumplidos.",
                        borrarSanciones,
                      )
                    }
                    disabled={trabajando}
                    className="w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                  >
                    Borrar sanciones
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border-2 border-red-600 bg-red-50 p-5 shadow-2xl">
                <p className="text-sm font-black uppercase tracking-widest text-red-700">
                  Borrado total
                </p>

                <p className="mt-2 text-sm font-bold text-red-900">
                  Borra todos los datos del torneo para empezar desde cero.
                </p>

                <button
                  onClick={borrarDatosTorneo}
                  disabled={trabajando}
                  className="mt-4 w-full rounded-xl bg-red-600 py-3 font-black text-white shadow disabled:opacity-50"
                >
                  Borrar TODO el torneo
                </button>

                <button
                  onClick={ocultarZonaPeligrosa}
                  disabled={trabajando}
                  className="mt-3 w-full rounded-xl bg-slate-900 py-3 font-black text-white shadow disabled:opacity-50"
                >
                  Ocultar zona peligrosa
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </AdminGuard>
  );
}