from Lobby.models import Profile


def _profile_flag(user, field):
    if not user.is_authenticated:
        return False
    try:
        return bool(getattr(user.profile, field))
    except Profile.DoesNotExist:
        return False


def is_site_admin(user):
    return user.is_authenticated and (user.is_superuser or _profile_flag(user, "is_site_admin"))


def is_game_admin(user):
    return user.is_authenticated and (user.is_superuser or _profile_flag(user, "is_game_admin"))
