import asyncio
import hashlib
import hmac
import html
import json
import os
import re
import secrets
import shutil
import time
from datetime import datetime, date, timedelta
from pathlib import Path
try:
    import asyncpg
except ImportError:
    asyncpg = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(BASE_DIR, "velvet_data.json")
JSON_BACKUP_PATH = os.path.join(BASE_DIR, "velvet_data.json.bak")
ENV_PATH = os.path.join(BASE_DIR, ".env")


def load_dotenv_file():
    """Безопасная загрузка переменных окружения из локального файла .env."""
    if not os.path.exists(ENV_PATH):
        return
    try:
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'").strip('"')
                if k and k not in os.environ:
                    os.environ[k] = v
    except Exception:
        pass


load_dotenv_file()


def _get_or_create_secret_key() -> bytes:
    env_key = os.getenv("VELVET_SECRET_KEY", "").strip()
    if len(env_key) >= 32:
        return env_key.encode("utf-8")
    key_file = os.path.join(BASE_DIR, ".velvet_secret.key")
    if os.path.exists(key_file):
        try:
            with open(key_file, "r", encoding="utf-8") as f:
                val = f.read().strip()
                if len(val) >= 32:
                    return val.encode("utf-8")
        except Exception:
            pass
    generated = secrets.token_hex(32)
    try:
        with open(key_file, "w", encoding="utf-8") as f:
            f.write(generated)
        os.chmod(key_file, 0o600)
    except Exception:
        pass
    return generated.encode("utf-8")


SECRET_KEY: bytes = _get_or_create_secret_key()
DB_DSN = os.getenv("DATABASE_URL", "").strip()
pool = None
USE_FALLBACK_JSON = False
_json_lock = asyncio.Lock()

CAKE_IMAGES_BY_TITLE = {
    "Торт A0024": "https://static.tildacdn.com/tild3235-3733-4731-b463-313531336437/0024.jpg",
    "Детский торт D0010": "https://static.tildacdn.com/tild3931-3266-4333-a361-313465313037/D0010.jpg",
    "Свадебный торт W0100": "https://optim.tildacdn.com/stor6464-3163-4161-b030-663533323565/-/format/webp/21730684.jpg.webp",
    "Детский торт D0189": "https://static.tildacdn.com/stor6162-6437-4136-b161-316432323961/92694788.jpg",
    "Свадебный торт W0001": "https://optim.tildacdn.com/tild3130-6630-4638-b437-396238626338/-/contain/264x264/center/center/-/format/webp/W0001.jpg.webp",
    "Торт A0003": "https://optim.tildacdn.com/tild6530-6465-4335-b332-353961396363/-/contain/264x264/center/center/-/format/webp/0003.jpg.webp",
    "Детский торт D0188": "https://optim.tildacdn.com/stor6137-3436-4461-a261-346630646633/-/contain/194x264/center/center/-/format/webp/38623211.jpg.webp",
    "Детский торт D0187": "https://static.tildacdn.com/stor3337-3962-4432-b233-623135363830/97011767.jpg",
    "Детский торт D0186": "https://optim.tildacdn.com/stor3137-6665-4234-a265-666338363133/-/contain/236x264/center/center/-/format/webp/38350151.jpg.webp",
    "Детский торт D0185": "https://static.tildacdn.com/stor6533-6261-4261-b566-303537663036/42321055.jpg",
    ": Детский торт D0184": "https://optim.tildacdn.com/stor6665-3733-4365-b062-313736353932/-/contain/264x264/center/center/-/format/webp/83919860.jpg.webp",
    "Copy: Детский торт D0183": "https://static.tildacdn.com/stor3133-3936-4162-b537-626336653734/39014474.jpg",
    ": Детский торт D0182": "https://static.tildacdn.com/stor6265-3032-4333-a138-633338323366/49263075.jpg",
    "Детский торт D0182 (Торт с паспортом)": "https://optim.tildacdn.com/stor6137-3436-4461-a261-346630646633/-/contain/194x264/center/center/-/format/webp/38623211.jpg.webp",
    ": Детский торт D0181": "https://static.tildacdn.com/stor6633-6530-4466-b434-636330623335/69987146.jpg",
    "Детский торт D0180": "https://optim.tildacdn.com/stor3130-3732-4338-b963-336530616162/-/contain/194x264/center/center/-/format/webp/78061252.jpg.webp",
    "Детский торт D0179": "https://optim.tildacdn.com/stor3232-3734-4666-b539-653930653931/-/contain/231x264/center/center/-/format/webp/71917020.jpg.webp",
    ": Детский торт D0178": "https://optim.tildacdn.com/stor6236-6635-4337-b366-333930363062/-/contain/181x264/center/center/-/format/webp/72490853.jpg.webp",
    "Детский торт D0177": "https://optim.tildacdn.com/stor3030-6633-4261-b062-333565303334/-/contain/211x264/center/center/-/format/webp/95055860.jpg.webp",
    "Детский торт D0131": "https://optim.tildacdn.com/stor3137-6665-4234-a265-666338363133/-/contain/236x264/center/center/-/format/webp/38350151.jpg.webp",
    "Детский торт D0134": "https://static.tildacdn.com/tild6135-3133-4638-a437-333362393964/07.jpg",
    "Детский торт D0038": "https://optim.tildacdn.com/tild3235-3764-4366-b063-643435306563/-/contain/264x264/center/center/-/format/webp/D0038.jpg.webp",
    "Детский торт D0169": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "Детский торт D0146": "https://static.tildacdn.com/tild3732-3333-4064-a133-653163396564/023.jpg",
    "Детский торт D0137": "https://optim.tildacdn.com/tild3764-6461-4938-a630-646530356238/-/contain/264x264/center/center/-/format/webp/24.jpg.webp",
    "Детский торт D0175": "https://static.tildacdn.com/stor3133-3936-4162-b537-626336653734/39014474.jpg",
    "Детский торт D0041": "https://static.tildacdn.com/stor6533-6261-4261-b566-303537663036/42321055.jpg",
    "Детский торт D0171": "https://static.tildacdn.com/tild3732-3333-4064-a133-653163396564/023.jpg",
    "Детский торт D0039": "https://optim.tildacdn.com/tild3235-3764-4366-b063-643435306563/-/contain/264x264/center/center/-/format/webp/D0038.jpg.webp",
    "Детский торт D0159": "https://static.tildacdn.com/tild3764-6332-4165-a661-343035386330/18.jpg",
    "Детский торт D0176": "https://static.tildacdn.com/stor3133-3936-4162-b537-626336653734/39014474.jpg",
    "Детский торт D0155": "https://static.tildacdn.com/tild3061-6264-4437-b439-396465666531/037.jpg",
    "Детский торт D0003": "https://optim.tildacdn.com/tild3736-3539-4639-a539-303464336561/-/contain/264x264/center/center/-/format/webp/D0003.jpg.webp",
    "Детский торт D0156": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "Детский торт D0136": "https://static.tildacdn.com/stor6533-6261-4261-b566-303537663036/42321055.jpg",
    "Детский торт D0006": "https://static.tildacdn.com/tild6139-3430-4966-b733-353763626331/D0006.jpg",
    "Детский торт D0165": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "Детский торт D0012": "https://optim.tildacdn.com/tild3832-6637-4865-b163-353663393162/-/contain/298x298/center/center/-/format/webp/D0012.jpg.webp",
    "Детский торт D0032": "https://optim.tildacdn.com/tild6236-6633-4361-b434-613738393265/-/contain/264x264/center/center/-/format/webp/D0032.jpg.webp",
    "Детский торт D0011": "https://static.tildacdn.com/tild3636-6233-4038-b133-306639366663/D0011.jpg",
    "Детский торт D0121": "https://static.tildacdn.com/tild3764-6332-4165-a661-343035386330/18.jpg",
    "Детский торт D0173": "https://static.tildacdn.com/tild3732-3333-4064-a133-653163396564/023.jpg",
    "Детский торт D0139": "https://static.tildacdn.com/stor6265-3032-4333-a138-633338323366/49263075.jpg",
    "Детский торт D0013": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "Детский торт D0009": "https://static.tildacdn.com/tild3764-6332-4165-a661-343035386330/18.jpg",
    "Детский торт D0015": "https://static.tildacdn.com/tild3732-3333-4064-a133-653163396564/023.jpg",
    "Детский торт D0133": "https://static.tildacdn.com/tild3636-6233-4038-b133-306639366663/D0011.jpg",
    "Детский торт D0145": "https://static.tildacdn.com/tild6135-3133-4638-a437-333362393964/07.jpg",
    "Детский торт D0140": "https://static.tildacdn.com/tild3764-6332-4165-a661-343035386330/18.jpg",
    "Детский торт D0148": "https://optim.tildacdn.com/stor6665-3733-4365-b062-313736353932/-/contain/264x264/center/center/-/format/webp/83919860.jpg.webp",
    "Детский торт D0141": "https://optim.tildacdn.com/tild3263-3834-4162-b063-343539313830/-/contain/264x264/center/center/-/format/webp/001.jpg.webp",
    "Детский торт D0150": "https://static.tildacdn.com/tild3764-6332-4165-a661-343035386330/18.jpg",
    "Детский торт D0151": "https://static.tildacdn.com/stor6533-6261-4261-b566-303537663036/42321055.jpg",
    "Детский торт D0154": "https://optim.tildacdn.com/tild3863-3331-4036-b737-663665313335/-/contain/264x264/center/center/-/format/webp/036.jpg.webp",
    "Детский торт D0160": "https://static.tildacdn.com/tild3732-3333-4064-a133-653163396564/023.jpg",
    "Детский торт D0028": "https://optim.tildacdn.com/tild3736-3539-4639-a539-303464336561/-/contain/264x264/center/center/-/format/webp/D0003.jpg.webp",
    "Детский торт D0061": "https://static.tildacdn.com/stor6533-6261-4261-b566-303537663036/42321055.jpg",
    "Детский торт D0075": "https://optim.tildacdn.com/tild6338-3232-4736-a661-316232326235/-/contain/264x264/center/center/-/format/webp/D0075.jpg.webp",
    "Детский торт D0066": "https://optim.tildacdn.com/tild3832-6637-4865-b163-353663393162/-/contain/298x298/center/center/-/format/webp/D0012.jpg.webp",
    "Детский торт D0072": "https://optim.tildacdn.com/tild3764-6461-4938-a630-646530356238/-/contain/264x264/center/center/-/format/webp/24.jpg.webp",
    "Детский торт D0078": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "Детский торт D0086": "https://static.tildacdn.com/tild6139-3430-4966-b733-353763626331/D0006.jpg",
    "Детский торт D0108": "https://static.tildacdn.com/stor6633-6530-4466-b434-636330623335/69987146.jpg",
    "Детский торт D0109": "https://static.tildacdn.com/tild3061-6264-4437-b439-396465666531/037.jpg",
    "Детский торт D0119": "https://static.tildacdn.com/stor3133-3936-4162-b537-626336653734/39014474.jpg",
    "Детский торт D0128": "https://static.tildacdn.com/tild3634-3061-4832-a232-636261373466/D0001.jpg",
    "Свадебный торт W0109": "https://static.tildacdn.com/stor6664-3631-4261-b766-383230343863/66996029.jpg",
    "Свадебный торт W0108": "https://static.tildacdn.com/stor3161-3364-4466-b335-303866616364/78628838.jpg",
    "Свадебный торт W0107": "https://static.tildacdn.com/stor6538-3036-4961-b730-323037343634/18416439.jpg",
    "Свадебный торт W0106": "https://static.tildacdn.com/stor6531-3062-4363-b938-393134356438/46706249.jpg",
    ": Свадебный торт W0105": "https://static.tildacdn.com/stor3035-3833-4862-a435-316662643336/28829773.jpg",
    ": Свадебный торт W0104": "https://static.tildacdn.com/stor6434-6137-4762-b163-303430396362/39674646.jpg",
    ": Свадебный торт W0103": "https://optim.tildacdn.com/stor3535-6366-4163-b339-353039663635/-/contain/218x264/center/center/-/format/webp/28185053.jpg.webp",
    "Свадебный торт W0102": "https://optim.tildacdn.com/stor6633-6635-4234-b062-316438653234/-/contain/201x264/center/center/-/format/webp/18394086.jpg.webp",
    "Свадебный торт W0101": "https://optim.tildacdn.com/stor3065-6662-4134-b739-333666346136/-/contain/217x264/center/center/-/format/webp/77663389.jpg.webp",
    "Свадебный торт W0004": "https://optim.tildacdn.com/tild3430-6664-4632-a135-393938306531/-/contain/264x264/center/center/-/format/webp/W0004.jpg.webp",
    "Свадебный торт W0005": "https://optim.tildacdn.com/tild6131-3764-4165-b962-666636313030/-/contain/264x264/center/center/-/format/webp/W0005.jpg.webp",
    "Свадебный торт W0008": "https://optim.tildacdn.com/tild6138-3739-4430-b566-646664643831/-/contain/264x264/center/center/-/format/webp/W0008.jpg.webp",
    "Свадебный торт W0010": "https://optim.tildacdn.com/tild6139-6131-4761-a438-386631376636/-/contain/264x264/center/center/-/format/webp/W0010.jpg.webp",
    "Свадебный торт W0011": "https://optim.tildacdn.com/tild6666-6366-4239-b435-333363306366/-/contain/264x264/center/center/-/format/webp/W0011.jpg.webp",
    "Свадебный торт W0015": "https://optim.tildacdn.com/tild3063-6431-4966-b835-616566616135/-/contain/264x264/center/center/-/format/webp/W0015.jpg.webp",
    "Свадебный торт W0018": "https://optim.tildacdn.com/tild3964-3266-4331-a562-346133393738/-/contain/264x264/center/center/-/format/webp/W018.jpg.webp",
    "Свадебный торт W0023": "https://optim.tildacdn.com/tild3533-3139-4662-a666-303236336131/-/contain/264x264/center/center/-/format/webp/W0023.jpg.webp",
    "Свадебный торт W0027": "https://optim.tildacdn.com/tild3362-3237-4965-b463-636335306533/-/contain/264x264/center/center/-/format/webp/W0027.jpg.webp",
    "Свадебный торт W0030": "https://optim.tildacdn.com/tild3962-6465-4833-b539-373538306162/-/contain/264x264/center/center/-/format/webp/W0030.jpg.webp",
    "Свадебный торт W0031": "https://optim.tildacdn.com/tild3365-3339-4631-a165-653833616436/-/contain/264x264/center/center/-/format/webp/W0031.jpg.webp",
    "Свадебный торт W0032": "https://optim.tildacdn.com/tild6466-6332-4432-b064-343866616334/-/contain/264x264/center/center/-/format/webp/W0032.jpg.webp",
    "Свадебный торт W0033": "https://optim.tildacdn.com/tild3932-6233-4431-a162-323432616634/-/contain/264x264/center/center/-/format/webp/W0033.jpg.webp",
    "Свадебный торт W0036": "https://optim.tildacdn.com/tild3130-3633-4230-a336-613062326135/-/contain/264x264/center/center/-/format/webp/W0036.jpg.webp",
    "Свадебный торт W0037": "https://static.tildacdn.com/tild6464-6335-4462-b961-623765353737/W0037.jpg",
    "Свадебный торт W0038": "https://optim.tildacdn.com/tild3134-6461-4438-b230-633238356364/-/contain/264x264/center/center/-/format/webp/W0038.jpg.webp",
    "Свадебный торт W0039": "https://optim.tildacdn.com/tild3238-6261-4831-b039-346563636436/-/contain/264x264/center/center/-/format/webp/W0039.jpg.webp",
    "Свадебный торт W0040": "https://optim.tildacdn.com/tild6437-3030-4333-b533-643137303762/-/contain/264x264/center/center/-/format/webp/W0040.jpg.webp",
    "Свадебный торт W0041": "https://optim.tildacdn.com/tild6166-3564-4637-b961-633830646239/-/contain/264x264/center/center/-/format/webp/W0041.jpg.webp",
    "Свадебный торт W0044": "https://optim.tildacdn.com/tild3031-3137-4138-b165-306437623832/-/contain/264x264/center/center/-/format/webp/W0044.jpg.webp",
    "Свадебный торт W0046": "https://optim.tildacdn.com/tild3932-3461-4231-b562-386433636565/-/contain/264x264/center/center/-/format/webp/W0046.jpg.webp",
    "Свадебный торт W0047": "https://optim.tildacdn.com/tild3535-6363-4435-b433-353730663938/-/contain/264x264/center/center/-/format/webp/W0047.jpg.webp",
    "Свадебный торт W0049": "https://optim.tildacdn.com/tild3233-3536-4433-a631-646464343462/-/contain/264x264/center/center/-/format/webp/W0049.jpg.webp",
    "Свадебный торт W0050": "https://optim.tildacdn.com/tild3739-3139-4530-b531-396563376238/-/contain/264x264/center/center/-/format/webp/W0050.jpg.webp",
    "Свадебный торт W0052": "https://optim.tildacdn.com/tild3631-6266-4438-b664-393866643835/-/contain/264x264/center/center/-/format/webp/W0052.jpg.webp",
    "Свадебный торт W0053": "https://optim.tildacdn.com/tild6533-3363-4162-a236-636139303466/-/contain/264x264/center/center/-/format/webp/W0053.jpg.webp",
    "Свадебный торт W0056": "https://optim.tildacdn.com/tild3031-3638-4666-a166-633033313139/-/contain/264x264/center/center/-/format/webp/W0056.jpg.webp",
    "Свадебный торт W0058": "https://optim.tildacdn.com/tild6461-3536-4465-b536-613939383333/-/contain/264x264/center/center/-/format/webp/W0058.jpg.webp",
    "Свадебный торт W0059": "https://optim.tildacdn.com/tild3564-6336-4238-a664-336462626361/-/contain/264x264/center/center/-/format/webp/W0059.jpg.webp",
    "Свадебный торт W0060": "https://optim.tildacdn.com/tild3330-3563-4238-b964-376664643038/-/format/webp/W0060.jpg.webp",
    "Свадебный торт W0061": "https://optim.tildacdn.com/tild6561-3863-4565-b862-643330336634/-/format/webp/W0061.jpg.webp",
    "Свадебный торт W0062": "https://optim.tildacdn.com/tild3762-6466-4233-b265-323336316234/-/contain/264x264/center/center/-/format/webp/W0062.jpg.webp",
    "Свадебный торт W0063": "https://optim.tildacdn.com/tild6138-3461-4633-b038-626435326439/-/contain/264x264/center/center/-/format/webp/W0063.jpg.webp",
    "Свадебный торт W0072": "https://optim.tildacdn.com/tild6631-3738-4434-a334-346139376439/-/format/webp/W0072.jpg.webp",
    "Свадебный торт W0080": "https://optim.tildacdn.com/tild3062-3663-4531-a430-336535666238/-/format/webp/W0080.jpg.webp",
    "Свадебный торт W0081": "https://optim.tildacdn.com/tild3730-3464-4136-a439-336637663639/-/format/webp/W0081.jpg.webp",
    "Свадебный торт W0086": "https://optim.tildacdn.com/tild6163-3932-4862-b565-633232336337/-/format/webp/W0086.jpg.webp",
    "Свадебный торт W0087": "https://optim.tildacdn.com/tild3531-3562-4034-b763-643831373130/-/format/webp/W0087.jpg.webp",
    "Торт A0001": "https://optim.tildacdn.com/tild3536-6261-4038-a131-643235386161/-/contain/264x264/center/center/-/format/webp/0001.jpg.webp",
    "Торт A0076": "https://optim.tildacdn.com/tild3466-3232-4465-b530-353333383838/-/contain/264x264/center/center/-/format/webp/05.jpg.webp",
    "Торт A0091": "https://optim.tildacdn.com/tild3463-3239-4833-a465-303338316161/-/contain/264x264/center/center/-/format/webp/0012.jpg.webp",
    "Торт A0002": "https://optim.tildacdn.com/tild3237-3734-4234-b734-346165383565/-/contain/264x264/center/center/-/format/webp/0002.jpg.webp",
    "Торт A0078": "https://optim.tildacdn.com/tild3364-6161-4563-b264-343639316163/-/contain/264x264/center/center/-/format/webp/0001.jpg.webp",
    "Торт A0010": "https://optim.tildacdn.com/tild6535-3534-4230-b432-626138396466/-/contain/264x264/center/center/-/format/webp/0010.jpg.webp",
    "Торт A0005": "https://optim.tildacdn.com/tild3230-6639-4334-b935-653562383732/-/contain/264x264/center/center/-/format/webp/0005.jpg.webp",
    "Торт A0030": "https://optim.tildacdn.com/tild3266-6632-4562-a263-336237313338/-/contain/264x264/center/center/-/format/webp/0030.jpg.webp",
    "Торт A0055": "https://static.tildacdn.com/tild3264-3761-4333-b130-623139633837/0055.jpg",
    "Торт A0022": "https://static.tildacdn.com/tild3133-3166-4131-b333-313437616164/0022.jpg",
    "Торт A0090": "https://optim.tildacdn.com/tild3637-6433-4631-b634-646432313637/-/contain/264x264/center/center/-/format/webp/0006.jpg.webp",
    "Торт A0041": "https://optim.tildacdn.com/tild3164-6332-4462-b666-656639613739/-/contain/264x264/center/center/-/format/webp/0041.jpg.webp",
    "Торт A0013": "https://optim.tildacdn.com/tild6333-6636-4330-b433-386331643464/-/contain/264x264/center/center/-/format/webp/0013.jpg.webp",
    "Торт A0092": "https://optim.tildacdn.com/tild6334-3836-4462-b637-623161616633/-/contain/264x264/center/center/-/format/webp/0015.jpg.webp",
    "Торт A0079": "https://optim.tildacdn.com/tild3031-3131-4730-b461-613165363030/-/contain/264x264/center/center/-/format/webp/013.jpg.webp",
    "Торт A0080": "https://optim.tildacdn.com/tild6433-6535-4664-b161-313234363639/-/contain/264x264/center/center/-/format/webp/022.jpg.webp",
    "Торт A0081": "https://optim.tildacdn.com/tild3161-3466-4464-b534-653831326363/-/contain/264x264/center/center/-/format/webp/024.jpg.webp",
    "Торт A0082": "https://optim.tildacdn.com/tild6166-6631-4636-b165-663962616161/-/contain/264x264/center/center/-/format/webp/031.jpg.webp",
    "Торт A0084": "https://optim.tildacdn.com/tild3738-3831-4034-b634-666639653136/-/contain/264x264/center/center/-/format/webp/004.jpg.webp",
    "Торт A0085": "https://optim.tildacdn.com/tild3161-3136-4335-b038-376430663733/-/contain/264x264/center/center/-/format/webp/005.jpg.webp",
    "Торт A0087": "https://optim.tildacdn.com/tild6161-6231-4363-a531-303264343339/-/contain/176x264/center/center/-/format/webp/010.jpg.webp",
    "Торт A0088": "https://optim.tildacdn.com/tild3966-3661-4136-b764-303631653237/-/contain/264x264/center/center/-/format/webp/015.jpg.webp",
    "Торт A0014": "https://optim.tildacdn.com/tild6634-3931-4537-b236-306163643264/-/contain/264x264/center/center/-/format/webp/0014.jpg.webp",
    "Торт A0015": "https://optim.tildacdn.com/tild6565-6634-4236-b466-353139656235/-/contain/264x264/center/center/-/format/webp/0015.jpg.webp",
    "Торт A0016": "https://optim.tildacdn.com/tild3038-6332-4766-b234-316365636533/-/contain/264x264/center/center/-/format/webp/0016.jpg.webp",
    "Торт A0023": "https://optim.tildacdn.com/tild6539-3536-4030-a437-323431613864/-/contain/264x264/center/center/-/format/webp/0023.jpg.webp",
    "Торт A0025": "https://optim.tildacdn.com/tild3630-6566-4731-b263-313631386130/-/contain/264x264/center/center/-/format/webp/0025.jpg.webp",
    "Торт A0028": "https://optim.tildacdn.com/tild3865-3963-4339-b331-626230323265/-/contain/264x264/center/center/-/format/webp/0028.jpg.webp",
    "Торт A0029": "https://optim.tildacdn.com/tild3665-3764-4539-b961-386235626663/-/contain/264x264/center/center/-/format/webp/0029.jpg.webp",
    "Торт A0032": "https://optim.tildacdn.com/tild6632-6233-4932-b931-303534663534/-/contain/264x264/center/center/-/format/webp/0032.jpg.webp",
    "Торт A0036": "https://optim.tildacdn.com/tild3738-3463-4837-b866-636534626665/-/contain/264x264/center/center/-/format/webp/0036.jpg.webp",
    "Торт A0045": "https://optim.tildacdn.com/tild3238-6233-4534-a438-666366303263/-/contain/264x264/center/center/-/format/webp/0045.jpg.webp",
    "Торт A0046": "https://optim.tildacdn.com/tild3531-3939-4530-a662-326434323836/-/contain/264x264/center/center/-/format/webp/0046.jpg.webp",
    "Торт A0047": "https://optim.tildacdn.com/tild3837-3261-4564-b962-386632306337/-/contain/264x264/center/center/-/format/webp/0047.jpg.webp",
    "Торт A0051": "https://optim.tildacdn.com/tild6532-6333-4665-a361-626162636137/-/contain/264x264/center/center/-/format/webp/0051.jpg.webp",
    "Торт A0052": "https://optim.tildacdn.com/tild3836-6335-4365-a138-626638303330/-/contain/264x264/center/center/-/format/webp/0052.jpg.webp",
    "Торт A0053": "https://optim.tildacdn.com/tild3632-6230-4264-b564-313932386166/-/contain/264x264/center/center/-/format/webp/0053.jpg.webp",
    "Торт A0054": "https://optim.tildacdn.com/tild3138-3166-4735-b133-386238393737/-/contain/264x264/center/center/-/format/webp/0054.jpg.webp",
    "Торт A0061": "https://optim.tildacdn.com/tild6464-3933-4339-a638-386230383837/-/contain/264x264/center/center/-/format/webp/0061.jpg.webp",
    "Торт A0067": "https://optim.tildacdn.com/tild3937-6266-4832-b363-653639613133/-/contain/264x264/center/center/-/format/webp/0067.jpg.webp",
    "Торт A0068": "https://optim.tildacdn.com/tild6431-3464-4836-b264-636138613166/-/contain/264x264/center/center/-/format/webp/0068.jpg.webp",
    "Торт A0074": "https://optim.tildacdn.com/tild6438-6361-4638-b036-623633626432/-/contain/264x264/center/center/-/format/webp/0074.jpg.webp",
    "Торт A0077": "https://optim.tildacdn.com/tild3765-6565-4235-a632-666130316134/-/contain/264x264/center/center/-/format/webp/19.jpg.webp",
    "Торт A0094": "https://optim.tildacdn.com/tild6638-6531-4931-b337-316661336338/-/contain/264x264/center/center/-/format/webp/0017.jpg.webp",
    "Торт A0096": "https://optim.tildacdn.com/tild3531-3335-4233-b738-306536373838/-/contain/264x264/center/center/-/format/webp/0019.jpg.webp",
    "Торт A0097": "https://optim.tildacdn.com/tild3439-3061-4232-a431-373665366461/-/contain/264x264/center/center/-/format/webp/0020.jpg.webp",
    "Капкейки «ИСЛАНДИЯ» (Ванильный)": "https://static.tildacdn.com/tild3164-6536-4039-b334-663131643432/about09.jpg",
    "Капкейки «ЯПОНИЯ» (Вишнёвый)": "https://optim.tildacdn.com/tild3365-3339-4631-a165-653833616436/-/contain/264x264/center/center/-/format/webp/W0031.jpg.webp",
    "Капкейки «КИТАЙ» (Красный бархат)": "https://optim.tildacdn.com/tild3932-6233-4431-a162-323432616634/-/contain/264x264/center/center/-/format/webp/W0033.jpg.webp",
    "Капкейки «АРГЕНТИНА» (Банановый)": "https://optim.tildacdn.com/tild3238-6233-4534-a438-666366303263/-/contain/264x264/center/center/-/format/webp/0045.jpg.webp",
    "Капкейки «АНГЛИЯ» (Клубничный)": "https://optim.tildacdn.com/tild3632-6230-4264-b564-313932386166/-/contain/264x264/center/center/-/format/webp/0053.jpg.webp",
    "Капкейки «ПОРТУГАЛИЯ» (Апельсиновый)": "https://optim.tildacdn.com/tild6539-3536-4030-a437-323431613864/-/contain/264x264/center/center/-/format/webp/0023.jpg.webp",
    "Капкейки «ЧЕХИЯ» (Морковно-ореховый)": "https://static.tildacdn.com/tild3164-6536-4039-b334-663131643432/about09.jpg",
    "Капкейки «ИТАЛИЯ» (Ореховый)": "https://optim.tildacdn.com/tild3031-3137-4138-b165-306437623832/-/contain/264x264/center/center/-/format/webp/W0044.jpg.webp",
    "Капкейки «ПОЛЬША» (Мятный)": "https://optim.tildacdn.com/tild6464-6335-4462-b961-623765353737/-/contain/264x264/center/center/-/format/webp/W0037.jpg",
}

# Временное хранилище хешей OTP для резервного режима: {phone: {"hash": str, "expires_at": float, "attempts": int}}
_fallback_otp_store = {}
MAX_OTP_ATTEMPTS = 5
OTP_TTL_SECONDS = 300  # 5 минут


def hash_otp_code(phone: str, code: str) -> str:
    """Вычисляет HMAC-SHA256 хеш одноразового кода с привязкой к номеру телефона."""
    msg = f"{phone}:{code.strip()}".encode("utf-8")
    return hmac.new(SECRET_KEY, msg, hashlib.sha256).hexdigest()


def hash_password(raw_password: str, salt: str = None) -> str:
    """Хеширование пароля администратора через PBKDF2-HMAC-SHA256 (200 000 итераций)."""
    if not salt:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", raw_password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return f"pbkdf2_sha256${salt}${dk.hex()}"


def verify_password(raw_password: str, stored_hash: str) -> bool:
    """Проверка пароля по PBKDF2-хешу с защитой от атак по времени (timing attack)."""
    if not raw_password or not stored_hash:
        return False
    if stored_hash.startswith("pbkdf2_sha256$"):
        parts = stored_hash.split("$")
        if len(parts) != 3:
            return False
        _, salt, _ = parts
        candidate = hash_password(raw_password, salt=salt)
        return secrets.compare_digest(candidate, stored_hash)
    return secrets.compare_digest(raw_password, stored_hash)


def sanitize_plain_text(val: str, max_len: int = 1000) -> str:
    """Удаляет управляющие символы и потенциально опасные HTML-конструкции."""
    if val is None:
        return ""
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", str(val)).strip()
    cleaned = re.sub(r"<\s*/?\s*script[^>]*>", "", cleaned, flags=re.IGNORECASE)
    return cleaned[:max_len]


def sanitize_image_url(url: str) -> str:
    """Разрешает только безопасные https/http ссылки и растровые data:image/(png|jpeg|webp);base64."""
    if not url:
        return ""
    u = str(url).strip()
    if re.match(r"^https?://[^\s<>'\"]+$", u, flags=re.IGNORECASE):
        return u[:2048]
    if re.match(r"^data:image/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$", u, flags=re.IGNORECASE):
        return u
    return ""


def assert_admin_access(actor_role: str):
    """Строгая серверная проверка прав перед любой модификацией или удалением в БД."""
    if actor_role not in ("admin", "manager"):
        raise PermissionError("Доступ запрещён: изменение или удаление данных разрешено только авторизованному администратору.")


def normalize_phone(phone: str):
    if not phone:
        return None
    digits = re.sub(r"\D", "", str(phone))
    if len(digits) == 11 and digits[0] in ("7", "8"):
        return "+7" + digits[1:]
    if len(digits) == 10 and digits[0] == "9":
        return "+7" + digits
    return None


def parse_weight_kg(w_str: str) -> float:
    if not w_str:
        return 1.5
    s = str(w_str).lower()
    if "бенто" in s:
        return 0.45
    m = re.search(r"(\d+(?:\.\d+)?)", s.replace(",", "."))
    val = float(m.group(1)) if m else 1.5
    return max(0.45, min(100.0, val))


def parse_ready_date(d_str: str) -> date:
    if not d_str:
        return date.today() + timedelta(days=1)
    for fmt in ("%Y-%m-%d", "%d.%m.%Y"):
        try:
            parsed = datetime.strptime(str(d_str).strip(), fmt).date()
            if parsed < date.today():
                return date.today() + timedelta(days=1)
            return parsed
        except ValueError:
            continue
    return date.today() + timedelta(days=1)


def _read_json_store() -> dict:
    if os.path.exists(JSON_PATH):
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"catalog": [], "fillings": [], "reviews": [], "orders": [], "users": [], "audit_logs": []}
    data.setdefault("users", [])
    data.setdefault("orders", [])
    data.setdefault("audit_logs", [])

    max_cake_id = 0
    for idx, c in enumerate(data.get("catalog", []), start=1):
        c.setdefault("db_id", idx)
        c.setdefault("is_active", True)
        max_cake_id = max(max_cake_id, int(c["db_id"]))
        if not c.get("image") or c["image"].startswith("data:image/svg"):
            c["image"] = CAKE_IMAGES_BY_TITLE.get(c.get("title"), "")

    max_fill_id = 0
    for idx, fl in enumerate(data.get("fillings", []), start=1):
        fl.setdefault("db_id", idx)
        fl.setdefault("is_active", True)
        max_fill_id = max(max_fill_id, int(fl["db_id"]))

    max_rev_id = 0
    for idx, rv in enumerate(data.get("reviews", []), start=1):
        rv.setdefault("db_id", idx)
        rv.setdefault("is_published", True)
        max_rev_id = max(max_rev_id, int(rv["db_id"]))

    data.setdefault("next_cake_id", max_cake_id + 1)
    data.setdefault("next_filling_id", max_fill_id + 1)
    data.setdefault("next_review_id", max_rev_id + 1)
    data.setdefault("next_order_id", max([int(o.get("id", 0)) for o in data["orders"]] + [0]) + 1)
    data.setdefault("next_user_id", max([int(u.get("id", 0)) for u in data["users"]] + [0]) + 1)
    return data


def _write_json_store_atomic(data: dict):
    """Атомарная запись JSON-хранилища через временный файл с созданием резервной копии .bak."""
    if os.path.exists(JSON_PATH):
        try:
            shutil.copy2(JSON_PATH, JSON_BACKUP_PATH)
        except Exception:
            pass
    tmp_path = f"{JSON_PATH}.tmp.{os.getpid()}.{secrets.token_hex(4)}"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp_path, JSON_PATH)


def _append_json_audit(data: dict, action_type: str, entity_type: str, entity_id: int, actor_id=None, details=None):
    data.setdefault("audit_logs", []).append({
        "id": len(data.get("audit_logs", [])) + 1,
        "admin_id": actor_id,
        "action_type": action_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details or {},
        "created_at": datetime.now().isoformat()
    })


async def init_db_pool():
    global pool, USE_FALLBACK_JSON
    if not DB_DSN or asyncpg is None:
        USE_FALLBACK_JSON = True
        print("ℹ️ DATABASE_URL не задан в .env — активирован защищённый локальный режим хранения (velvet_data.json).")
        return

    try:
        pool = await asyncpg.create_pool(dsn=DB_DSN, min_size=1, max_size=10, timeout=4)
        await ensure_schema_and_seed()
        USE_FALLBACK_JSON = False
        print("✅ PostgreSQL пул соединений и защищённая схема данных готовы!")
    except Exception as e:
        USE_FALLBACK_JSON = True
        print(f"⚠️ PostgreSQL недоступен ({e}). Включён защищённый резервный режим БД на базе velvet_data.json!")


async def ensure_schema_and_seed():
    async with pool.acquire() as conn:
        schema_path = os.path.join(BASE_DIR, "shema.sql")
        if os.path.exists(schema_path):
            with open(schema_path, "r", encoding="utf-8") as f:
                await conn.execute(f.read())

        cakes_count = await conn.fetchval("SELECT COUNT(*) FROM cakes;")
        seed = _read_json_store()

        cat_rows = await conn.fetch("SELECT id, slug FROM categories;")
        cat_map = {r["slug"]: r["id"] for r in cat_rows}

        if cakes_count == 0:
            for c in seed.get("catalog", []):
                cat_id = cat_map.get(c.get("category", "berry"), cat_map.get("berry"))
                img_url = sanitize_image_url(CAKE_IMAGES_BY_TITLE.get(c.get("title"), c.get("image", "")))
                min_w = 0.45 if c.get("category") == "bento" else 1.50
                await conn.execute("""
                    INSERT INTO cakes (category_id, title, description, badge, emoji, image_url, meta_info, base_price, price_unit, min_weight_kg)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """, cat_id, sanitize_plain_text(c.get("title"), 150), sanitize_plain_text(c.get("text", ""), 1000),
                     sanitize_plain_text(c.get("badge", ""), 50), sanitize_plain_text(c.get("emoji", "🎂"), 16),
                     img_url, sanitize_plain_text(c.get("meta", ""), 150),
                     float(c.get("price", 2000)), sanitize_plain_text(c.get("unit", "/ кг"), 20), min_w)

            for fl in seed.get("fillings", []):
                await conn.execute("""
                    INSERT INTO fillings (title, description, emoji, tag, layers)
                    VALUES ($1, $2, $3, $4, $5)
                """, sanitize_plain_text(fl.get("label", "Начинка"), 150),
                     sanitize_plain_text(fl.get("desc", ""), 1000),
                     sanitize_plain_text(fl.get("emoji", "🍓"), 16),
                     sanitize_plain_text(fl.get("tag", ""), 50),
                     [sanitize_plain_text(x, 100) for x in fl.get("layers", [])])

            for idx, rv in enumerate(seed.get("reviews", [])):
                fake_phone = f"+790000000{idx+10:02d}"
                u_id = await conn.fetchval("""
                    INSERT INTO users (phone, full_name, role)
                    VALUES ($1, $2, 'client')
                    ON CONFLICT (phone) DO NOTHING
                    RETURNING id;
                """, fake_phone, sanitize_plain_text(rv.get("name", "Гость"), 100))
                if not u_id:
                    u_id = await conn.fetchval("SELECT id FROM users WHERE phone = $1;", fake_phone)
                cake_id = await conn.fetchval("SELECT id FROM cakes WHERE title = $1 LIMIT 1;", rv.get("cake"))
                await conn.execute("""
                    INSERT INTO reviews (user_id, cake_id, cake_title_fallback, rating, comment, is_published)
                    VALUES ($1, $2, $3, $4, $5, TRUE)
                """, u_id, cake_id, sanitize_plain_text(rv.get("cake", "Авторский торт"), 150),
                     max(1, min(5, int(rv.get("rating", 5)))),
                     sanitize_plain_text(rv.get("text", "Отличный торт!"), 1500))


async def fetch_full_state() -> dict:
    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            cat = [c for c in data.get("catalog", []) if c.get("is_active", True)]
            fills = [f for f in data.get("fillings", []) if f.get("is_active", True)]
            revs = [r for r in data.get("reviews", []) if r.get("is_published", True)]
            return {"catalog": cat, "fillings": fills, "reviews": revs}

    async with pool.acquire() as conn:
        cakes = await conn.fetch("""
            SELECT c.id, c.title, c.description, c.base_price, c.image_url, c.emoji,
                   c.badge, c.meta_info, c.price_unit, COALESCE(cat.slug, 'berry') AS category_slug
            FROM cakes c
            LEFT JOIN categories cat ON cat.id = c.category_id
            WHERE c.is_active = TRUE
            ORDER BY c.id ASC;
        """)
        fills = await conn.fetch("""
            SELECT id, title, description, emoji, tag, layers
            FROM fillings
            WHERE is_active = TRUE
            ORDER BY id ASC;
        """)
        revs = await conn.fetch("""
            SELECT r.id, u.full_name AS name, r.rating, r.comment AS text,
                   COALESCE(c.title, r.cake_title_fallback, 'Авторский торт') AS cake,
                   TO_CHAR(r.created_at, 'DD.MM.YYYY') AS date
            FROM reviews r
            JOIN users u ON u.id = r.user_id
            LEFT JOIN cakes c ON c.id = r.cake_id
            WHERE r.is_published = TRUE AND u.is_blocked = FALSE
            ORDER BY r.created_at DESC;
        """)

        catalog = [{
            "id": f"cake_{r['id']}",
            "db_id": r["id"],
            "title": r["title"],
            "text": r["description"],
            "price": int(r["base_price"]),
            "image": r["image_url"] or CAKE_IMAGES_BY_TITLE.get(r["title"], ""),
            "emoji": r["emoji"] or "🎂",
            "badge": r["badge"] or "",
            "meta": r["meta_info"] or "",
            "category": r["category_slug"],
            "unit": r["price_unit"] or "/ кг"
        } for r in cakes]

        fillings = [{
            "id": f"fill_{r['id']}",
            "db_id": r["id"],
            "label": r["title"],
            "desc": r["description"],
            "emoji": r["emoji"] or "🍓",
            "tag": r["tag"] or "",
            "layers": list(r["layers"] or [])
        } for r in fills]

        reviews = [{
            "id": f"rev_{r['id']}",
            "db_id": r["id"],
            "name": r["name"],
            "rating": r["rating"],
            "cake": r["cake"],
            "text": r["text"],
            "date": r["date"]
        } for r in revs]

        return {"catalog": catalog, "fillings": fillings, "reviews": reviews}


async def request_phone_otp(raw_phone: str) -> dict:
    """
    Генерирует криптографически стойкий 6-значный код подтверждения.
    В БД сохраняется ТОЛЬКО HMAC-SHA256 хеш кода.
    Поле _internal_otp предназначено исключительно для отправки в Telegram на сервере
    и удаляется перед отправкой HTTP-ответа клиенту.
    """
    phone = normalize_phone(raw_phone)
    if not phone:
        return {"ok": False, "error": "Введите корректный российский номер (+7 или 8, 11 цифр)"}

    code = f"{secrets.randbelow(900000) + 100000}"
    code_hash = hash_otp_code(phone, code)
    now_ts = time.time()

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            existing = next((u for u in data["users"] if u.get("phone") == phone), None)
            if existing and existing.get("is_blocked"):
                return {"ok": False, "error": "Ваш аккаунт заблокирован"}
            _fallback_otp_store[phone] = {
                "hash": code_hash,
                "expires_at": now_ts + OTP_TTL_SECONDS,
                "attempts": 0,
                "is_used": False
            }
            return {
                "ok": True,
                "phone": phone,
                "is_registered": bool(existing),
                "existing_name": existing["name"] if existing else "",
                "_internal_otp": code
            }

    expires_at = datetime.now().astimezone() + timedelta(seconds=OTP_TTL_SECONDS)
    async with pool.acquire() as conn:
        existing_user = await conn.fetchrow(
            "SELECT id, full_name, phone, is_blocked FROM users WHERE phone = $1;", phone
        )
        if existing_user and existing_user["is_blocked"]:
            return {"ok": False, "error": "Ваш аккаунт заблокирован"}

        await conn.execute("UPDATE phone_otp_codes SET is_used = TRUE WHERE phone = $1 AND is_used = FALSE;", phone)
        await conn.execute(
            "INSERT INTO phone_otp_codes (phone, code_hash, attempts, expires_at) VALUES ($1, $2, 0, $3);",
            phone, code_hash, expires_at
        )
        return {
            "ok": True,
            "phone": phone,
            "is_registered": bool(existing_user),
            "existing_name": existing_user["full_name"] if existing_user else "",
            "_internal_otp": code
        }


async def verify_phone_otp(raw_phone: str, code: str, name: str = None, ip: str = None, ua: str = None) -> dict:
    """Проверяет одноразовый код по HMAC-SHA256 хешу с защитой от перебора (не более 5 попыток)."""
    phone = normalize_phone(raw_phone)
    if not phone:
        return {"ok": False, "error": "Неверный формат номера телефона"}

    code = (code or "").strip()
    if not re.match(r"^\d{6}$", code):
        return {"ok": False, "error": "Код подтверждения должен состоять из 6 цифр"}

    clean_name = sanitize_plain_text(name or "", 80)
    candidate_hash = hash_otp_code(phone, code)

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            otp_entry = _fallback_otp_store.get(phone)
            if not otp_entry or otp_entry.get("is_used") or time.time() > otp_entry.get("expires_at", 0):
                return {"ok": False, "error": "Код недействителен или истёк. Запросите новый код."}

            if otp_entry["attempts"] >= MAX_OTP_ATTEMPTS:
                otp_entry["is_used"] = True
                return {"ok": False, "error": "Превышено число попыток ввода кода. Запросите новый код."}

            if not secrets.compare_digest(candidate_hash, otp_entry["hash"]):
                otp_entry["attempts"] += 1
                return {"ok": False, "error": "Неверный код подтверждения"}

            otp_entry["is_used"] = True
            data = _read_json_store()
            existing = next((u for u in data["users"] if u.get("phone") == phone), None)
            if existing:
                if existing.get("is_blocked"):
                    return {"ok": False, "error": "Ваш аккаунт заблокирован"}
                if len(clean_name) >= 2:
                    existing["name"] = clean_name
                user_obj = existing
            else:
                if len(clean_name) < 2:
                    return {"ok": False, "error": "Укажите ваше имя для регистрации (минимум 2 буквы)"}
                new_uid = int(data.get("next_user_id", len(data["users"]) + 1))
                data["next_user_id"] = new_uid + 1
                user_obj = {
                    "id": new_uid,
                    "name": clean_name,
                    "phone": phone,
                    "role": "client",
                    "is_blocked": False,
                    "registered_at": datetime.now().strftime("%d.%m.%Y")
                }
                data["users"].append(user_obj)
            _write_json_store_atomic(data)
            return {"ok": True, "user": user_obj}

    async with pool.acquire() as conn:
        async with conn.transaction():
            otp_row = await conn.fetchrow("""
                SELECT id, code_hash, attempts FROM phone_otp_codes
                WHERE phone = $1 AND is_used = FALSE AND expires_at > NOW()
                ORDER BY created_at DESC LIMIT 1
                FOR UPDATE;
            """, phone)

            if not otp_row:
                return {"ok": False, "error": "Код недействителен или просрочен. Запросите новый код."}

            if otp_row["attempts"] >= MAX_OTP_ATTEMPTS:
                await conn.execute("UPDATE phone_otp_codes SET is_used = TRUE WHERE id = $1;", otp_row["id"])
                return {"ok": False, "error": "Превышено число попыток. Запросите новый код."}

            if not secrets.compare_digest(candidate_hash, otp_row["code_hash"] or ""):
                new_attempts = otp_row["attempts"] + 1
                mark_used = new_attempts >= MAX_OTP_ATTEMPTS
                await conn.execute(
                    "UPDATE phone_otp_codes SET attempts = $1, is_used = $2 WHERE id = $3;",
                    new_attempts, mark_used, otp_row["id"]
                )
                return {"ok": False, "error": "Неверный код подтверждения"}

            await conn.execute("UPDATE phone_otp_codes SET is_used = TRUE WHERE id = $1;", otp_row["id"])

            existing = await conn.fetchrow(
                "SELECT id, full_name, phone, role, is_blocked FROM users WHERE phone = $1;", phone
            )
            if existing:
                if existing["is_blocked"]:
                    return {"ok": False, "error": "Ваш аккаунт заблокирован"}
                final_name = clean_name if len(clean_name) >= 2 else existing["full_name"]
                user = await conn.fetchrow("""
                    UPDATE users SET full_name = $1, last_active_at = NOW()
                    WHERE id = $2
                    RETURNING id, full_name, phone, role, TO_CHAR(registered_at, 'DD.MM.YYYY') AS reg_date;
                """, final_name, existing["id"])
            else:
                if len(clean_name) < 2:
                    return {"ok": False, "error": "Укажите ваше имя (минимум 2 буквы)"}
                user = await conn.fetchrow("""
                    INSERT INTO users (phone, full_name, role, registered_at, last_active_at)
                    VALUES ($1, $2, 'client', NOW(), NOW())
                    RETURNING id, full_name, phone, role, TO_CHAR(registered_at, 'DD.MM.YYYY') AS reg_date;
                """, phone, clean_name)

            await conn.execute("""
                INSERT INTO user_activity_logs (user_id, activity_type, user_agent, metadata)
                VALUES ($1, 'OTP_LOGIN_SUCCESS', $2, $3::jsonb);
            """, user["id"], (ua or "")[:500], json.dumps({"ip": ip or "unknown"}))

            return {
                "ok": True,
                "user": {
                    "id": user["id"],
                    "name": user["full_name"],
                    "phone": user["phone"],
                    "role": user["role"],
                    "registered_at": user["reg_date"]
                }
            }


async def fetch_user_orders(authenticated_phone: str) -> list:
    """Возвращает заказы строго для номера телефона из проверенной серверной сессии."""
    phone = normalize_phone(authenticated_phone)
    if not phone:
        return []

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            return [o for o in data.get("orders", []) if normalize_phone(o.get("phone")) == phone]

    async with pool.acquire() as conn:
        orders = await conn.fetch("""
            SELECT o.id, o.status, o.total_amount, o.client_comment,
                   TO_CHAR(o.created_at, 'DD.MM.YYYY HH24:MI') AS created_at
            FROM orders o
            JOIN users u ON u.id = o.user_id
            WHERE u.phone = $1 AND u.is_blocked = FALSE
            ORDER BY o.created_at DESC
            LIMIT 20;
        """, phone)

        result = []
        for o in orders:
            items = await conn.fetch("""
                SELECT cake_title_snapshot AS cake,
                       filling_title_snapshot AS filling,
                       weight_kg,
                       TO_CHAR(ready_date, 'DD.MM.YYYY') AS ready_date,
                       item_total_price
                FROM order_items
                WHERE order_id = $1;
            """, o["id"])
            result.append({
                "id": o["id"],
                "status": o["status"],
                "total_amount": float(o["total_amount"]),
                "comment": o["client_comment"] or "",
                "created_at": o["created_at"],
                "items": [dict(it) for it in items]
            })
        return result


async def add_review(user_id: int, rating: int, text: str, cake_title: str, author_name: str = "Гость", actor_role: str = "client"):
    """Добавление отзыва: разрешено только авторизованному и незаблокированному пользователю."""
    clean_text = sanitize_plain_text(text, 1500)
    if len(clean_text) < 3:
        raise ValueError("Текст отзыва должен содержать минимум 3 символа")
    clean_cake = sanitize_plain_text(cake_title or "Авторский торт", 150)
    clean_author = sanitize_plain_text(author_name or "Гость", 100)
    safe_rating = max(1, min(5, int(rating)))

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            new_id = int(data.get("next_review_id", len(data.get("reviews", [])) + 1))
            data["next_review_id"] = new_id + 1
            data["reviews"].insert(0, {
                "id": f"rev_{new_id}",
                "db_id": new_id,
                "user_id": int(user_id),
                "name": clean_author,
                "rating": safe_rating,
                "cake": clean_cake,
                "date": datetime.now().strftime("%d.%m.%Y"),
                "text": clean_text,
                "is_published": True
            })
            _write_json_store_atomic(data)
            return

    async with pool.acquire() as conn:
        user_row = await conn.fetchrow("SELECT id, full_name, is_blocked FROM users WHERE id = $1;", int(user_id))
        if not user_row and actor_role not in ("admin", "manager"):
            raise PermissionError("Пользователь не найден. Авторизуйтесь перед отправкой отзыва.")
        if user_row and user_row["is_blocked"]:
            raise PermissionError("Ваш аккаунт заблокирован.")

        target_user_id = user_row["id"] if user_row else await conn.fetchval("SELECT id FROM users ORDER BY id ASC LIMIT 1;")
        cake_id = await conn.fetchval("SELECT id FROM cakes WHERE title = $1 LIMIT 1;", clean_cake)
        await conn.execute("""
            INSERT INTO reviews (user_id, cake_id, cake_title_fallback, rating, comment, is_published)
            VALUES ($1, $2, $3, $4, $5, TRUE);
        """, target_user_id, cake_id, clean_cake, safe_rating, clean_text)


async def add_cake(title: str, desc: str, price: int, img: str, emoji: str = "🎂",
                   category: str = "berry", unit: str = "/ кг", badge: str = "", meta: str = "",
                   actor_role: str = None, actor_id: int = None):
    assert_admin_access(actor_role)
    clean_title = sanitize_plain_text(title, 150)
    clean_desc = sanitize_plain_text(desc, 1000)
    clean_img = sanitize_image_url(img)
    clean_emoji = sanitize_plain_text(emoji or "🎂", 16)
    clean_cat = sanitize_plain_text(category or "berry", 50)
    clean_unit = sanitize_plain_text(unit or "/ кг", 20)
    clean_badge = sanitize_plain_text(badge or "", 50)
    clean_meta = sanitize_plain_text(meta or "", 150)
    safe_price = max(100, min(500000, int(price)))

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            new_id = int(data.get("next_cake_id", len(data["catalog"]) + 1))
            data["next_cake_id"] = new_id + 1
            new_item = {
                "id": f"cake_{new_id}",
                "db_id": new_id,
                "category": clean_cat,
                "badge": clean_badge,
                "emoji": clean_emoji,
                "meta": clean_meta,
                "title": clean_title,
                "text": clean_desc,
                "price": safe_price,
                "unit": clean_unit,
                "image": clean_img,
                "is_active": True
            }
            data["catalog"].append(new_item)
            _append_json_audit(data, "CREATE", "cake", new_id, actor_id, new_item)
            _write_json_store_atomic(data)
            return

    async with pool.acquire() as conn:
        async with conn.transaction():
            cat_id = await conn.fetchval("SELECT id FROM categories WHERE slug = $1;", clean_cat)
            if not cat_id:
                cat_id = await conn.fetchval("SELECT id FROM categories WHERE slug = 'berry';")
            min_w = 0.45 if clean_cat == "bento" else 1.50
            new_id = await conn.fetchval("""
                INSERT INTO cakes (category_id, title, description, base_price, image_url, emoji, price_unit, badge, meta_info, min_weight_kg, updated_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id;
            """, cat_id, clean_title, clean_desc, float(safe_price), clean_img, clean_emoji, clean_unit, clean_badge, clean_meta, min_w, actor_id)
            await conn.execute("""
                INSERT INTO admin_audit_logs (admin_id, action_type, entity_type, entity_id, new_values)
                VALUES ($1, 'CREATE', 'cake', $2, $3::jsonb);
            """, actor_id, new_id, json.dumps({"title": clean_title, "price": safe_price}))


async def update_cake(cake_id: int, title: str = None, desc: str = None, price: int = None,
                      img: str = None, category: str = None, unit: str = None, badge: str = None,
                      emoji: str = None, meta: str = None, actor_role: str = None, actor_id: int = None):
    assert_admin_access(actor_role)
    cake_id = int(cake_id)

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            for c in data["catalog"]:
                if int(c.get("db_id", 0)) == cake_id:
                    if title: c["title"] = sanitize_plain_text(title, 150)
                    if desc: c["text"] = sanitize_plain_text(desc, 1000)
                    if price is not None: c["price"] = max(100, min(500000, int(price)))
                    if img is not None: c["image"] = sanitize_image_url(img)
                    if category: c["category"] = sanitize_plain_text(category, 50)
                    if unit: c["unit"] = sanitize_plain_text(unit, 20)
                    if badge is not None: c["badge"] = sanitize_plain_text(badge, 50)
                    if emoji: c["emoji"] = sanitize_plain_text(emoji, 16)
                    if meta is not None: c["meta"] = sanitize_plain_text(meta, 150)
                    _append_json_audit(data, "UPDATE_CONTENT", "cake", cake_id, actor_id, c)
            _write_json_store_atomic(data)
            return

    async with pool.acquire() as conn:
        async with conn.transaction():
            current = await conn.fetchrow("SELECT * FROM cakes WHERE id = $1 FOR UPDATE;", cake_id)
            if not current:
                raise ValueError("Торт не найден")

            cat_id = current["category_id"]
            if category:
                found_cat = await conn.fetchval("SELECT id FROM categories WHERE slug = $1;", sanitize_plain_text(category, 50))
                if found_cat:
                    cat_id = found_cat

            new_title = sanitize_plain_text(title, 150) if title else current["title"]
            new_desc = sanitize_plain_text(desc, 1000) if desc else current["description"]
            new_price = float(max(100, min(500000, int(price)))) if price is not None else float(current["base_price"])
            new_img = sanitize_image_url(img) if img is not None else current["image_url"]
            new_unit = sanitize_plain_text(unit, 20) if unit else current["price_unit"]
            new_badge = sanitize_plain_text(badge, 50) if badge is not None else current["badge"]
            new_emoji = sanitize_plain_text(emoji, 16) if emoji else current["emoji"]
            new_meta = sanitize_plain_text(meta, 150) if meta is not None else current["meta_info"]

            await conn.execute("""
                UPDATE cakes
                SET category_id = $1, title = $2, description = $3, base_price = $4,
                    image_url = $5, price_unit = $6, badge = $7, emoji = $8, meta_info = $9,
                    updated_by = $10, updated_at = NOW()
                WHERE id = $11;
            """, cat_id, new_title, new_desc, new_price, new_img, new_unit, new_badge, new_emoji, new_meta, actor_id, cake_id)


async def delete_cake(cake_id: int, actor_role: str = None, actor_id: int = None):
    """Мягкое удаление (Soft Delete): запись сохраняется в БД, но скрывается с витрины."""
    assert_admin_access(actor_role)
    cake_id = int(cake_id)

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            for c in data["catalog"]:
                if int(c.get("db_id", 0)) == cake_id:
                    c["is_active"] = False
                    c["deleted_at"] = datetime.now().isoformat()
                    _append_json_audit(data, "SOFT_DELETE", "cake", cake_id, actor_id)
            _write_json_store_atomic(data)
            return

    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "UPDATE cakes SET is_active = FALSE, deleted_at = NOW(), updated_by = $2 WHERE id = $1;",
                cake_id, actor_id
            )


async def add_filling(title: str, desc: str, emoji: str = "🍓", layers: list = None, tag: str = "",
                      actor_role: str = None, actor_id: int = None):
    assert_admin_access(actor_role)
    clean_title = sanitize_plain_text(title, 150)
    clean_desc = sanitize_plain_text(desc, 1000)
    clean_emoji = sanitize_plain_text(emoji or "🍓", 16)
    clean_tag = sanitize_plain_text(tag or "", 50)
    clean_layers = [sanitize_plain_text(x, 100) for x in (layers or []) if str(x).strip()][:10]

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            new_id = int(data.get("next_filling_id", len(data["fillings"]) + 1))
            data["next_filling_id"] = new_id + 1
            new_fill = {
                "id": f"fill_{new_id}",
                "db_id": new_id,
                "label": clean_title,
                "emoji": clean_emoji,
                "tag": clean_tag,
                "desc": clean_desc,
                "layers": clean_layers,
                "is_active": True
            }
            data["fillings"].append(new_fill)
            _append_json_audit(data, "CREATE", "filling", new_id, actor_id, new_fill)
            _write_json_store_atomic(data)
            return

    async with pool.acquire() as conn:
        async with conn.transaction():
            new_id = await conn.fetchval("""
                INSERT INTO fillings (title, description, emoji, layers, tag, updated_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id;
            """, clean_title, clean_desc, clean_emoji, clean_layers, clean_tag, actor_id)
            await conn.execute("""
                INSERT INTO admin_audit_logs (admin_id, action_type, entity_type, entity_id, new_values)
                VALUES ($1, 'CREATE', 'filling', $2, $3::jsonb);
            """, actor_id, new_id, json.dumps({"title": clean_title}))


async def delete_filling(fill_id: int, actor_role: str = None, actor_id: int = None):
    """Мягкое удаление начинки (Soft Delete)."""
    assert_admin_access(actor_role)
    fill_id = int(fill_id)

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            for f in data["fillings"]:
                if int(f.get("db_id", 0)) == fill_id:
                    f["is_active"] = False
                    f["deleted_at"] = datetime.now().isoformat()
                    _append_json_audit(data, "SOFT_DELETE", "filling", fill_id, actor_id)
            _write_json_store_atomic(data)
            return

    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                "UPDATE fillings SET is_active = FALSE, deleted_at = NOW(), updated_by = $2 WHERE id = $1;",
                fill_id, actor_id
            )


async def delete_review(rev_id: int, actor_role: str = None, actor_id: int = None):
    """Мягкое скрытие отзыва с витрины (Soft Delete)."""
    assert_admin_access(actor_role)
    rev_id = int(rev_id)

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            for r in data["reviews"]:
                if int(r.get("db_id", 0)) == rev_id:
                    r["is_published"] = False
                    r["deleted_at"] = datetime.now().isoformat()
                    _append_json_audit(data, "SOFT_DELETE", "review", rev_id, actor_id)
            _write_json_store_atomic(data)
            return

    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("UPDATE reviews SET is_published = FALSE WHERE id = $1;", rev_id)
            await conn.execute("""
                INSERT INTO admin_audit_logs (admin_id, action_type, entity_type, entity_id)
                VALUES ($1, 'SOFT_DELETE', 'review', $2);
            """, actor_id, rev_id)


async def create_order(name: str, raw_phone: str, comment: str, items: list) -> dict:
    phone = normalize_phone(raw_phone)
    if not phone:
        raise ValueError("Некорректный номер телефона (ожидается +7XXXXXXXXXX или 8XXXXXXXXXX)")

    clean_name = sanitize_plain_text(name or "Гость", 80)
    if len(clean_name) < 2:
        raise ValueError("Пожалуйста, укажите корректное имя (минимум 2 символа)")
    clean_comment = sanitize_plain_text(comment or "", 1000)

    if not items or not isinstance(items, list) or len(items) > 25:
        raise ValueError("Некорректный список позиций заказа")

    if USE_FALLBACK_JSON or pool is None:
        async with _json_lock:
            data = _read_json_store()
            existing_user = next((u for u in data["users"] if u.get("phone") == phone), None)
            if existing_user and existing_user.get("is_blocked"):
                raise ValueError("Ваш аккаунт заблокирован")

            if not existing_user:
                new_uid = int(data.get("next_user_id", len(data["users"]) + 1))
                data["next_user_id"] = new_uid + 1
                existing_user = {
                    "id": new_uid,
                    "name": clean_name,
                    "phone": phone,
                    "role": "client",
                    "is_blocked": False,
                    "registered_at": datetime.now().strftime("%d.%m.%Y")
                }
                data["users"].append(existing_user)

            order_id = int(data.get("next_order_id", len(data["orders"]) + 1))
            data["next_order_id"] = order_id + 1
            total = 0.0
            norm_items = []
            catalog_by_title = {c["title"]: c for c in data.get("catalog", []) if c.get("is_active", True)}

            for it in items:
                c_title = sanitize_plain_text(it.get("cake", "Фисташковый рассвет"), 150)
                f_title = sanitize_plain_text(it.get("filling", "Клубника — Фисташка"), 150)
                w_kg = parse_weight_kg(it.get("weight", "2.0 кг"))
                cake_obj = catalog_by_title.get(c_title)
                unit_price = float(cake_obj["price"]) if cake_obj else 2300.0
                unit_str = (cake_obj.get("unit") or "/ кг") if cake_obj else "/ кг"
                is_bento_cat = (cake_obj and cake_obj.get("category") == "bento")

                base_w = float(cake_obj.get("weight_kg") or 2.5) if cake_obj else 2.5
                if "/ шт" in unit_str:
                    item_total = round(unit_price * 12, 2)
                elif is_bento_cat or "/ набор" in unit_str:
                    item_total = round(unit_price, 2)
                elif unit_str.strip() == "/ кг":
                    eff_weight = max(1.5, w_kg)
                    item_total = round(unit_price * eff_weight, 2)
                    w_kg = eff_weight
                else:
                    eff_weight = max(1.5, w_kg)
                    ratio = eff_weight / base_w if base_w > 0 else 1.0
                    item_total = round(unit_price * ratio, 2)
                    w_kg = eff_weight

                total += item_total
                norm_items.append({
                    "cake": c_title,
                    "filling": f_title,
                    "weight_kg": w_kg,
                    "ready_date": sanitize_plain_text(it.get("ready_date", "Завтра"), 30),
                    "item_total_price": item_total
                })

            order_obj = {
                "id": order_id,
                "user_id": existing_user["id"],
                "name": clean_name,
                "phone": phone,
                "comment": clean_comment,
                "total_amount": total,
                "created_at": datetime.now().strftime("%d.%m.%Y %H:%M"),
                "items": norm_items
            }
            data["orders"].insert(0, order_obj)
            _write_json_store_atomic(data)
            return {"id": order_id, "total_amount": total, "phone": phone, "user_id": existing_user["id"]}

    async with pool.acquire() as conn:
        async with conn.transaction():
            existing_user = await conn.fetchrow("SELECT id, is_blocked FROM users WHERE phone = $1;", phone)
            if existing_user and existing_user["is_blocked"]:
                raise ValueError("Ваш аккаунт заблокирован")

            if existing_user:
                user_id = existing_user["id"]
                # Не перезаписываем full_name существующего пользователя без авторизации!
                await conn.execute("UPDATE users SET last_active_at = NOW() WHERE id = $1;", user_id)
            else:
                user_id = await conn.fetchval("""
                    INSERT INTO users (phone, full_name, role, last_active_at)
                    VALUES ($1, $2, 'client', NOW())
                    RETURNING id;
                """, phone, clean_name)

            order_id = await conn.fetchval("""
                INSERT INTO orders (user_id, status, client_comment, total_amount)
                VALUES ($1, 'new', $2, 0)
                RETURNING id;
            """, user_id, clean_comment)

            total = 0.0
            for it in items:
                cake_title = sanitize_plain_text(it.get("cake") or "Фисташковый рассвет", 150)
                filling_title = sanitize_plain_text(it.get("filling") or "Клубника — Фисташка", 150)
                weight_kg = parse_weight_kg(it.get("weight", "2.0 кг"))
                ready_dt = parse_ready_date(it.get("ready_date", ""))

                cake = await conn.fetchrow(
                    "SELECT id, base_price, price_unit, min_weight_kg FROM cakes WHERE title = $1 AND is_active = TRUE LIMIT 1;",
                    cake_title
                )
                filling = await conn.fetchrow(
                    "SELECT id, extra_price_per_kg FROM fillings WHERE title = $1 AND is_active = TRUE LIMIT 1;",
                    filling_title
                )

                c_id = cake["id"] if cake else None
                fill_id = filling["id"] if filling else None
                unit_price = float(cake["base_price"]) if cake else 2300.0
                fill_extra = float(filling["extra_price_per_kg"]) if filling else 0.0
                p_unit = (cake["price_unit"] or "/ кг") if cake else "/ кг"
                min_w = float(cake["min_weight_kg"]) if cake else 1.50

                if "кг" in p_unit:
                    eff_weight = max(min_w, weight_kg)
                    item_total = round((unit_price + fill_extra) * eff_weight, 2)
                    weight_kg = eff_weight
                else:
                    item_total = round(unit_price + fill_extra, 2)

                total += item_total

                await conn.execute("""
                    INSERT INTO order_items (
                        order_id, cake_id, filling_id,
                        cake_title_snapshot, filling_title_snapshot,
                        weight_kg, quantity, ready_date,
                        unit_price_at_purchase, filling_price_at_purchase,
                        options_price_at_purchase, item_total_price
                    ) VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8, $9, 0, $10);
                """, order_id, c_id, fill_id, cake_title, filling_title,
                     weight_kg, ready_dt, unit_price, fill_extra, item_total)

            await conn.execute("UPDATE orders SET total_amount = $1 WHERE id = $2;", total, order_id)
            return {"id": order_id, "total_amount": total, "phone": phone, "user_id": user_id}
