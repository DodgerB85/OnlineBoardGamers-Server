import os
import datetime
from pydrive2.auth import GoogleAuth
from pydrive2.drive import GoogleDrive
from decouple import config

# Configuration
BACKUP_DIR_NAME = "~/mysql_backups"
DAYS_TO_KEEP_BACKUP = 2
FILE_PREFIX = "my_db_backup_"
FILE_SUFFIX_DATE_FORMAT = "%Y%m%d%H%M%S"
USERNAME = str(config("G_DRIVE_USERNAME", default="driveID", cast=str))
DBNAME = USERNAME + "$default"
GOOGLE_DRIVE_FOLDER_ID = config("G_DRIVE_FOLDER_ID", default="driveID", cast=str)

# This gets the absolute path to the directory where THIS script is saved
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# This joins that path with the filename so it works regardless of where you run it from
CREDS_FILE = os.path.join(SCRIPT_DIR, "creds4.txt")

# Ensure backup directory exists
backup_dir = os.path.expanduser(BACKUP_DIR_NAME)
os.makedirs(backup_dir, exist_ok=True)

# Get today's date and time
timestamp = datetime.datetime.now().strftime(FILE_SUFFIX_DATE_FORMAT)
backup_filename = os.path.join(backup_dir, f"{FILE_PREFIX}{timestamp}.sql")

# Create database backup
try:
    os.system(
        f"mysqldump -u {USERNAME} -h {USERNAME}.mysql.pythonanywhere-services.com "
        f"--set-gtid-purged=OFF --no-tablespaces --column-statistics=0 '{DBNAME}' > {backup_filename}"
    )
    if not os.path.exists(backup_filename):
        raise FileNotFoundError(f"Backup file {backup_filename} was not created")
    print(f"Created backup: {backup_filename}")
except Exception as e:
    print(f"Error creating backup: {e}")
    exit(1)

# Delete old backup files
try:
    list_files = os.listdir(backup_dir)
    back_date = (datetime.datetime.now() - datetime.timedelta(days=DAYS_TO_KEEP_BACKUP)).strftime(
        FILE_SUFFIX_DATE_FORMAT
    )
    length = len(FILE_PREFIX)

    for f in list_files:
        filename, ext = os.path.splitext(f)
        if ext in (".sql", ".zip"):
            suffix = filename[length:]
            if suffix < back_date:
                print(f"Deleting file: {f}")
                os.remove(os.path.join(backup_dir, f))
except FileNotFoundError:
    print(f"Directory {backup_dir} not found")
except Exception as e:
    print(f"Error deleting old files: {e}")

# Upload to Google Drive
try:
    gauth = GoogleAuth()
    gauth.LoadCredentialsFile(CREDS_FILE)
    if gauth.credentials is None:
        print(f"Credentials file {CREDS_FILE} not found or invalid")
        exit(1)
    elif gauth.access_token_expired:
        print("Access token expired, attempting to refresh")
        gauth.Refresh()
    else:
        print("Credentials valid, authorizing")
        gauth.Authorize()

    drive = GoogleDrive(gauth)

    # Set file metadata
    file_metadata = {
        'title': f"{FILE_PREFIX}{timestamp}.sql",
        'parents': [{'id': GOOGLE_DRIVE_FOLDER_ID}]
    }

    # Create and upload the file
    gdrive_file = drive.CreateFile(file_metadata)
    gdrive_file.SetContentFile(backup_filename)
    gdrive_file.Upload()
    print(f"Backup file uploaded to Google Drive. Link: {gdrive_file['alternateLink']}")
except Exception as e:
    print(f"Error uploading to Google Drive: {e}")
    exit(1)