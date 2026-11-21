from Lobby.models import Profile


def _profile_flag(user, field):
    if not getattr(user, "is_authenticated", False):
        return False
    try:
        return bool(getattr(user.profile, field))
    except (Profile.DoesNotExist, AttributeError):
        return False


def is_site_admin(user):
    return _profile_flag(user, "is_site_admin")


def is_game_admin(user):
    return _profile_flag(user, "is_game_admin")


def can_act_in_game(user, game):
    """True when the user may change this game: a player, or a game admin."""
    return is_game_admin(user) or game.players.filter(player=user).exists()


def validated_actor_name(request, submitted_name=None, game=None):
    """A player may only charge their own flexi-time; game admins may act for a seat.

    Missing and kicked seats are also allowed: any player may finish their
    turns after a kickout, and bot play continues in those seats.
    """
    submitted_name = (submitted_name or "").strip()
    if submitted_name and is_game_admin(request.user):
        return submitted_name
    if submitted_name and game is not None and submitted_name != request.user.username:
        target_gp = game.players.filter(player__username=submitted_name).first()
        if target_gp and (target_gp.is_missing or target_gp.is_kicked):
            return submitted_name
    return request.user.username


def latest_update_ok(request, submitted, current, game_data=""):
    """Allow normal optimistic saves, and the magic value only on first save or for admins."""
    if str(submitted) == str(current):
        return True
    if is_game_admin(request.user) and str(submitted) == "9999999999999":
        return True
    return str(submitted) == "9999999999999" and not game_data
