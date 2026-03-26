"""OnlineBoardGamers URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path
from django.contrib.auth import views as auth_views  # import this

# from django.conf.urls import handler403
from Lobby.forms import SetPasswordFormCustom
# from django.conf.urls import url
# from django.contrib.auth import views as auth_views

from django.contrib.sitemaps.views import sitemap
from .sitemaps import StaticSitemap

from django.views.generic.base import TemplateView

from django.conf.urls.i18n import i18n_patterns
from django.views.i18n import JavaScriptCatalog
from django.views.generic import RedirectView

from django.conf import settings
from django.conf.urls.static import static


sitemaps = {
    #    'Article': ArticleSitemap,
    "static": StaticSitemap,
}


urlpatterns = [
    #    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='sitemap'),
    path(
        "sitemap.xml",
        sitemap,
        {"sitemaps": sitemaps},
        name="django.contrib.sitemaps.views.sitemap",
    ),
    path(
        "robots.txt",
        TemplateView.as_view(
            template_name="Lobby/robots.txt", content_type="text/plain"
        ),
    ),  # add the robots.txt file
    path("", include("Lobby.urls")),
    path("FCM/", include("FCM.urls")),
    path("BUS/", include("BUS.urls")),
    path("HC/", include("HC.urls")),
    path("TGZ/", include("TGZ.urls")),
    path("CNS/", include("CNS.urls")),
    path("AQY/", include("AQY.urls")),
    path("IND/", include("IND.urls")),
    path("KFW/", include("KFW.urls")),
    path("PPF/", include("PPF.urls")),
    path("WEB/", include("WEB.urls")),
    path("RNB/", include("RNB.urls")),
    path("admin/", admin.site.urls),
    # path('accounts/', include('django.contrib.auth.urls')),
    # path('password_reset/done/', auth_views.PasswordResetDoneView.as_view(template_name='Lobby/password/password_reset_done.html'), name='password_reset_done'),
    # path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(template_name="Lobby/password/password_reset_confirm.html"), name='password_reset_confirm'),
    path(
        "reset/<uidb64>/<token>/",
        auth_views.PasswordResetConfirmView.as_view(
            template_name="Lobby/password/password_reset_confirm.html",
            form_class=SetPasswordFormCustom,
        ),
        name="password_reset_confirm",
    ),
    path(
        "reset/done/",
        auth_views.PasswordResetCompleteView.as_view(
            template_name="Lobby/password/password_reset_complete.html"
        ),
        name="password_reset_complete",
    ),
    # Change Password
    path(
        "change-password/",
        auth_views.PasswordChangeView.as_view(
            template_name="Lobby/password/password_change.html", success_url="/"
        ),
        name="change_password",
    ),
    path("i18n/", include("django.conf.urls.i18n")),
    path(
        "favicon.ico",
        RedirectView.as_view(url=settings.STATIC_URL + "Lobby/favicon.ico"),
    ),
]

urlpatterns += i18n_patterns(
    # Put translatable views here
    # path('', views.index),
    # Needed for translations in Javascript
    path("jsi18n/", JavaScriptCatalog.as_view(), name="javascript-catalog"),
)

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICI18N_ROOT)

if settings.DEBUG:
    import debug_toolbar

    urlpatterns += [
        path("__debug__/", include(debug_toolbar.urls)),
    ]

handler403 = "Lobby.views.csrf_failure"
handler404 = "Lobby.views.handler404"
handler500 = "Lobby.views.handler500"


# handler403 = 'views.permission_denied',
