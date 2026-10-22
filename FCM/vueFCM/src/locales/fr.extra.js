// fr messages added after the main translation pass. Merged over fr.js in index.js.
export default {
	"actionArea": {
		"bailoutTitle": "La ville renfloue la banque !",
		"bailoutBody": "Choisissez un employé marketing de niveau 2 gratuit (premier arrivé, premier servi). Le cadeau ne compte pas comme une embauche – l'employé rejoint votre plage et est payé comme tout autre employé.",
		"bailoutNothingLeft": "Plus rien à réclamer.",
		"bailoutDecline": "Refuser le cadeau"
	},
	"milestones": {
		"firstStadiumSold": "Premier fournisseur du stade",
		"firstStadiumSoldTitle": "Premier fournisseur du stade",
		"firstStadiumSoldDesc": "Les annonces du stade arrivent 3 tours à l'avance",
		"firstTelemarketerUsed": "Premier télévendeur utilisé",
		"firstTelemarketerUsedTitle": "Premier télévendeur utilisé",
		"firstTelemarketerUsedDesc": "Vendez chaque maison démarchée par téléphone/TV : +5 $ chacune ; les groupes sont réglés séparément ; annulé si vous avez lancé d'autres campagnes ce soir",
		"firstTvAnnouncerUsed": "Premier présentateur TV utilisé",
		"firstTvAnnouncerUsedTitle": "Premier présentateur TV utilisé",
		"firstTvAnnouncerUsedDesc": "Première campagne TV : 2 de demande par maison avec antenne et par nuit"
	},
	"employees": {
		"temporaryWorker": "Intérimaire",
		"temporaryWorkerDesc": "Chaque utilisation copie 1 employé débutant. Utilisations = 1 + intérimaires retirés au début du tour. Retirez après le travail.",
		"headhunter": "Chasseur de têtes",
		"headhunterDesc": "Prenez 1 employé légal sur la plage d'un adversaire. S'il est conservé, payez 10 $ par niveau une seule fois au jour de paie.",
		"unionOrganizer": "Organisateur syndical",
		"unionOrganizerDesc": "5+ ouvriers : chaque entreprise la plus importante en reçoit un. Emplacement direct du CEO ; aucune action ; salaire de 5 $.",
		"telemarketer": "Télévendeur",
		"telemarketerDesc": "Placez des jetons téléphone sur un terrain vide dans la croix de 5 cases autour d'un restaurant, aucune route nécessaire",
		"tvAnnouncer": "Présentateur TV",
		"tvAnnouncerDesc": "Choisissez 5 maisons dans le losange de 13 cases autour d'un restaurant et publiez un gros titre par tour"
	},
	"laborMarket": {
		"unionMustWork": "Vous devez employer l'Organisateur syndical"
	},
	"workingDay": {
		"chooseTemporaryWorker": "Choisissez jusqu'à {count} actions d'employés débutants. Vous pouvez mélanger les capacités ou choisir plusieurs fois la même ; les actions inutilisées peuvent être perdues.",
		"temporaryWorkerSelected": "Actions sélectionnées ({selected}/{count}) :",
		"clickToRemoveTemporaryWorker": "Cliquez pour retirer cette action",
		"resetTemporaryWorker": "Réinitialiser l'intérimaire",
		"confirmTemporaryWorker": "Confirmer l'intérimaire",
		"temporaryAction": "Action de l'intérimaire",
		"noHeadhuntTargets": "Aucun employé légal n'est actuellement disponible sur la plage d'un autre joueur.",
		"headhunterIntro": "Choisissez jusqu'à {count} employé(s) sur les plages actives des adversaires. Le salaire de changement de poste affiché d'un employé conservé est payé à la banque au jour de paie.",
		"headhuntFrom": "De la plage de {player}",
		"headhuntSalary": "${amount} au jour de paie",
		"headhuntTargetLabel": "Débaucher {employee} de la plage de {player} ; ${amount} au jour de paie",
		"headhuntedLabel": "Débauchés :",
		"finishHeadhunting": "Terminer le débauchage",
		"resetRecruiting": "Réinitialiser le recrutement",
		"clickToUndoTrain": "Cliquez pour annuler cette formation",
		"phoneTokenSameAsFirst": "Le deuxième jeton téléphone utilise automatiquement la même marchandise et la même durée que le premier",
		"tvChannelProgress": "Choisissez des maisons pour votre chaîne TV : {current}/5",
		"skipSecondPhoneToken": "Passer le deuxième jeton téléphone",
		"publishHeadline": "Publier un gros titre (action gratuite, {left} restant) :",
		"headlinePrime": "Heure de gloire : tous les prix de base +5 $ au prochain dîner",
		"headlinePress": "Mauvaise presse : tous les prix de base -5 $ au prochain dîner"
	},
	"prePhase": {
		"jobSwitchSalaryEmployees": "Employés nécessitant un salaire de changement de poste unique à ce jour de paie :",
		"jobSwitchSalaryAmount": "Changement de poste ${amount}",
		"headhuntedEmployeeBadge": "Débauché · Changement de poste ${amount}"
	},
	"topMenuViews": {
		"nonHireable": "Non embauchable"
	},
	"history": {
		"modules": {
			"laborMarket": "Marché du travail"
		},
		"abbr": {
			"colJazz": "J",
			"colWaitress": "S"
		},
		"tvAtHouses": "atteint la/les maison(s) {houses}",
		"publishHeadline": "{name} publie un gros titre :",
		"headlinePrime": "tous les prix de base +5 $ au prochain dîner",
		"headlinePress": "tous les prix de base -5 $ au prochain dîner",
		"mediaLineBonus": "{name} a vendu toutes les maisons médias ciblées, gagnant ${amount} : maisons {houses}",
		"stadiumAnnounce": "Le stade annonce un match au tour {turn} : il demandera {units} × {good}",
		"stadiumWinner": "{name} nourrit tout le stade, vendant {units} × {good}",
		"stadiumNobody": "Personne n'a pu approvisionner le stade – la demande de {units} × {good} expire en fin de journée :",
		"temporaryWorkerChosen": "{name} affecte son intérimaire comme {employee} avec {count} action(s) disponible(s) ; {used} action(s) immédiate(s) s'appliquent.",
		"temporaryWorkerChoices": "{name} affecte {selected}/{count} action(s) d'intérimaire : {employees}.",
		"temporaryWorkerCampaign": "L'intérimaire de {name} lance la campagne #{num} (action {used} sur {count}).",
		"none": "aucun",
		"headhunts": "{name} débauche {employee} de la plage de {owner} et paie ${amount}.",
		"headhuntsDeferred": "{name} débauche {employee} de la plage de {owner} ; le conserver coûte ${amount} au jour de paie.",
		"unionAssigned": "Les organisateurs syndicaux vont à {names} ; chacun à égalité pour la plus grande main-d'œuvre éligible avec {count} ouvriers.",
		"unionUnassigned": "Aucune entreprise n'a atteint le seuil de 5 ouvriers de l'Organisateur syndical.",
		"bankBailout": "La ville renfloue la banque une deuxième fois : la banque reçoit ${amount} et chaque joueur reçoit un employé marketing gratuit",
		"bailoutClaim": "{name} reçoit : {card}",
		"bailoutDecline": "{name} refuse l'employé offert",
		"headlineApplied": "(comprend le gros titre de ce soir {amount})",
		"animAnimate": "Animer",
		"animStepThrough": "Pas à pas",
		"animHouseLabel": "Maison #{num}",
		"animApartmentLabel": "Appartement #{num}",
		"animRuralLabel": "Zone rurale",
		"animDemandLeaves": "{building} vend à {player}.",
		"animPickup": "{building} part vers le restaurant de {player}.",
		"animDrive": "La voiture avance vers la case route suivante.",
		"animCoffee": "La voiture passe devant le café de {player} — il gagne +${amount} !",
		"animArrive": "{building} arrive au restaurant de {player}. Marchandises achetées pour +${income} !",
		"animRange": "Portée actuelle : {range}",
		"animCost": "Coût de distance actuel : ${cost}",
		"animPrev": "Précédent",
		"animNext": "Suivant",
		"animStart": "Début",
		"animEnd": "Fin",
		"animSwitchStep": "Passer en mode pas à pas",
		"animClose": "Fermer",
		"animStepOf": "{current} / {total}",
		"mediaLineBonusHeader": "Jalon média",
		"itemsHeader": "Articles",
		"coffeeHeader": "Café",
		"icHeader": "R+C"
	},
	"assistance": {
		"stadiumTitle": "Stade",
		"stadiumGame": "Match au tour {turn} – {units} x",
		"headlineTitle": "Gros titres",
		"headlineTonight": "Ce soir : tous les prix de base {amount}",
		"headlineNoEffect": "Aucun changement de prix de base ce soir",
		"headlineToday": "Publiés aujourd'hui :"
	}
}
