export const teams = [
  { id: "a1", name: "Astrabudua FC", group: "Grupo A" },
  { id: "a2", name: "Betiko", group: "Grupo A" },
  { id: "a3", name: "Bolue", group: "Grupo A" },
  { id: "a4", name: "Erandio Norte", group: "Grupo A" },
  { id: "a5", name: "Altzaga United", group: "Grupo A" },
  { id: "a6", name: "Lutxana Tigers", group: "Grupo A" },

  { id: "b1", name: "Fuenla", group: "Grupo B" },
  { id: "b2", name: "Sporting C.P.", group: "Grupo B" },
  { id: "b3", name: "Basauriko Kimuak", group: "Grupo B" },
  { id: "b4", name: "Indautxu City", group: "Grupo B" },
  { id: "b5", name: "Leioa Stars", group: "Grupo B" },
  { id: "b6", name: "Sestao River Kids", group: "Grupo B" },

  { id: "c1", name: "Barakaldo Sur", group: "Grupo C" },
  { id: "c2", name: "Portugalete Blue", group: "Grupo C" },
  { id: "c3", name: "Santutxu Lions", group: "Grupo C" },
  { id: "c4", name: "Deusto Academy", group: "Grupo C" },
  { id: "c5", name: "Getxo Futbola", group: "Grupo C" },
  { id: "c6", name: "Mungia Taldea", group: "Grupo C" },

  { id: "d1", name: "Durango 2026", group: "Grupo D" },
  { id: "d2", name: "Galdakao Futbol", group: "Grupo D" },
  { id: "d3", name: "Urduliz FT", group: "Grupo D" },
  { id: "d4", name: "Trapagaran Club", group: "Grupo D" },
  { id: "d5", name: "Bilbao Athletic Txiki", group: "Grupo D" },
  { id: "d6", name: "Berango Stars", group: "Grupo D" },
];

export const matches = [
  {
    id: "m1",
    group: "Grupo A",
    date: "2026-07-01",
    time: "18:00",
    field: "Campo 1",
    homeTeam: "Astrabudua FC",
    awayTeam: "Betiko",
    homeScore: 2,
    awayScore: 1,
    status: "Finalizado",
    mvpOpen: true,
  },
  {
    id: "m2",
    group: "Grupo A",
    date: "2026-07-01",
    time: "19:00",
    field: "Campo 2",
    homeTeam: "Bolue",
    awayTeam: "Erandio Norte",
    homeScore: 0,
    awayScore: 0,
    status: "Finalizado",
    mvpOpen: true,
  },
  {
    id: "m3",
    group: "Grupo B",
    date: "2026-07-02",
    time: "18:30",
    field: "Campo 1",
    homeTeam: "Fuenla",
    awayTeam: "Sporting C.P.",
    homeScore: null,
    awayScore: null,
    status: "Pendiente",
    mvpOpen: false,
  },
  {
    id: "m4",
    group: "Grupo C",
    date: "2026-07-02",
    time: "19:30",
    field: "Campo 2",
    homeTeam: "Barakaldo Sur",
    awayTeam: "Portugalete Blue",
    homeScore: null,
    awayScore: null,
    status: "Pendiente",
    mvpOpen: false,
  },
];

export const mvpCandidates = [
  { id: "p1", matchId: "m1", name: "Ane García", team: "Astrabudua FC", votes: 12 },
  { id: "p2", matchId: "m1", name: "Oihane Pérez", team: "Betiko", votes: 9 },
  { id: "p3", matchId: "m1", name: "June Martín", team: "Betiko", votes: 5 },
  { id: "p4", matchId: "m2", name: "Nahia López", team: "Bolue", votes: 7 },
  { id: "p5", matchId: "m2", name: "Irati Gómez", team: "Erandio Norte", votes: 4 },
];

export const rules = [
  "Cada partido tendrá una duración de 25 minutos.",
  "La victoria suma 3 puntos, el empate 1 punto y la derrota 0 puntos.",
  "En caso de empate en la clasificación se tendrá en cuenta la diferencia de goles.",
  "Cada usuario registrado podrá votar una sola vez el MVP de cada partido.",
  "La organización podrá modificar horarios por causas justificadas.",
];

export const players = [
  { id: "j1", teamId: "a1", name: "Ane García", number: 7, position: "Delantera" },
  { id: "j2", teamId: "a1", name: "Nahia López", number: 10, position: "Centrocampista" },
  { id: "j3", teamId: "a1", name: "Irati Gómez", number: 4, position: "Defensa" },
  { id: "j4", teamId: "a1", name: "Maialen Ruiz", number: 1, position: "Portera" },

  { id: "j5", teamId: "a2", name: "Oihane Pérez", number: 17, position: "Delantera" },
  { id: "j6", teamId: "a2", name: "June Martín", number: 8, position: "Centrocampista" },
  { id: "j7", teamId: "a2", name: "Uxue Fernández", number: 5, position: "Defensa" },
  { id: "j8", teamId: "a2", name: "Alazne Soto", number: 13, position: "Portera" },

  { id: "j9", teamId: "a3", name: "Leire Santos", number: 9, position: "Delantera" },
  { id: "j10", teamId: "a3", name: "Iraia Núñez", number: 6, position: "Centrocampista" },
  { id: "j11", teamId: "a3", name: "Maddi Torres", number: 3, position: "Defensa" },
  { id: "j12", teamId: "a3", name: "Sara Peña", number: 1, position: "Portera" },
];