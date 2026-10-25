// es messages added after the main translation pass. Merged over es.js in index.js.
export default {
	"actionArea": {
		"turnNudge": {
		"streak": "🔥 {days} días seguidos · Mejor: {best}. {goal}",
		"goalMet": "El objetivo de hoy está cumplido.",
		"goalRemaining": "Un turno de cualquier jugador antes de medianoche UTC cumple el objetivo de hoy.",
		"button": "Avisar a {name}",
		"tooltipSend": "Enviar un recordatorio de turno",
		"tooltipDisabled": "Avisos desactivados o ya se envió uno en las últimas 24 horas",
		"limit": "Cada jugador puede recibir un aviso por partida cada 24 horas.",
		"sending": "Enviando…",
		"failed": "No se pudo enviar el aviso. Inténtalo de nuevo.",
		"loadFailed": "No se pudieron cargar los recordatorios de turno."
		},
		"bailoutTitle": "¡La ciudad rescata al banco!",
		"bailoutBody": "Elige un empleado de marketing de nivel 2 gratis (por orden de llegada). El regalo no cuenta como contratación: el empleado se une a tu playa y cobra como cualquier otro empleado.",
		"bailoutNothingLeft": "No queda nada que reclamar.",
		"bailoutDecline": "Rechazar el regalo"
	},
	"milestones": {
		"firstStadiumSold": "Primer proveedor del estadio",
		"firstStadiumSoldTitle": "Primer proveedor del estadio",
		"firstStadiumSoldDesc": "Los anuncios del estadio llegan con 3 turnos de antelación",
		"firstTelemarketerUsed": "Primer teleoperador usado",
		"firstTelemarketerUsedTitle": "Primer teleoperador usado",
		"firstTelemarketerUsedDesc": "Vende todas las casas que promocionaste por teléfono/TV: +$5 cada una; los grupos se liquidan por separado; se anula si esa noche hiciste otras campañas",
		"firstTvAnnouncerUsed": "Primer locutor de TV usado",
		"firstTvAnnouncerUsedTitle": "Primer locutor de TV usado",
		"firstTvAnnouncerUsedDesc": "Primera campaña de TV: 2 de demanda por casa con antena y noche"
	},
	"employees": {
		"temporaryWorker": "Trabajador temporal",
		"temporaryWorkerDesc": "Cada uso copia 1 empleado de nivel inicial. Usos = 1 + temporales retirados al inicio del turno. Retíralo después del trabajo.",
		"headhunter": "Cazatalentos",
		"headhunterDesc": "Toma 1 empleado legal de la playa de un oponente. Si lo conservas, paga $10 por nivel una sola vez el día de pago.",
		"unionOrganizer": "Organizador sindical",
		"unionOrganizerDesc": "5+ trabajadores: cada empresa más grande recibe uno. Hueco directo del CEO; sin acción; salario de $5.",
		"telemarketer": "Teleoperador",
		"telemarketerDesc": "Coloca fichas de teléfono en terreno vacío en la cruz de 5 casillas alrededor de un restaurante, no hacen falta carreteras",
		"tvAnnouncer": "Locutor de TV",
		"tvAnnouncerDesc": "Elige 5 casas en el rombo de 13 casillas alrededor de un restaurante y publica un titular por turno"
	},
	"laborMarket": {
		"unionMustWork": "Debes emplear al Organizador sindical"
	},
	"workingDay": {
		"chooseTemporaryWorker": "Elige hasta {count} acciones de empleados iniciales. Puedes mezclar habilidades o elegir la misma varias veces; las acciones no usadas pueden perderse.",
		"temporaryWorkerSelected": "Acciones seleccionadas ({selected}/{count}):",
		"clickToRemoveTemporaryWorker": "Haz clic para quitar esta acción",
		"resetTemporaryWorker": "Reiniciar trabajador temporal",
		"confirmTemporaryWorker": "Confirmar trabajador temporal",
		"temporaryAction": "Acción del trabajador temporal",
		"noHeadhuntTargets": "Actualmente no hay empleados legales disponibles en la playa de otro jugador.",
		"headhunterIntro": "Elige hasta {count} empleado(s) de las playas activas de los oponentes. El salario de cambio de puesto mostrado de un empleado conservado se paga al banco el día de pago.",
		"headhuntFrom": "De la playa de {player}",
		"headhuntSalary": "${amount} el día de pago",
		"headhuntTargetLabel": "Cazar a {employee} de la playa de {player}; ${amount} el día de pago",
		"headhuntedLabel": "Cazados:",
		"finishHeadhunting": "Terminar la caza",
		"resetRecruiting": "Reiniciar reclutamiento",
		"clickToUndoTrain": "Haz clic para deshacer esta formación",
		"phoneTokenSameAsFirst": "La segunda ficha de teléfono usa automáticamente el mismo producto y la misma duración que la primera",
		"tvChannelProgress": "Elige casas para tu canal de TV: {current}/5",
		"skipSecondPhoneToken": "Saltar la segunda ficha de teléfono",
		"publishHeadline": "Publicar un titular (acción gratuita, quedan {left}):",
		"headlinePrime": "Hora dorada: todos los precios base +$5 en la próxima cena",
		"headlinePress": "Mala prensa: todos los precios base -$5 en la próxima cena"
	},
	"prePhase": {
		"jobSwitchSalaryEmployees": "Empleados que requieren un salario único por cambio de puesto este día de pago:",
		"jobSwitchSalaryAmount": "Cambio de puesto ${amount}",
		"headhuntedEmployeeBadge": "Cazado · Cambio de puesto ${amount}"
	},
	"topMenuViews": {
		"nonHireable": "No se puede contratar"
	},
	"history": {
		"modules": {
			"laborMarket": "Mercado laboral"
		},
		"abbr": {
			"colJazz": "J",
			"colWaitress": "C"
		},
		"tvAtHouses": "llegando a la(s) casa(s) {houses}",
		"publishHeadline": "{name} publica un titular:",
		"headlinePrime": "todos los precios base +$5 en la próxima cena",
		"headlinePress": "todos los precios base -$5 en la próxima cena",
		"mediaLineBonus": "{name} agotó todas las casas de medios objetivo, ganando ${amount}: casas {houses}",
		"stadiumAnnounce": "El estadio anuncia un partido en el turno {turn}: demandará {units} × {good}",
		"stadiumWinner": "{name} alimenta a todo el estadio, vendiendo {units} × {good}",
		"stadiumNobody": "Nadie pudo abastecer al estadio: la demanda de {units} × {good} se pierde al final del día:",
		"temporaryWorkerChosen": "{name} asigna a su trabajador temporal como {employee} con {count} acción(es) disponible(s); se aplican {used} acción(es) inmediata(s).",
		"temporaryWorkerChoices": "{name} asigna {selected}/{count} acción(es) del trabajador temporal: {employees}.",
		"temporaryWorkerCampaign": "El trabajador temporal de {name} inicia la campaña #{num} (acción {used} de {count}).",
		"none": "ninguno",
		"headhunts": "{name} caza a {employee} de la playa de {owner} y paga ${amount}.",
		"headhuntsDeferred": "{name} caza a {employee} de la playa de {owner}; conservarlo cuesta ${amount} el día de pago.",
		"unionAssigned": "Los organizadores sindicales van a {names}; cada uno empatado por la mayor plantilla elegible con {count} trabajadores.",
		"unionUnassigned": "Ninguna empresa alcanzó el umbral de 5 trabajadores del Organizador sindical.",
		"bankBailout": "La ciudad rescata al banco por segunda vez: el banco recibe ${amount} y cada jugador obtiene un empleado de marketing gratis",
		"bailoutClaim": "{name} recibe: {card}",
		"bailoutDecline": "{name} rechaza el empleado regalado",
		"headlineApplied": "(incluye el titular de esta noche {amount})",
		"animAnimate": "Animar",
		"animStepThrough": "Paso a paso",
		"animHouseLabel": "Casa #{num}",
		"animApartmentLabel": "Apartamento #{num}",
		"animRuralLabel": "Zona rural",
		"animDemandLeaves": "{building} vende a {player}.",
		"animPickup": "{building} sale hacia el restaurante de {player}.",
		"animDrive": "El coche avanza a la siguiente casilla de carretera.",
		"animCoffee": "El coche pasa por la cafetería de {player}: ¡gana +${amount}!",
		"animArrive": "{building} llega al restaurante de {player}. ¡Artículos comprados por +${income}!",
		"animRange": "Alcance actual: {range}",
		"animCost": "Coste de distancia actual: ${cost}",
		"animPrev": "Anterior",
		"animNext": "Siguiente",
		"animStart": "Inicio",
		"animEnd": "Fin",
		"animSwitchStep": "Cambiar a paso a paso",
		"animClose": "Cerrar",
		"animStepOf": "{current} / {total}",
		"mediaLineBonusHeader": "Hito de medios",
		"itemsHeader": "Artículos",
		"coffeeHeader": "Café",
		"icHeader": "I+C"
	},
	"assistance": {
		"stadiumTitle": "Estadio",
		"stadiumGame": "Partido en el turno {turn} - {units} x",
		"headlineTitle": "Titulares",
		"headlineTonight": "Esta noche: todos los precios base {amount}",
		"headlineNoEffect": "Esta noche no cambian los precios base",
		"headlineToday": "Publicados hoy:"
	}
}
