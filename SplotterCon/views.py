from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import redirect
from django.views.generic.base import TemplateView

ALLOWED_USERNAMES = {"admin", "DodgerB", "pgh_gamer"}


class SplotterConPageView(LoginRequiredMixin, UserPassesTestMixin, TemplateView):
    """Gate every SplotterCon page to the allowlisted, logged-in users."""

    login_url = "myLogin"

    def test_func(self):
        return self.request.user.username in ALLOWED_USERNAMES

    def handle_no_permission(self):
        # Logged-out users go to the login page (with ?next=); logged-in users
        # outside the allowlist go back to the lobby index.
        if not self.request.user.is_authenticated:
            return super().handle_no_permission()
        return redirect("index")


class HomeView(SplotterConPageView):
    template_name = "SplotterCon/home.html"


class RegistrationView(SplotterConPageView):
    template_name = "SplotterCon/registration.html"


class HotelView(SplotterConPageView):
    template_name = "SplotterCon/hotel.html"


class FoodView(SplotterConPageView):
    template_name = "SplotterCon/food.html"


class FaqsView(SplotterConPageView):
    template_name = "SplotterCon/faqs.html"


class PrizeRulesView(SplotterConPageView):
    template_name = "SplotterCon/prizerules.html"


class ContestsView(SplotterConPageView):
    template_name = "SplotterCon/contests.html"


class TournamentView(SplotterConPageView):
    template_name = "SplotterCon/tournament.html"


class TgzTournamentView(SplotterConPageView):
    template_name = "SplotterCon/tgz_tournament.html"


class LibraryView(SplotterConPageView):
    template_name = "SplotterCon/library.html"


class MerchView(SplotterConPageView):
    template_name = "SplotterCon/merch.html"


class AccessoriesView(SplotterConPageView):
    template_name = "SplotterCon/accessories.html"


class ProductWebView(SplotterConPageView):
    template_name = "SplotterCon/product_web.html"


class ProductDrafView(SplotterConPageView):
    template_name = "SplotterCon/product_draf.html"


class ProductGossipView(SplotterConPageView):
    template_name = "SplotterCon/product_gossip.html"


class ProductUnboxedView(SplotterConPageView):
    template_name = "SplotterCon/product_unboxed.html"


class SponsorsView(SplotterConPageView):
    template_name = "SplotterCon/sponsors.html"


class DonateView(SplotterConPageView):
    template_name = "SplotterCon/donate.html"


class PoliciesView(SplotterConPageView):
    template_name = "SplotterCon/policies.html"


class ContactView(SplotterConPageView):
    template_name = "SplotterCon/contact.html"


class AboutView(SplotterConPageView):
    template_name = "SplotterCon/about.html"


class Gallery2024View(SplotterConPageView):
    template_name = "SplotterCon/gallery_2024.html"


class Gallery2025FridayView(SplotterConPageView):
    template_name = "SplotterCon/gallery_2025_friday.html"


class Gallery2025SaturdayView(SplotterConPageView):
    template_name = "SplotterCon/gallery_2025_saturday.html"


class Gallery2025MondayView(SplotterConPageView):
    template_name = "SplotterCon/gallery_2025_monday.html"


class Gallery2025SundayView(SplotterConPageView):
    template_name = "SplotterCon/gallery_2025_sunday.html"
