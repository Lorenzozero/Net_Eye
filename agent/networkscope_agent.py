#!/usr/bin/env python3
"""
NetworkScope — agente di scansione rete (solo libreria standard, nessuna dipendenza).

Scansiona la rete locale (ping-sweep + ARP + reverse DNS + porte comuni) e riporta
periodicamente al server NetworkScope. Funziona su Windows / Linux / macOS.

Uso:
    python  networkscope_agent.py  http://IP-DEL-SERVER:8000
    python3 networkscope_agent.py  http://IP-DEL-SERVER:8000
"""
import sys, os, json, socket, subprocess, platform, time, re, uuid, urllib.request
from concurrent.futures import ThreadPoolExecutor

SERVER = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get("NS_SERVER", "http://localhost:8000")).rstrip("/")
IS_WIN = platform.system() == "Windows"
PORTS = [22, 23, 53, 80, 139, 443, 445, 3389, 8080, 62078]  # fingerprint leggero
FULL_INTERVAL = 180  # secondi tra le scansioni complete (educato)


def agent_id():
    path = os.path.join(os.path.expanduser("~"), ".networkscope-agent-id")
    try:
        v = open(path).read().strip()
        if v:
            return v
    except Exception:
        pass
    v = "agt-%s-%s" % (socket.gethostname(), uuid.uuid4().hex[:6])
    try:
        open(path, "w").write(v)
    except Exception:
        pass
    return v


AGENT_ID = agent_id()


def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


IP = local_ip()
BASE = ".".join(IP.split(".")[:3])


def ping(ip):
    cmd = ["ping", "-n", "1", "-w", "600", ip] if IS_WIN else ["ping", "-c", "1", "-W", "1", ip]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=3).stdout
    except Exception:
        return None
    if not re.search(r"ttl[=:]", out, re.I):
        return None
    m = re.search(r"ttl[=:]\s*(\d+)", out, re.I)
    return int(m.group(1)) if m else 0


def arp_table():
    try:
        out = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=5).stdout
    except Exception:
        return {}
    d = {}
    for m in re.finditer(r"(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F]{2}(?:[-:][0-9a-fA-F]{2}){5})", out):
        mac = m.group(2).replace("-", ":").upper()
        if not mac.startswith(("FF:FF:FF", "01:00:5E", "33:33")):
            d[m.group(1)] = mac
    return d


def hostname(ip):
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return None


def scan_ports(ip):
    found = []
    for p in PORTS:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.4)
        try:
            if s.connect_ex((ip, p)) == 0:
                found.append(p)
        except Exception:
            pass
        finally:
            s.close()
    return found


def ttl_os(ttl):
    if not ttl:
        return None
    if ttl <= 64:
        return "Linux/Unix"
    if ttl <= 128:
        return "Windows"
    return "Embedded/Network"


def classify(ip, ports):
    if ip.endswith(".1") or ip.endswith(".254"):
        return "gateway"
    if 62078 in ports:
        return "mobile"
    if 445 in ports or 3389 in ports:
        return "desktop"
    if 22 in ports:
        return "server"
    if 80 in ports or 443 in ports:
        return "iot_device"
    return "desktop"


def descriptor():
    return {
        "agent_id": AGENT_ID, "agent_ip": IP, "agent_hostname": socket.gethostname(),
        "agent_os": platform.system(), "agent_version": "py-1.0", "subnet": BASE + ".0/24",
    }


SERVICES = {20: "FTP", 21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP",
            110: "POP3", 123: "NTP", 135: "RPC", 139: "NetBIOS", 143: "IMAP", 389: "LDAP",
            443: "HTTPS", 445: "SMB", 465: "SMTPS", 587: "SMTP", 993: "IMAPS", 995: "POP3S",
            1883: "MQTT", 3306: "MySQL", 3389: "RDP", 5060: "SIP", 5432: "PostgreSQL",
            5900: "VNC", 6379: "Redis", 8080: "HTTP", 8443: "HTTPS", 27017: "MongoDB"}
_ptr_cache = {}


def is_local_addr(ip):
    return (not ip) or ip.startswith("127.") or ip in ("0.0.0.0", "*") or ip.startswith("169.254") or ip.startswith("224.")


def connections():
    """Connessioni TCP attive reali (netstat), aggregate per destinazione+servizio."""
    cmd = ["netstat", "-ano"] if IS_WIN else ["netstat", "-tn"]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=6).stdout
    except Exception:
        return []
    agg = {}
    for line in out.splitlines():
        if "ESTABLISHED" not in line:
            continue
        m = re.search(r"(\d+\.\d+\.\d+\.\d+):(\d+)\s+(\d+\.\d+\.\d+\.\d+):(\d+)", line)
        if not m:
            continue
        lip, lport, rip, rport = m.group(1), int(m.group(2)), m.group(3), int(m.group(4))
        if is_local_addr(rip) or rip == lip:
            continue
        service = SERVICES.get(rport) or SERVICES.get(lport) or ("porta %d" % rport)
        key = rip + "|" + service
        e = agg.get(key)
        if not e:
            e = {"remoteIp": rip, "remotePort": rport, "remoteHost": None, "service": service,
                 "proto": "TCP", "count": 0, "scope": "LAN" if rip.startswith(BASE + ".") else "Internet",
                 "localIps": [], "fromHost": socket.gethostname()}
            agg[key] = e
        e["count"] += 1
        if lip not in e["localIps"]:
            e["localIps"].append(lip)
    conns = list(agg.values())
    for e in conns:
        if e["remoteIp"] not in _ptr_cache:
            try:
                _ptr_cache[e["remoteIp"]] = socket.gethostbyaddr(e["remoteIp"])[0]
            except Exception:
                _ptr_cache[e["remoteIp"]] = None
        e["remoteHost"] = _ptr_cache[e["remoteIp"]]
    conns.sort(key=lambda x: -x["count"])
    return conns[:60]


def post(path, obj):
    try:
        req = urllib.request.Request(
            SERVER + path, data=json.dumps(obj).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
        urllib.request.urlopen(req, timeout=8).read()
        return True
    except Exception:
        return False


def scan():
    arp = arp_table()
    ips = ["%s.%d" % (BASE, i) for i in range(1, 255)]
    live = {}
    with ThreadPoolExecutor(max_workers=64) as ex:
        for ip, ttl in zip(ips, ex.map(ping, ips)):
            if ttl is not None:
                live[ip] = ttl
    for ip in arp:
        if ip.startswith(BASE + ".") and ip not in live:
            live[ip] = None
    live.setdefault(IP, 0)

    order = sorted(live, key=lambda x: tuple(int(o) for o in x.split(".")))
    now = time.strftime("%Y-%m-%dT%H:%M:%S")
    devices = []
    with ThreadPoolExecutor(max_workers=32) as ex:
        ports_list = list(ex.map(scan_ports, order))
        hosts_list = list(ex.map(hostname, order))
    for i, ip in enumerate(order):
        ports = ports_list[i]
        devices.append({
            "id": i + 1, "ip_address": ip, "mac_address": arp.get(ip),
            "hostname": hosts_list[i] or (socket.gethostname() if ip == IP else None),
            "vendor": "Unknown", "is_active": True, "last_seen": now,
            "open_ports": ports, "ttl": live[ip], "latency": None,
            "os": ttl_os(live[ip]), "device_type": classify(ip, ports),
        })
    return devices


def main():
    print("NetworkScope agent %s -> %s  (rete %s.0/24)" % (AGENT_ID, SERVER, BASE))
    post("/api/v1/agents/register", descriptor())
    while True:
        try:
            devices = scan()
            conns = connections()
            ok = post("/api/v1/agents/%s/report" % AGENT_ID, {"info": descriptor(), "devices": devices, "connections": conns})
            print(time.strftime("%H:%M:%S"), "report:", len(devices), "dispositivi,", len(conns), "connessioni", "OK" if ok else "FALLITO")
        except Exception as e:
            print("errore:", e)
        time.sleep(FULL_INTERVAL)


if __name__ == "__main__":
    main()
