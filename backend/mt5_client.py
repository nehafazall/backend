"""
MT5 Web API Client for CLT Synapse ERP.
Handles authentication, deal fetching, and withdrawal extraction from MetaTrader 5.
"""
import hashlib
import os
import logging
import pycurl
import json
from io import BytesIO
from datetime import datetime, timezone

logger = logging.getLogger("mt5_client")

MT5_SERVER = os.environ.get("MT5_SERVER", "")
MT5_LOGIN = os.environ.get("MT5_LOGIN", "")
MT5_PASSWORD = os.environ.get("MT5_PASSWORD", "")
MT5_VERSION = 2980


class MT5Client:
    """MetaTrader 5 Web API client using pycurl for persistent connections."""

    def __init__(self, server=None, login=None, password=None):
        self.server = server or MT5_SERVER
        self.login = login or MT5_LOGIN
        self.password = password or MT5_PASSWORD
        self.curl = None
        self.authenticated = False

    def _init_curl(self):
        if self.curl:
            try:
                self.curl.close()
            except Exception:
                pass
        self.curl = pycurl.Curl()
        self.curl.setopt(pycurl.SSL_VERIFYPEER, 0)
        self.curl.setopt(pycurl.SSL_VERIFYHOST, 0)
        self.curl.setopt(pycurl.MAXCONNECTS, 1)
        self.curl.setopt(pycurl.HTTPHEADER, ['Connection: Keep-Alive'])
        self.curl.setopt(pycurl.TIMEOUT, 30)

    def _get(self, path):
        buf = BytesIO()
        url = f"https://{self.server}{path}"
        self.curl.setopt(pycurl.URL, url)
        self.curl.setopt(pycurl.POST, 0)
        self.curl.setopt(pycurl.WRITEDATA, buf)
        self.curl.perform()
        code = self.curl.getinfo(pycurl.HTTP_CODE)
        body = buf.getvalue().decode('utf-8', errors='replace')
        return code, body

    def _post(self, path, data):
        buf = BytesIO()
        url = f"https://{self.server}{path}"
        self.curl.setopt(pycurl.URL, url)
        self.curl.setopt(pycurl.POST, 1)
        self.curl.setopt(pycurl.POSTFIELDS, json.dumps(data))
        self.curl.setopt(pycurl.WRITEDATA, buf)
        self.curl.perform()
        code = self.curl.getinfo(pycurl.HTTP_CODE)
        body = buf.getvalue().decode('utf-8', errors='replace')
        return code, body

    def _hash_password(self, srv_rand_hex):
        srv_rand_bytes = bytes.fromhex(srv_rand_hex)
        password_utf16 = self.password.encode('utf-16-le')
        step1 = hashlib.md5(password_utf16).digest()
        password_hash = step1 + b'WebAPI'
        step2 = hashlib.md5(password_hash).digest()
        return hashlib.md5(step2 + srv_rand_bytes).hexdigest()

    def connect(self):
        """Authenticate with the MT5 server. Returns (success, message)."""
        if not self.server or not self.login or not self.password:
            return False, "MT5 credentials not configured"

        try:
            self._init_curl()

            # Step 1: Auth Start
            code1, body1 = self._get(
                f"/api/auth/start?version={MT5_VERSION}&agent=WebAPI&login={self.login}&type=manager"
            )
            if code1 != 200:
                return False, f"Auth start failed (HTTP {code1})"

            data = json.loads(body1)
            retcode = data.get("retcode", "")
            if not retcode.startswith("0"):
                return False, f"Auth start error: {retcode}"

            srv_rand = data["srv_rand"]
            srv_rand_answer = self._hash_password(srv_rand)
            cli_rand = os.urandom(16).hex()

            # Step 2: Auth Answer
            code2, body2 = self._get(
                f"/api/auth/answer?srv_rand_answer={srv_rand_answer}&cli_rand={cli_rand}"
            )
            if code2 != 200:
                return False, f"Auth answer failed (HTTP {code2}). Web API access may not be enabled for this manager."

            result = json.loads(body2)
            if not result.get("retcode", "").startswith("0"):
                return False, f"Auth answer error: {result.get('retcode')}"

            self.authenticated = True
            return True, "Connected successfully"

        except Exception as e:
            logger.error(f"MT5 connect error: {e}")
            return False, str(e)

    def get_deals(self, login, from_ts, to_ts):
        """Get deals for a specific MT5 account within a time range.
        from_ts, to_ts: Unix timestamps.
        Returns list of deal dicts.
        """
        if not self.authenticated:
            ok, msg = self.connect()
            if not ok:
                return [], msg

        try:
            # Get total count
            code, body = self._get(
                f"/api/deal/get_total?login={login}&from={from_ts}&to={to_ts}"
            )
            if code != 200:
                return [], f"Deal total failed (HTTP {code})"

            data = json.loads(body)
            total = int(data.get("total", 0))
            if total == 0:
                return [], "No deals found"

            # Get deals page by page
            deals = []
            page_size = 256
            for offset in range(0, total, page_size):
                code, body = self._get(
                    f"/api/deal/get_page?login={login}&from={from_ts}&to={to_ts}&offset={offset}&total={min(page_size, total - offset)}"
                )
                if code == 200:
                    page_data = json.loads(body)
                    for d in page_data.get("answer", []):
                        deals.append(d)

            return deals, f"Found {len(deals)} deals"

        except Exception as e:
            logger.error(f"MT5 get_deals error: {e}")
            return [], str(e)

    def get_user(self, login):
        """Get MT5 user info."""
        if not self.authenticated:
            ok, msg = self.connect()
            if not ok:
                return None, msg

        try:
            code, body = self._get(f"/api/user/get?login={login}")
            if code != 200:
                return None, f"User get failed (HTTP {code})"
            return json.loads(body), "OK"
        except Exception as e:
            return None, str(e)

    def check_connection(self):
        """Test if we can connect and authenticate."""
        try:
            self._init_curl()
            code, body = self._get(
                f"/api/auth/start?version={MT5_VERSION}&agent=WebAPI&login={self.login}&type=manager"
            )
            if code == 200:
                data = json.loads(body)
                return {
                    "server_reachable": True,
                    "auth_start_ok": data.get("retcode", "").startswith("0"),
                    "version_access": data.get("version_access"),
                    "message": "Server reachable. Full auth requires Web API access."
                }
            return {
                "server_reachable": False,
                "auth_start_ok": False,
                "message": f"Server returned HTTP {code}"
            }
        except Exception as e:
            return {
                "server_reachable": False,
                "auth_start_ok": False,
                "message": str(e)
            }
        finally:
            if self.curl:
                try:
                    self.curl.close()
                except Exception:
                    pass
                self.curl = None

    def close(self):
        if self.curl:
            try:
                self.curl.close()
            except Exception:
                pass
            self.curl = None
        self.authenticated = False


def extract_withdrawals(deals):
    """Filter deals to only withdrawal transactions.
    MT5 deal actions: 0=Buy, 1=Sell, 2=Balance, 3=Credit, etc.
    Withdrawals are balance operations (action=2) with negative profit.
    """
    withdrawals = []
    for deal in deals:
        action = int(deal.get("Action", deal.get("action", -1)))
        profit = float(deal.get("Profit", deal.get("profit", 0)))
        # Balance operation with negative amount = withdrawal
        if action == 2 and profit < 0:
            withdrawals.append({
                "ticket": str(deal.get("Deal", deal.get("deal", ""))),
                "login": str(deal.get("Login", deal.get("login", ""))),
                "amount_usd": abs(profit),
                "timestamp": int(deal.get("Time", deal.get("time", 0))),
                "comment": deal.get("Comment", deal.get("comment", "")),
            })
    return withdrawals
