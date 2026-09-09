from django.urls import path

from . import views

app_name = "SplotterCon"

urlpatterns = [
    path("", views.HomeView.as_view(), name="home"),
    path("registration/", views.RegistrationView.as_view(), name="registration"),
    path("hotel/", views.HotelView.as_view(), name="hotel"),
    path("food/", views.FoodView.as_view(), name="food"),
    path("faqs/", views.FaqsView.as_view(), name="faqs"),
    path("prizerules/", views.PrizeRulesView.as_view(), name="prizerules"),
    path("contests/", views.ContestsView.as_view(), name="contests"),
    path("tournament/", views.TournamentView.as_view(), name="tournament"),
    path("tgz-tournament/", views.TgzTournamentView.as_view(), name="tgz_tournament"),
    path("library/", views.LibraryView.as_view(), name="library"),
    # Old scraped slug aliases that resolve to the same library content
    path("games/", views.LibraryView.as_view(), name="library_games"),
    path("games-library/", views.LibraryView.as_view(), name="library_games_library"),
    path("merch/", views.MerchView.as_view(), name="merch"),
    path("accessories/", views.AccessoriesView.as_view(), name="accessories"),
    path("product/web-sc25-special-edition/", views.ProductWebView.as_view(), name="product_web"),
    path("product/draf-sc24-special-edition/", views.ProductDrafView.as_view(), name="product_draf"),
    path("product/gossip-sc26-special-edition/", views.ProductGossipView.as_view(), name="product_gossip"),
    path("product/splotter-unboxed/", views.ProductUnboxedView.as_view(), name="product_unboxed"),
    path("sponsors/", views.SponsorsView.as_view(), name="sponsors"),
    path("sponsor/", views.SponsorsView.as_view(), name="sponsor"),
    path("donate/", views.DonateView.as_view(), name="donate"),
    path("policies/", views.PoliciesView.as_view(), name="policies"),
    path("contact/", views.ContactView.as_view(), name="contact"),
    path("about/", views.AboutView.as_view(), name="about"),
    path("gallery/2024/", views.Gallery2024View.as_view(), name="gallery_2024"),
    path("gallery/2025/friday/", views.Gallery2025FridayView.as_view(), name="gallery_2025_friday"),
    path("gallery/2025/saturday/", views.Gallery2025SaturdayView.as_view(), name="gallery_2025_saturday"),
    path("gallery/2025/monday/", views.Gallery2025MondayView.as_view(), name="gallery_2025_monday"),
    path("gallery/2025/sunday/", views.Gallery2025SundayView.as_view(), name="gallery_2025_sunday"),
]
