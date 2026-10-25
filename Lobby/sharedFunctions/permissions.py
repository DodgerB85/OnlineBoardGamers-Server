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
