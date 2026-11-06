export const data = {
  life: {
    title: "Esperanza de vida promedio",
    tag: "EVOLUCIÓN",
    description: "Años de vida en promedio. Datos en #",
    labels: [
      "Antes de Nexus",
      "Primera versión",
      "Segunda versión",
      "Nexus estable",
    ],
    values: [70, 120, 180, 250],
    unit: "años",
    type: "bar",
  },
  soma: {
    title: "SOMA disponibles",
    tag: "RECURSOS",
    description:
      "Cantidad disponible de SOMA registrada entre los años 2577 y 2580. Datos en #",
    labels: ["2577", "2578", "2579", "2580"],
    values: [30, 55, 180, 230],
    unit: "SOMA",
    type: "line",
  },
  transfers: {
    title: "Transferencias realizadas",
    tag: "RED",
    description: "Millones de transferencias realizadas. Datos en #",
    labels: ["2577", "2578", "2579", "2580"],
    values: [15, 70, 150, 245],
    unit: "millones",
    type: "line",
  },
  time: {
    title: "Tiempo promedio de transferencias",
    tag: "EFICIENCIA",
    description: "El tiempo promedio disminuye. Datos en #",
    labels: ["Primera versión", "Segunda versión", "Nexus estable"],
    values: [48, 24, 6],
    unit: "meses",
    type: "bar",
  },
  storage: {
    title: "Capacidad de almacenamiento de Nexus",
    tag: "CAPACIDAD",
    description:
      "Número de módulos de transferencia soportados por cada etapa de Nexus. Datos en #",
    labels: ["Primera versión", "Segunda versión", "Nexus estable"],
    values: [2, 3, 4],
    unit: "módulos",
    type: "bar",
  },
  transfail: {
    title: "Exitos en transferencias",
    tag: "INTEGRIDAD",
    description:
      "La mayoría de las transferencias se completan exitosamente. Datos en %",
    labels: ["Exitosas", "Fallidas"],
    values: [92.2, 7.8],
    unit: "%",
    type: "doughnut",
  },
  humans: {
    title: "Humanos con Nexus",
    tag: "POBLACIÓN",
    description:
      "Distribución de humanos integrados y no integrados con Nexus. Datos en %",
    labels: ["Con Nexus", "Sin Nexus"],
    values: [90, 10],
    unit: "%",
    type: "doughnut",
  },
  mortality: {
    title: "Tasa de mortalidad del virus",
    tag: "MORTALIDAD",
    description: "Mortalidad segun el estado de los módulos. Datos en %",
    labels: [
      "Módulos completos",
      "Pérdida de 4 módulos",
      "Pérdida de 2 módulos",
    ],
    values: [70, 20, 10],
    unit: "%",
    type: "doughnut",
  },
  virus: {
    title: "Velocidad de propagación del virus",
    tag: "ALERTA",
    description:
      "Millones de casos registrados durante los años 2617 a 2620. Datos en #",
    labels: ["2617", "2618", "2619", "2620"],
    values: [1, 15, 18, 30],
    unit: "millones de casos",
    type: "line",
  },
  deaths: {
    title: "SOMAS fallecidos por el virus",
    tag: "IMPACTO",
    description:
      "Fallecidos por el virus durante los años 2617 a 2620. Datos en #",
    labels: ["2617", "2618", "2619", "2620"],
    values: [200000, 3000000, 3600000, 6000000],
    unit: "fallecidos",
    type: "line",
  },
};

// Percentage graphics use story pictograms; the source values and descriptions stay intact.
data.humans.type='waffle';
data.transfail.type='waffle';
data.transfail.glyph='soma';
data.transfail.unitLabel='1 SOMA = 1% DE TRANSFERENCIAS';
data.mortality.type='waffle';
data.mortality.glyph='modules';
data.mortality.unitLabel='1 CONJUNTO = 1 PUNTO PORCENTUAL';
data.integration={
 ...data.humans,
 title:'Humanos con Nexus',
 description:'Cada chip representa el 1% de los humanos del archivo. Datos en %',
 sourceKey:'humans'
};

// Additional readings of existing records; no new observations are introduced.
data.lifeGain={
 title:'Años de vida ganados con NEXUS',
 tag:'LONGEVIDAD',
 description:'Años adicionales frente a los 70 años de esperanza de vida anteriores a NEXUS. Datos en #',
 labels:data.life.labels.slice(1),
 values:data.life.values.slice(1).map(value=>value-data.life.values[0]),
 unit:'años adicionales',
 type:'bar',
 sourceKey:'life'
};
data.timeReduction={
 title:'Reducción del tiempo de transferencia',
 tag:'TIEMPO RECUPERADO',
 description:'Tiempo ahorrado respecto a los 48 meses de la primera versión. Datos en %',
 labels:[...data.time.labels],
 values:data.time.values.map(value=>+(100*(1-value/data.time.values[0])).toFixed(1)),
 unit:'%',
 type:'line',
 sourceKey:'time'
};
data.territory={
 title:'Alcance territorial de ET3RNITY',
 tag:'RED COMPROMETIDA',
 description:'Un nodo representa un estado del mapa. Datos en #',
 labels:['Con contagio','Sin contagio'],
 values:[31,7],
 unit:'estados',
 type:'waffle',
 glyph:'network',
 totalUnits:38,
 columns:8,
 colors:['#f17878','#c4f078'],
 unitLabel:'1 NODO = 1 ESTADO DEL MAPA',
 sourceKey:'assets/territorial-map.svg'
};
