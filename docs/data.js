const categoryPalettes = {
  industrial: { icon: "industrial", color: "#f5ab00", light: "#fff0c3", text: "#725100", ink: "#231748" },
  graphic: { icon: "graphic", color: "#f57097", light: "#fde1eb", text: "#8e2f5a", ink: "#261544" },
  architecture: { icon: "architecture", color: "#565fa6", light: "#e8e8fa", text: "#48487d", ink: "#fff" },
  textile: { icon: "textile", color: "#1ea367", light: "#d9f3e5", text: "#216543", ink: "#11282a" },
  video: { icon: "video", color: "#017eeb", light: "#d7edff", text: "#165991", ink: "#11123c" },
  gear: { icon: "camera", color: "#f05a23", light: "#fee5da", text: "#973719", ink: "#21153b" },
  space: { icon: "space", color: "#29abe1", light: "#d9f1f9", text: "#1b5e78", ink: "#1b1a47" },
};

const categoryGroups = {
  diseno: { label: "Ramas del diseño", palette: "graphic" },
  produccion: { label: "Producción y fabricación para diseño", palette: "industrial" },
  recursos: { label: "Equipos y espacios", palette: "space" },
};

const categories = {};
const categoryOptions = {
  diseno: [
    ["graphic", "Diseño gráfico y comunicación visual", "graphic"],
    ["publicidad", "Diseño publicitario", "graphic"],
    ["editorial", "Diseño editorial", "graphic"],
    ["tipografia", "Diseño tipográfico", "graphic"],
    ["informacion", "Diseño de información", "graphic"],
    ["ilustracion", "Ilustración aplicada", "graphic"],
    ["envases", "Diseño de envases y embalajes", "industrial"],
    ["digital", "Diseño digital y de interacción", "video"],
    ["video", "Diseño audiovisual y animación", "video"],
    ["sonoro", "Diseño sonoro", "video"],
    ["videojuegos", "Diseño de videojuegos", "video"],
    ["inmersivo", "Diseño de experiencias inmersivas", "video"],
    ["industrial", "Diseño industrial y de producto", "industrial"],
    ["movilidad", "Diseño de movilidad y transporte", "industrial"],
    ["moda", "Diseño de indumentaria y moda", "textile"],
    ["textile", "Diseño textil y de superficies", "textile"],
    ["accesorios", "Diseño de calzado, accesorios y joyería", "textile"],
    ["architecture", "Diseño arquitectónico y urbano", "architecture"],
    ["interiores", "Diseño de interiores y espacios comerciales", "architecture"],
    ["iluminacion", "Diseño de iluminación", "architecture"],
    ["paisajismo", "Diseño paisajístico", "architecture"],
    ["expositivo", "Diseño expositivo y escenográfico", "architecture"],
    ["senaletica", "Diseño de señalética", "graphic"],
    ["servicios", "Diseño de servicios", "graphic"],
    ["instruccional", "Diseño instruccional", "graphic"],
    ["estrategico", "Diseño estratégico y sistémico", "graphic"],
  ],
  produccion: [
    ["imprentas", "Imprentas y encuadernadores", "graphic"],
    ["carteleria", "Talleres de cartelería y rotulación", "graphic"],
    ["fabricacion-envases", "Fabricantes de envases y etiquetas", "industrial"],
    ["carpinterias", "Carpinterías y ebanisterías", "industrial"],
    ["metalurgicas", "Metalúrgicas y herrerías", "industrial"],
    ["tapicerias", "Tapicerías", "textile"],
    ["confeccion", "Talleres textiles y de confección", "textile"],
    ["estampado", "Estampadores y bordadores", "textile"],
    ["marroquineria", "Talleres de calzado y marroquinería", "textile"],
    ["orfebreria", "Talleres de joyería y orfebrería", "textile"],
    ["ceramica-fibras", "Talleres de cerámica y fibras vegetales", "textile"],
    ["vidrierias", "Vidrierías y marmolerías", "architecture"],
    ["plasticos-resinas", "Talleres de acrílico, plásticos y resinas", "industrial"],
    ["impresion-3d", "Impresión 3D", "industrial"],
    ["prototipado", "Servicios de prototipado y matricería", "industrial"],
    ["terminaciones", "Talleres de terminaciones", "industrial"],
    ["fabricacion-iluminacion", "Talleres de iluminación aplicada", "industrial"],
    ["stands-escenografia", "Talleres de stands y escenografía", "architecture"],
  ],
  recursos: [
    ["gear", "Alquiler de equipos", "gear"],
    ["space", "Espacios y talleres", "space"],
  ],
};
for (const [group, options] of Object.entries(categoryOptions)) {
  for (const [key, label, palette] of options) {
    categories[key] = { ...categoryPalettes[palette], label, group };
  }
}

// Puntos de referencia por localidad. Los perfiles no publican domicilios privados.
const towns = {
  "localidad-54014060": {
    "label": "1º de Mayo",
    "point": [
      -27.16799,
      -55.02906
    ]
  },
  "localidad-54119060": {
    "label": "25 de Mayo",
    "point": [
      -27.37818,
      -54.74488
    ]
  },
  "localidad-54042050": {
    "label": "9 de Julio Kilómetro 20",
    "point": [
      -26.41472,
      -54.49586
    ]
  },
  "localidad-54042040": {
    "label": "9 de Julio Kilómetro 28",
    "point": [
      -26.43028,
      -54.46647
    ]
  },
  "localidad-54119010": {
    "label": "Alba Posse",
    "point": [
      -27.56895,
      -54.68304
    ]
  },
  "localidad-54119020": {
    "label": "Alicia Alta",
    "point": [
      -27.37782,
      -54.3521
    ]
  },
  "localidad-54119025": {
    "label": "Alicia Baja",
    "point": [
      -27.4394,
      -54.35371
    ]
  },
  "localidad-54070010": {
    "label": "Almafuerte",
    "point": [
      -27.50812,
      -55.40352
    ]
  },
  "apostoles": {
    "label": "Apóstoles",
    "point": [
      -27.91414,
      -55.75486
    ]
  },
  "localidad-54014010": {
    "label": "Aristóbulo del Valle",
    "point": [
      -27.09568,
      -54.89342
    ]
  },
  "localidad-54070020": {
    "label": "Arroyo del Medio",
    "point": [
      -27.69826,
      -55.40486
    ]
  },
  "localidad-54007020": {
    "label": "Azara",
    "point": [
      -28.06071,
      -55.67707
    ]
  },
  "localidad-54084007": {
    "label": "Bario Ita",
    "point": [
      -26.52952,
      -54.7068
    ]
  },
  "localidad-54035010": {
    "label": "Barra Concepción",
    "point": [
      -28.1167,
      -55.58152
    ]
  },
  "localidad-54084003": {
    "label": "Barrio Cuatro Bocas",
    "point": [
      -26.5503,
      -54.68055
    ]
  },
  "localidad-54021005": {
    "label": "Barrio del Lago",
    "point": [
      -27.46652,
      -55.79899
    ]
  },
  "localidad-54091013": {
    "label": "Barrio Escuela 461",
    "point": [
      -27.62446,
      -55.03947
    ]
  },
  "localidad-54091017": {
    "label": "Barrio Escuela 633",
    "point": [
      -27.47036,
      -55.08059
    ]
  },
  "localidad-54084005": {
    "label": "Barrio Guatambu",
    "point": [
      -26.60552,
      -54.69871
    ]
  },
  "localidad-54007025": {
    "label": "Barrio Rural",
    "point": [
      -27.88112,
      -55.78728
    ]
  },
  "localidad-54098005": {
    "label": "Barrio Tungoil",
    "point": [
      -27.11482,
      -55.38387
    ]
  },
  "localidad-54049020": {
    "label": "Bernardo de Irigoyen",
    "point": [
      -26.25533,
      -53.64673
    ]
  },
  "localidad-54021010": {
    "label": "Bonpland",
    "point": [
      -27.4854,
      -55.48009
    ]
  },
  "localidad-54070030": {
    "label": "Caá - Yarí",
    "point": [
      -27.48488,
      -55.29896
    ]
  },
  "localidad-54049025": {
    "label": "Caburei",
    "point": [
      -25.68213,
      -54.14136
    ]
  },
  "localidad-54014020": {
    "label": "Campo Grande",
    "point": [
      -27.20796,
      -54.9797
    ]
  },
  "localidad-54091020": {
    "label": "Campo Ramón",
    "point": [
      -27.45427,
      -55.02295
    ]
  },
  "localidad-54091030": {
    "label": "Campo Viera",
    "point": [
      -27.33097,
      -55.05425
    ]
  },
  "localidad-54021020": {
    "label": "Candelaria",
    "point": [
      -27.46122,
      -55.74396
    ]
  },
  "localidad-54077010": {
    "label": "Capioví",
    "point": [
      -26.92832,
      -55.0573
    ]
  },
  "localidad-54077015": {
    "label": "Capioviciño",
    "point": [
      -26.89171,
      -55.07224
    ]
  },
  "localidad-54084010": {
    "label": "Caraguatay",
    "point": [
      -26.65728,
      -54.73918
    ]
  },
  "localidad-54070040": {
    "label": "Cerro Azul",
    "point": [
      -27.63358,
      -55.49742
    ]
  },
  "localidad-54021030": {
    "label": "Cerro Corá",
    "point": [
      -27.51192,
      -55.60961
    ]
  },
  "localidad-54091010": {
    "label": "Colonia Alberdi",
    "point": [
      -27.36003,
      -55.23133
    ]
  },
  "localidad-54119030": {
    "label": "Colonia Aurora",
    "point": [
      -27.47372,
      -54.52411
    ]
  },
  "localidad-54098010": {
    "label": "Colonia Polana",
    "point": [
      -26.98199,
      -55.31823
    ]
  },
  "localidad-54042010": {
    "label": "Colonia Victoria",
    "point": [
      -26.33369,
      -54.62461
    ]
  },
  "localidad-54063040": {
    "label": "Colonia Wanda",
    "point": [
      -25.97337,
      -54.56304
    ]
  },
  "localidad-54049010": {
    "label": "Comandante Andresito",
    "point": [
      -25.66716,
      -54.04986
    ]
  },
  "localidad-54035020": {
    "label": "Concepción de la Sierra",
    "point": [
      -27.98058,
      -55.52159
    ]
  },
  "localidad-54098020": {
    "label": "Corpus",
    "point": [
      -27.12947,
      -55.51083
    ]
  },
  "localidad-54112010": {
    "label": "Cruce Caballero",
    "point": [
      -26.5421,
      -53.94188
    ]
  },
  "localidad-54098030": {
    "label": "Domingo Savio",
    "point": [
      -27.35543,
      -55.33847
    ]
  },
  "localidad-54070050": {
    "label": "Dos Arroyos",
    "point": [
      -27.69908,
      -55.25182
    ]
  },
  "localidad-54014030": {
    "label": "Dos de Mayo",
    "point": [
      -27.01994,
      -54.68453
    ]
  },
  "localidad-5401403001": {
    "label": "Dos de Mayo Núcleo I",
    "point": [
      -27.0221,
      -54.68561
    ]
  },
  "localidad-5401403002": {
    "label": "Dos de Mayo Núcleo II",
    "point": [
      -27.03186,
      -54.66491
    ]
  },
  "localidad-54014050": {
    "label": "Dos de Mayo Nucleo III (Bº Bernardino Rivadavia)",
    "point": [
      -27.01334,
      -54.60816
    ]
  },
  "localidad-54049030": {
    "label": "Dos Hermanas",
    "point": [
      -26.29308,
      -53.75693
    ]
  },
  "localidad-54077020": {
    "label": "El Alcázar",
    "point": [
      -26.71365,
      -54.81405
    ]
  },
  "localidad-54091040": {
    "label": "El Salto",
    "point": [
      -27.49519,
      -55.19873
    ]
  },
  "localidad-54056010": {
    "label": "El Soberbio",
    "point": [
      -27.29751,
      -54.19755
    ]
  },
  "eldorado": {
    "label": "Eldorado",
    "point": [
      -26.40888,
      -54.60705
    ]
  },
  "localidad-54007030": {
    "label": "Estación Apóstoles",
    "point": [
      -27.91153,
      -55.80922
    ]
  },
  "localidad-54105010": {
    "label": "Florentino Ameghino",
    "point": [
      -27.63362,
      -55.08553
    ]
  },
  "localidad-54056020": {
    "label": "Fracrán",
    "point": [
      -26.74343,
      -54.29745
    ]
  },
  "localidad-54077030": {
    "label": "Garuhapé",
    "point": [
      -26.82113,
      -54.95775
    ]
  },
  "localidad-54028010": {
    "label": "Garupá",
    "point": [
      -27.48378,
      -55.8297
    ]
  },
  "localidad-54091050": {
    "label": "General Alvear",
    "point": [
      -27.42635,
      -55.1696
    ]
  },
  "localidad-54098040": {
    "label": "General Urquiza",
    "point": [
      -27.10787,
      -55.37662
    ]
  },
  "localidad-54070060": {
    "label": "Gobernador López",
    "point": [
      -27.66636,
      -55.21347
    ]
  },
  "localidad-54098050": {
    "label": "Gobernador Roca",
    "point": [
      -27.19006,
      -55.46932
    ]
  },
  "localidad-54091060": {
    "label": "Guaraní",
    "point": [
      -27.52318,
      -55.15765
    ]
  },
  "localidad-54098060": {
    "label": "Helvecia",
    "point": [
      -27.10973,
      -55.34446
    ]
  },
  "localidad-54098070": {
    "label": "Hipólito Yrigoyen",
    "point": [
      -27.08571,
      -55.28742
    ]
  },
  "localidad-54049040": {
    "label": "Integración",
    "point": [
      -25.77096,
      -53.85518
    ]
  },
  "localidad-54105020": {
    "label": "Itacaruaré",
    "point": [
      -27.8714,
      -55.26221
    ]
  },
  "localidad-54098080": {
    "label": "Jardín América",
    "point": [
      -27.04316,
      -55.22702
    ]
  },
  "localidad-54014055": {
    "label": "Kilómetro 17",
    "point": [
      -27.31574,
      -54.90273
    ]
  },
  "localidad-54035030": {
    "label": "La Corita",
    "point": [
      -27.89253,
      -55.35555
    ]
  },
  "localidad-54084020": {
    "label": "Laharrague",
    "point": [
      -26.53539,
      -54.64974
    ]
  },
  "alem": {
    "label": "Leandro N. Alem",
    "point": [
      -27.60373,
      -55.32362
    ]
  },
  "localidad-54021040": {
    "label": "Loreto",
    "point": [
      -27.33295,
      -55.52225
    ]
  },
  "localidad-54091070": {
    "label": "Los Helechos",
    "point": [
      -27.55766,
      -55.07626
    ]
  },
  "localidad-54042030": {
    "label": "María Magdalena",
    "point": [
      -26.23728,
      -54.6029
    ]
  },
  "localidad-54021050": {
    "label": "Mártires",
    "point": [
      -27.42313,
      -55.3773
    ]
  },
  "localidad-54077040": {
    "label": "Mbopicuá",
    "point": [
      -26.86385,
      -55.04516
    ]
  },
  "localidad-54105030": {
    "label": "Mojón Grande",
    "point": [
      -27.71204,
      -55.15743
    ]
  },
  "localidad-54084030": {
    "label": "Montecarlo",
    "point": [
      -26.56665,
      -54.76613
    ]
  },
  "localidad-54028020": {
    "label": "Nemesio Parma",
    "point": [
      -27.35648,
      -56.01722
    ]
  },
  "localidad-54042035": {
    "label": "Nueva Delicia",
    "point": [
      -26.18173,
      -54.59122
    ]
  },
  "localidad-54098090": {
    "label": "Oasis",
    "point": [
      -26.97173,
      -55.24972
    ]
  },
  "obera": {
    "label": "Oberá",
    "point": [
      -27.48679,
      -55.12006
    ]
  },
  "localidad-54070080": {
    "label": "Olegario V. Andrade",
    "point": [
      -27.56759,
      -55.50228
    ]
  },
  "localidad-54091090": {
    "label": "Panambí",
    "point": [
      -27.72203,
      -54.91483
    ]
  },
  "localidad-54091105": {
    "label": "Panambi Kilómetro 15",
    "point": [
      -27.70915,
      -54.96745
    ]
  },
  "localidad-54091100": {
    "label": "Panambí Kilómetro 8",
    "point": [
      -27.6685,
      -54.98268
    ]
  },
  "localidad-54112020": {
    "label": "Paraíso",
    "point": [
      -26.68707,
      -54.20307
    ]
  },
  "localidad-54049043": {
    "label": "Piñalito Norte",
    "point": [
      -25.93311,
      -53.93296
    ]
  },
  "localidad-54112030": {
    "label": "Piñalito Sur",
    "point": [
      -26.4261,
      -53.84143
    ]
  },
  "localidad-54007040": {
    "label": "Pindapoy",
    "point": [
      -27.74942,
      -55.79478
    ]
  },
  "localidad-54084040": {
    "label": "Piray Kilómetro 18",
    "point": [
      -26.51605,
      -54.59142
    ]
  },
  "posadas": {
    "label": "Posadas",
    "point": [
      -27.36643,
      -55.89398
    ]
  },
  "localidad-54028040": {
    "label": "Posadas (Extensión)",
    "point": [
      -27.45243,
      -55.85271
    ]
  },
  "localidad-54021060": {
    "label": "Profundidad",
    "point": [
      -27.56172,
      -55.70457
    ]
  },
  "localidad-54014070": {
    "label": "Pueblo Illia",
    "point": [
      -27.15258,
      -54.56074
    ]
  },
  "localidad-54042055": {
    "label": "Pueblo Nuevo",
    "point": [
      -26.24341,
      -54.59122
    ]
  },
  "localidad-54049045": {
    "label": "Puerto Andresito",
    "point": [
      -25.59621,
      -54.00241
    ]
  },
  "localidad-54049047": {
    "label": "Puerto Deseado",
    "point": [
      -25.78584,
      -54.03895
    ]
  },
  "localidad-54063010": {
    "label": "Puerto Esperanza",
    "point": [
      -26.02061,
      -54.6152
    ]
  },
  "iguazu": {
    "label": "Puerto Iguazú",
    "point": [
      -25.59721,
      -54.57722
    ]
  },
  "localidad-54077050": {
    "label": "Puerto Leoni",
    "point": [
      -26.98985,
      -55.16588
    ]
  },
  "localidad-54063020": {
    "label": "Puerto Libertad",
    "point": [
      -25.92147,
      -54.58432
    ]
  },
  "localidad-54042060": {
    "label": "Puerto Mado",
    "point": [
      -26.22974,
      -54.62355
    ]
  },
  "localidad-54042070": {
    "label": "Puerto Pinares",
    "point": [
      -26.42734,
      -54.68296
    ]
  },
  "localidad-54084050": {
    "label": "Puerto Piray",
    "point": [
      -26.46734,
      -54.71803
    ]
  },
  "localidad-54077060": {
    "label": "Puerto Rico",
    "point": [
      -26.80859,
      -55.02213
    ]
  },
  "localidad-54021070": {
    "label": "Puerto Santa Ana",
    "point": [
      -27.33565,
      -55.58313
    ]
  },
  "localidad-54007050": {
    "label": "Rincón de Azara",
    "point": [
      -28.11362,
      -55.62953
    ]
  },
  "localidad-54098100": {
    "label": "Roca Chica",
    "point": [
      -27.21425,
      -55.42002
    ]
  },
  "localidad-54077070": {
    "label": "Ruiz de Montoya",
    "point": [
      -26.97043,
      -55.05222
    ]
  },
  "localidad-54014080": {
    "label": "Salto Encantado",
    "point": [
      -27.08732,
      -54.83337
    ]
  },
  "localidad-54077080": {
    "label": "San Alberto",
    "point": [
      -26.80824,
      -54.98947
    ]
  },
  "localidad-54049050": {
    "label": "San Antonio",
    "point": [
      -26.05737,
      -53.73412
    ]
  },
  "localidad-54119040": {
    "label": "San Francisco de Asís",
    "point": [
      -27.46265,
      -54.74532
    ]
  },
  "localidad-54077090": {
    "label": "San Gotardo",
    "point": [
      -26.92373,
      -55.12375
    ]
  },
  "localidad-54098110": {
    "label": "San Ignacio",
    "point": [
      -27.25861,
      -55.53897
    ]
  },
  "localidad-54105040": {
    "label": "San Javier",
    "point": [
      -27.86948,
      -55.13872
    ]
  },
  "localidad-54007060": {
    "label": "San José",
    "point": [
      -27.76999,
      -55.7803
    ]
  },
  "localidad-54091110": {
    "label": "San Martín",
    "point": [
      -27.46604,
      -55.27554
    ]
  },
  "localidad-54077100": {
    "label": "San Miguel",
    "point": [
      -26.85366,
      -54.88879
    ]
  },
  "localidad-54112040": {
    "label": "San Pedro",
    "point": [
      -26.62553,
      -54.1163
    ]
  },
  "vicente": {
    "label": "San Vicente",
    "point": [
      -26.9933,
      -54.48662
    ]
  },
  "localidad-54021080": {
    "label": "Santa Ana",
    "point": [
      -27.36921,
      -55.58171
    ]
  },
  "localidad-54035040": {
    "label": "Santa María",
    "point": [
      -27.93451,
      -55.40733
    ]
  },
  "localidad-54119050": {
    "label": "Santa Rita",
    "point": [
      -27.52032,
      -54.72791
    ]
  },
  "localidad-54042080": {
    "label": "Santiago de Liniers",
    "point": [
      -26.40119,
      -54.41565
    ]
  },
  "localidad-54098120": {
    "label": "Santo Pipó",
    "point": [
      -27.14012,
      -55.40851
    ]
  },
  "localidad-54084060": {
    "label": "Tarumá",
    "point": [
      -26.71744,
      -54.72006
    ]
  },
  "localidad-54112050": {
    "label": "Tobuna",
    "point": [
      -26.46997,
      -53.89113
    ]
  },
  "localidad-54007070": {
    "label": "Tres Capones",
    "point": [
      -28.00425,
      -55.6094
    ]
  },
  "localidad-54042090": {
    "label": "Valle Hermoso",
    "point": [
      -26.38442,
      -54.46346
    ]
  },
  "localidad-54077110": {
    "label": "Villa Akerman",
    "point": [
      -26.94333,
      -55.09552
    ]
  },
  "localidad-54091120": {
    "label": "Villa Bonita",
    "point": [
      -27.4829,
      -54.96483
    ]
  },
  "localidad-54063035": {
    "label": "Villa Cooperativa",
    "point": [
      -25.9442,
      -54.54494
    ]
  },
  "localidad-54070090": {
    "label": "Villa Libertad",
    "point": [
      -27.56544,
      -55.3202
    ]
  },
  "localidad-54084070": {
    "label": "Villa Parodi",
    "point": [
      -26.4989,
      -54.6783
    ]
  },
  "localidad-54042100": {
    "label": "Villa Roulet",
    "point": [
      -26.44237,
      -54.64047
    ]
  },
  "localidad-54077120": {
    "label": "Villa Urrutia",
    "point": [
      -26.83689,
      -54.75306
    ]
  }
};

const initialProfiles = [
  {
    id: "laion-design-studio",
    name: "Laion Design Studio",
    town: "posadas",
    category: "industrial",
    services: "Diseño de producto y mobiliario",
    description: "Leandro Ullon desarrolla productos y mobiliario, desde los primeros bocetos hasta el modelado 3D, el prototipado y la producción. También trabaja en diseño de interiores y visualización de proyectos.",
    tags: ["Diseño de producto", "Mobiliario", "Modelado 3D y CAD", "Renders", "Prototipado"],
    image: "laion",
    imageAlt: "Waterfall bench, banco diseñado por Leandro Ullon e inspirado en las Cataratas del Iguazú",
    credit: "Waterfall bench · Proyecto del portfolio de Leandro Ullon.",
    url: "https://laiondi.github.io/laiondesignstudio/",
    linkLabel: "Ver portfolio",
    email: "leandroullon@proton.me",
  },
  {
    id: "estudio-linea",
    name: "Estudio Línea",
    town: "obera",
    category: "graphic",
    services: "Identidad visual y packaging",
    description: "Diseño de identidad, etiquetas y piezas gráficas para emprendimientos que necesitan presentar sus productos en ferias, comercios o redes.",
    tags: ["Identidad visual", "Packaging", "Diseño editorial"],
    image: "graphic",
    demo: true,
  },
  {
    id: "selva-arquitectura",
    name: "Selva Arquitectura",
    town: "iguazu",
    category: "architecture",
    services: "Proyectos de arquitectura e interiores",
    description: "Proyectos para viviendas y comercios con atención a la luz natural, la ventilación y los materiales de la región. Desarrollo de anteproyectos y visualizaciones.",
    tags: ["Arquitectura", "Interiorismo", "Anteproyecto"],
    image: "architecture",
    demo: true,
  },
  {
    id: "raiz-textil",
    name: "Raíz Textil",
    town: "apostoles",
    category: "confeccion",
    processes: "Moldería, corte y confección",
    materials: "Telas planas y de punto",
    scale: "Muestras y series cortas",
    services: "Moldería y confección en series cortas",
    description: "Desarrollo de moldes y primeras muestras para marcas de indumentaria. Confección de series cortas y asesoramiento para elegir telas y terminaciones.",
    tags: ["Moldería", "Indumentaria", "Confección"],
    image: "textile",
    demo: true,
  },
  {
    id: "plano-norte",
    name: "Plano Norte",
    town: "eldorado",
    category: "video",
    services: "Producción audiovisual y edición",
    description: "Realización de videos para marcas y proyectos culturales. El estudio cubre guion, rodaje, edición y adaptación de piezas para redes.",
    tags: ["Rodaje", "Edición de video", "Contenido para redes"],
    image: "video",
    demo: true,
  },
  {
    id: "foco-rental",
    name: "Foco Rental",
    town: "posadas",
    category: "gear",
    services: "Alquiler de cámaras, lentes y luces",
    description: "Alquiler por jornada de cámaras, ópticas, luces LED y accesorios para producciones fotográficas y audiovisuales.",
    tags: ["Cámaras", "Lentes", "Iluminación", "Alquiler"],
    image: "gear",
    demo: true,
  },
  {
    id: "taller-huella",
    name: "Taller Huella",
    town: "alem",
    category: "space",
    services: "Taller compartido de carpintería",
    description: "Mesas de trabajo y herramientas para desarrollar piezas en madera. El taller ofrece turnos para proyectos individuales y pequeños equipos.",
    tags: ["Carpintería", "Taller compartido", "Herramientas"],
    image: "workshop",
    demo: true,
  },
  {
    id: "forma-3d",
    name: "Forma 3D",
    town: "vicente",
    category: "impresion-3d",
    processes: "Impresión 3D y acabado de maquetas",
    materials: "PLA y PETG",
    scale: "Piezas únicas y series cortas",
    services: "Impresión 3D y prototipado",
    description: "Modelado de piezas e impresión 3D para probar encastres, armar maquetas o producir pequeñas series.",
    tags: ["Impresión 3D", "Maquetas", "Prototipado"],
    image: "prototype",
    demo: true,
  },
  {
    id: "midi-nave-produccion",
    name: "MiDi · Nave de Producción",
    town: "posadas",
    point: [-27.3694, -55.9914],
    category: "space",
    services: "Coworking y laboratorios de producción",
    description: "Espacio de Misiones Diseña en el Parque Industrial y de la Innovación Posadas. Cuenta con laboratorios para proyectos de fabricación digital, fotografía y diseño textil. Consultá las modalidades de acceso y reserva en el sitio de MiDi.",
    address: "Calle 62 y 229, Paraje Nemesio Parma",
    tags: ["Coworking", "Fab Lab", "Foto Lab", "Fashion Lab"],
    image: "midi",
    url: "https://midi.ar/index.php/coworking/",
    linkLabel: "Ver espacios de MiDi",
  },
];
