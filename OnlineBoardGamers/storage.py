from django.contrib.staticfiles.storage import ManifestStaticFilesStorage

class MyManifestStaticFilesStorage(ManifestStaticFilesStorage):
    manifest_strict = False