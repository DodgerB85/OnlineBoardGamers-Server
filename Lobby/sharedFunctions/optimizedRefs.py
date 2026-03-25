from django.utils.translation import gettext
import FCM.FCMconstants as rfFCM
import Lobby.sharedFunctions.constants as rf

# Cache for translated strings to avoid repeated gettext calls
_translation_cache = {}

def get_cached_gettext(key):
    """Cached version of gettext to avoid repeated lookups"""
    if key not in _translation_cache:
        _translation_cache[key] = gettext(key)
    return _translation_cache[key]

def SR_getFCMstartingOptionsHTML_optimized(startingOptionsArr):
    """Optimized version with cached translations"""
    if not startingOptionsArr:
        return "[None]"
    if len(startingOptionsArr) == 0:
        return "[None]"

    # Pre-translate all labels once
    options_map = {
        rfFCM.SO_SHORT_GAME: ("so_shortGame.svg", get_cached_gettext("Short Game")),
        rfFCM.SO_NO_MILESTONES: ("so_noMS.svg", get_cached_gettext("No Milestones")),
        rfFCM.SO_NO_CEO_MILESTONE: ("so_noCEO.svg", get_cached_gettext("No CFO Milestone")),
        rfFCM.SO_NO_RADIO_MILESTONE: ("so_noRadio.svg", get_cached_gettext("No Radio Milestone")),
        rfFCM.SO_HARD_CHOICES: ("hardchoices2.jpg", get_cached_gettext("Hard Choices")),
        rfFCM.SO_NEW_MS: ("so_newMS.svg", get_cached_gettext("New Milestones")),
        rfFCM.SO_KETCHUP_MS: ("so_ketchupMS.svg", get_cached_gettext("Ketchup Milestone")),
        rfFCM.SO_RESERVE_PRICE: ("so_reservePrice.jpg", get_cached_gettext("New Reserve Cards")),
        rfFCM.SO_MOVIE_STARS: ("so_movieStars.svg", get_cached_gettext("Movie Stars")),
        rfFCM.SO_MASS_MARKETERS: ("so_massMarketeers.jpg", get_cached_gettext("Mass Marketeers")),
        rfFCM.SO_GOURMET: ("so_GFC.jpg", get_cached_gettext("Gourmet Food Critics")),
        rfFCM.SO_RURAL_MARKETERS: ("so_rural.jpg", get_cached_gettext("Rural Marketeers")),
        rfFCM.SO_NEW_DISTRICTS: ("map23.jpg", get_cached_gettext("New Districts")),
        rfFCM.SO_LOBBYISTS: ("so_lobbyists.jpg", get_cached_gettext("Lobbyists")),
        rfFCM.SO_NIGHT_SHIFT: ("so_nightShift.jpg", get_cached_gettext("Night Shift Manager")),
        rfFCM.SO_COFFEE: ("so_coffee.svg", get_cached_gettext("Coffee")),
        rfFCM.SO_FRY_CHEFS: ("so_fryChef.svg", get_cached_gettext("Fry Chef")),
        rfFCM.SO_KIMCHI: ("so_kimchi.svg", get_cached_gettext("Kimchi")),
        rfFCM.SO_SUSHI: ("so_sushi.svg", get_cached_gettext("Sushi")),
        rfFCM.SO_NOODLES: ("so_noodles.svg", get_cached_gettext("Noodles")),
        rfFCM.SO_URBAN_PLANNING: ("so_urbanPlanning.svg", get_cached_gettext("Urban Planning")),
        rfFCM.SO_URBAN_PLANNING_PLUS: (
            "so_urbanPlanningPlus.svg",
            get_cached_gettext("Urban Planning Plus"),
        ),
        rfFCM.SO_JAZZ_MUSICIANS: ("so_jazz.svg", get_cached_gettext("Jazz Musicians")),
        rfFCM.SO_DUMPLINGS: ("so_dumplings.svg", get_cached_gettext("Dumplings")),
        rfFCM.SO_DELIVERY_DRIVERS: ("so_delivery.svg", get_cached_gettext("Delivery Drivers")),
        rfFCM.SO_HAWKERS: ("so_hawkers.svg", get_cached_gettext("Hawkers")),
        rfFCM.SO_STRICT_PAYDAY_FRIDGE: ("so_strict.svg", get_cached_gettext("Turn Order Payday/Fridge")),
        rfFCM.SO_DRAFT_MODULE_BREAKER: ("so_draftMods.jpg", get_cached_gettext("Draft Modules")),
        rfFCM.SO_DRAFT_SKIP_MODULE: ("so_skip.jpg", get_cached_gettext("Skip Module")),
        rfFCM.SO_SANDBOX_MODE: ("so_sandbox.svg", get_cached_gettext("Sandbox Mode")),
        rf.SO_LEARNING_GAME: (
            "so_learningGame.svg",
            get_cached_gettext("Learning Game"),
            "/static/Lobby/images/startingOptions/",
        ),
        rf.SO_EXPERIENCED_GAME: (
            "so_experiencedGame.svg",
            get_cached_gettext("Experienced Game"),
            "/static/Lobby/images/startingOptions/",
        ),
    }

    preferred_order = [
        rf.SO_LEARNING_GAME,
        rf.SO_EXPERIENCED_GAME,
        rfFCM.SO_SHORT_GAME,
        rfFCM.SO_NO_MILESTONES,
        rfFCM.SO_NO_CEO_MILESTONE,
        rfFCM.SO_NO_RADIO_MILESTONE,
        rfFCM.SO_HARD_CHOICES,
        rfFCM.SO_NEW_MS,
        rfFCM.SO_KETCHUP_MS,
        rfFCM.SO_RESERVE_PRICE,
        rfFCM.SO_MOVIE_STARS,
        rfFCM.SO_MASS_MARKETERS,
        rfFCM.SO_GOURMET,
        rfFCM.SO_RURAL_MARKETERS,
        rfFCM.SO_NEW_DISTRICTS,
        rfFCM.SO_LOBBYISTS,
        rfFCM.SO_NIGHT_SHIFT,
        rfFCM.SO_COFFEE,
        rfFCM.SO_FRY_CHEFS,
        rfFCM.SO_KIMCHI,
        rfFCM.SO_SUSHI,
        rfFCM.SO_NOODLES,
        rfFCM.SO_STRICT_PAYDAY_FRIDGE,
        rfFCM.SO_RANDOM_MODULES,  # Note 200 is here
        rfFCM.SO_DRAFT_MODULE_BREAKER,
        rfFCM.SO_DRAFT_SKIP_MODULE,
        rfFCM.SO_SANDBOX_MODE,
        rfFCM.SO_URBAN_PLANNING,
        rfFCM.SO_URBAN_PLANNING_PLUS,
        rfFCM.SO_JAZZ_MUSICIANS,
        rfFCM.SO_DUMPLINGS,
        rfFCM.SO_DELIVERY_DRIVERS,
        rfFCM.SO_HAWKERS,
    ]

    startingOptionsHTML = ""
    sorted_options = [opt for opt in preferred_order if opt in startingOptionsArr]

    for opt in sorted_options:
        # SPECIAL CASE: Random Modules (200)
        if opt == rfFCM.SO_RANDOM_MODULES:
            moduleRange = [
                str(x % 100).zfill(2) for x in startingOptionsArr if 21000 < x < 21116
            ]
            if len(moduleRange) != 2:
                moduleRange = ["??", "??"]

            title = f"{moduleRange[0]} - {moduleRange[1]} {get_cached_gettext('Random Modules')}"
            startingOptionsHTML += f"<img class='startingOption' src='/static/FCM/images/so_randomMods.svg' title='{title}'>"
            continue

        # STANDARD CASES: Dictionary Lookup (no more gettext calls!)
        if opt in options_map:
            mapping = options_map[opt]
            img = mapping[0]
            label = mapping[1]  # Already translated!
            folder = mapping[2] if len(mapping) > 2 else "/static/FCM/images/"

            startingOptionsHTML += (
                f"<img class='startingOption' src='{folder}{img}' title='{label}'>"
            )

    return startingOptionsHTML or "[None]"

# Alias to maintain compatibility
SR_getFCMstartingOptionsHTML = SR_getFCMstartingOptionsHTML_optimized
