// it messages added after the main translation pass. Merged over it.js in index.js.
export default {
	"actionArea": {
		"bailoutTitle": "La città salva la banca!",
		"bailoutBody": "Scegli un dipendente marketing di livello 2 gratuito (primo arrivato, primo servito). Il regalo non conta come assunzione: il dipendente si unisce alla tua spiaggia e viene pagato come qualsiasi altro dipendente.",
		"bailoutNothingLeft": "Non resta più nulla da riscattare.",
		"bailoutDecline": "Rifiuta il regalo"
	},
	"milestones": {
		"firstStadiumSold": "Primo fornitore dello stadio",
		"firstStadiumSoldTitle": "Primo fornitore dello stadio",
		"firstStadiumSoldDesc": "Gli annunci dello stadio arrivano 3 turni prima",
		"firstTelemarketerUsed": "Primo telemarketer utilizzato",
		"firstTelemarketerUsedTitle": "Primo telemarketer utilizzato",
		"firstTelemarketerUsedDesc": "Vendi ogni casa che hai pubblicizzato per telefono/TV: +$5 ciascuna; i gruppi vengono regolati separatamente; annullato se hai fatto altre campagne stasera",
		"firstTvAnnouncerUsed": "Primo annunciatore TV utilizzato",
		"firstTvAnnouncerUsedTitle": "Primo annunciatore TV utilizzato",
		"firstTvAnnouncerUsedDesc": "Prima campagna TV: 2 di domanda per casa con antenna a notte"
	},
	"employees": {
		"temporaryWorker": "Lavoratore temporaneo",
		"temporaryWorkerDesc": "Ogni uso copia 1 dipendente di livello base. Usi = 1 + temporanei rimossi all'inizio del turno. Rimuovilo dopo il lavoro.",
		"headhunter": "Cacciatore di teste",
		"headhunterDesc": "Prendi 1 dipendente legale dalla spiaggia di un avversario. Se lo tieni, paga 10 $ per livello una sola volta al giorno di paga.",
		"unionOrganizer": "Organizzatore sindacale",
		"unionOrganizerDesc": "5+ lavoratori: ogni azienda più grande ne riceve uno. Slot diretto del CEO; nessuna azione; stipendio di 5 $.",
		"telemarketer": "Telemarketer",
		"telemarketerDesc": "Posiziona gettoni telefono su terreno vuoto nella croce di 5 caselle attorno a un ristorante, senza bisogno di strade",
		"tvAnnouncer": "Annunciatore TV",
		"tvAnnouncerDesc": "Scegli 5 case nel rombo di 13 caselle attorno a un ristorante e pubblica un titolo per turno"
	},
	"laborMarket": {
		"unionMustWork": "Devi impiegare l'Organizzatore sindacale"
	},
	"workingDay": {
		"chooseTemporaryWorker": "Scegli fino a {count} azioni di dipendenti di livello base. Puoi combinare abilità o scegliere più volte la stessa; le azioni non usate possono andare perse.",
		"temporaryWorkerSelected": "Azioni selezionate ({selected}/{count}):",
		"clickToRemoveTemporaryWorker": "Fai clic per rimuovere questa azione",
		"resetTemporaryWorker": "Reimposta lavoratore temporaneo",
		"confirmTemporaryWorker": "Conferma lavoratore temporaneo",
		"temporaryAction": "Azione del lavoratore temporaneo",
		"noHeadhuntTargets": "Al momento non ci sono dipendenti legali disponibili sulla spiaggia di un altro giocatore.",
		"headhunterIntro": "Scegli fino a {count} dipendente/i dalle spiagge attive degli avversari. Lo stipendio di cambio mansione mostrato di un dipendente trattenuto viene pagato alla banca al giorno di paga.",
		"headhuntFrom": "Dalla spiaggia di {player}",
		"headhuntSalary": "${amount} al giorno di paga",
		"headhuntTargetLabel": "Ruba {employee} dalla spiaggia di {player}; ${amount} al giorno di paga",
		"headhuntedLabel": "Rubati:",
		"finishHeadhunting": "Termina il reclutamento",
		"resetRecruiting": "Reimposta reclutamento",
		"clickToUndoTrain": "Fai clic per annullare questa formazione",
		"phoneTokenSameAsFirst": "Il secondo gettone telefono usa automaticamente lo stesso bene e la stessa durata del primo",
		"tvChannelProgress": "Scegli le case per il tuo canale TV: {current}/5",
		"skipSecondPhoneToken": "Salta il secondo gettone telefono",
		"publishHeadline": "Pubblica un titolo (azione gratuita, {left} rimasti):",
		"headlinePrime": "Ora d'oro: tutti i prezzi base +$5 alla prossima cena",
		"headlinePress": "Cattiva stampa: tutti i prezzi base -$5 alla prossima cena"
	},
	"prePhase": {
		"jobSwitchSalaryEmployees": "Dipendenti che richiedono uno stipendio una tantum per cambio mansione in questo giorno di paga:",
		"jobSwitchSalaryAmount": "Cambio mansione ${amount}",
		"headhuntedEmployeeBadge": "Reclutato · Cambio mansione ${amount}"
	},
	"topMenuViews": {
		"nonHireable": "Non assumibile"
	},
	"history": {
		"modules": {
			"laborMarket": "Mercato del lavoro"
		},
		"abbr": {
			"colJazz": "J",
			"colWaitress": "C"
		},
		"tvAtHouses": "raggiunge la/le casa/case {houses}",
		"publishHeadline": "{name} pubblica un titolo:",
		"headlinePrime": "tutti i prezzi base +$5 alla prossima cena",
		"headlinePress": "tutti i prezzi base -$5 alla prossima cena",
		"mediaLineBonus": "{name} ha venduto tutte le case mediatiche prese di mira, guadagnando ${amount}: case {houses}",
		"stadiumAnnounce": "Lo stadio annuncia una partita al turno {turn}: richiederà {units} × {good}",
		"stadiumWinner": "{name} sfama tutto lo stadio, vendendo {units} × {good}",
		"stadiumNobody": "Nessuno ha potuto rifornire lo stadio: la domanda di {units} × {good} sfuma a fine giornata:",
		"temporaryWorkerChosen": "{name} assegna il proprio lavoratore temporaneo come {employee} con {count} azione/i disponibile/i; si applicano {used} azione/i immediata/e.",
		"temporaryWorkerChoices": "{name} assegna {selected}/{count} azione/i del lavoratore temporaneo: {employees}.",
		"temporaryWorkerCampaign": "Il lavoratore temporaneo di {name} avvia la campagna #{num} (azione {used} di {count}).",
		"none": "nessuno",
		"headhunts": "{name} ruba {employee} dalla spiaggia di {owner} e paga ${amount}.",
		"headhuntsDeferred": "{name} ruba {employee} dalla spiaggia di {owner}; tenerlo costa ${amount} al giorno di paga.",
		"unionAssigned": "Gli organizzatori sindacali vanno a {names}; ciascuno a pari merito per la maggiore forza lavoro idonea con {count} lavoratori.",
		"unionUnassigned": "Nessuna azienda ha raggiunto la soglia di 5 lavoratori per l'Organizzatore sindacale.",
		"bankBailout": "La città salva la banca una seconda volta: la banca riceve ${amount} e ogni giocatore ottiene un dipendente marketing gratuito",
		"bailoutClaim": "{name} riceve: {card}",
		"bailoutDecline": "{name} rifiuta il dipendente regalato",
		"headlineApplied": "(include il titolo di stasera {amount})",
		"animAnimate": "Anima",
		"animStepThrough": "Passo passo",
		"animHouseLabel": "Casa #{num}",
		"animApartmentLabel": "Appartamento #{num}",
		"animRuralLabel": "Zona rurale",
		"animDemandLeaves": "{building} vende a {player}.",
		"animPickup": "{building} parte verso il ristorante di {player}.",
		"animDrive": "L'auto prosegue verso la prossima casella strada.",
		"animCoffee": "L'auto passa davanti al caffè di {player}: guadagna +${amount}!",
		"animArrive": "{building} arriva al ristorante di {player}. Articoli acquistati per +${income}!",
		"animRange": "Portata attuale: {range}",
		"animCost": "Costo distanza attuale: ${cost}",
		"animPrev": "Precedente",
		"animNext": "Successivo",
		"animStart": "Inizio",
		"animEnd": "Fine",
		"animSwitchStep": "Passa a passo passo",
		"animClose": "Chiudi",
		"animStepOf": "{current} / {total}",
		"mediaLineBonusHeader": "Traguardo media",
		"itemsHeader": "Articoli",
		"coffeeHeader": "Caffè",
		"icHeader": "R+C"
	},
	"assistance": {
		"stadiumTitle": "Stadio",
		"stadiumGame": "Partita al turno {turn} - {units} x",
		"headlineTitle": "Titoli",
		"headlineTonight": "Stasera: tutti i prezzi base {amount}",
		"headlineNoEffect": "Nessuna variazione dei prezzi base stasera",
		"headlineToday": "Pubblicati oggi:"
	}
}
