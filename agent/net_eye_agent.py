import os
import socket
import time
import uuid
import json
import threading
import requests
from dataclasses import dataclass, asdict
from typing import List, Optional

BACKEND_URL = "http://localhost:3001"  # Sovrascrivibile da config
AGENT_SECRET = "change_this_secret_in_production"
SCAN_INTERVAL_SECONDS = 60
TARGET_SUBNET = "192.168.1.0/24"  # Solo indicativo, per ora scansioniamo pochi host
COMMON_PORTS = [22, 80, 443, 3389]


@dataclass
class PortScanResult:
    port_number: int
    protocol: str = "tcp"
    state: str = "closed"
    service_name: Optional[str] = None
    service_version: Optional[str] = None


@dataclass
class DeviceScanResult:
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    manufacturer: Optional[str] = None
    device_type: Optional[str] = None
    os_detection: Optional[str] = None
    ports: Optional[List[PortScanResult]] = None


class NetEyeAgent:
    def __init__(self, backend_url: str, agent_secret: str) -> None:
        self.backend_url = backend_url.rstrip("/")
        self.agent_secret = agent_secret
        self.agent_id: Optional[str] = None
        self.session = requests.Session()
        self.session.headers.update({"x-agent-secret": self.agent_secret})

    def get_hostname(self) -> str:
        return socket.gethostname()

    def get_primary_ip(self) -> str:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        except Exception:
            ip = "127.0.0.1"
        finally:
            s.close()
        return ip

    def register(self) -> None:
        hostname = self.get_hostname()
        ip_address = self.get_primary_ip()
        os_type = os.name

        payload = {
            "hostname": hostname,
            "ip_address": ip_address,
            "os_type": os_type,
        }

        print(f"[*] Registering agent {hostname} ({ip_address})...")
        resp = self.session.post(f"{self.backend_url}/api/agent/register", json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        self.agent_id = data.get("agent_id")
        print(f"[+] Agent registered with id: {self.agent_id}")

    def heartbeat_loop(self) -> None:
        while True:
            try:
                if self.agent_id:
                    self.session.post(
                        f"{self.backend_url}/api/agent/heartbeat",
                        json={"agent_id": self.agent_id},
                        timeout=5,
                    )
            except Exception as e:
                print(f"[!] Heartbeat error: {e}")
            time.sleep(30)

    def tcp_port_is_open(self, ip: str, port: int, timeout: float = 0.5) -> bool:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        try:
            s.connect((ip, port))
            return True
        except Exception:
            return False
        finally:
            s.close()

    def scan_host(self, ip: str) -> Optional[DeviceScanResult]:
        # Tentativo di risoluzione hostname
        try:
            hostname = socket.gethostbyaddr(ip)[0]
        except Exception:
            hostname = None

        # Per ora assumiamo host up se almeno una porta comune è open
        open_ports: List[PortScanResult] = []
        for port in COMMON_PORTS:
            if self.tcp_port_is_open(ip, port):
                open_ports.append(PortScanResult(port_number=port, state="open"))

        if not open_ports:
            return None

        return DeviceScanResult(
            ip_address=ip,
            hostname=hostname,
            ports=open_ports,
        )

    def scan_network(self) -> List[DeviceScanResult]:
        # Implementazione minimale: scansiona pochi host vicini al proprio IP
        base_ip = self.get_primary_ip()
        octets = base_ip.split(".")
        if len(octets) != 4:
            return []

        prefix = ".".join(octets[:3])
        hosts_to_scan = [f"{prefix}.{i}" for i in range(1, 255)]

        print(f"[*] Starting network scan on {prefix}.0/24 (simplified)...")
        results: List[DeviceScanResult] = []

        for ip in hosts_to_scan:
            try:
                res = self.scan_host(ip)
                if res:
                    print(f"[+] Host up: {ip} with {len(res.ports or [])} open ports")
                    results.append(res)
            except KeyboardInterrupt:
                raise
            except Exception as e:
                print(f"[!] Error scanning {ip}: {e}")

        return results

    def submit_scan(self, devices: List[DeviceScanResult]) -> None:
        if not self.agent_id:
            raise RuntimeError("Agent not registered")

        payload = {
            "agent_id": self.agent_id,
            "devices": [self._device_to_dict(d) for d in devices],
        }

        resp = self.session.post(f"{self.backend_url}/api/agent/scan", json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        print(f"[+] Scan submitted, devices_processed={data.get('devices_processed')}")

    def _device_to_dict(self, device: DeviceScanResult) -> dict:
        d = asdict(device)
        if d.get("ports") is None:
            d["ports"] = []
        return d

    def scan_loop(self) -> None:
        while True:
            try:
                devices = self.scan_network()
                if devices:
                    self.submit_scan(devices)
                else:
                    print("[*] No hosts discovered in this round")
            except Exception as e:
                print(f"[!] Scan loop error: {e}")

            time.sleep(SCAN_INTERVAL_SECONDS)


def main() -> None:
    print("Net_Eye Agent starting...")
    agent = NetEyeAgent(BACKEND_URL, AGENT_SECRET)
    agent.register()

    # Thread heartbeat
    hb_thread = threading.Thread(target=agent.heartbeat_loop, daemon=True)
    hb_thread.start()

    # Main thread = scan loop
    agent.scan_loop()


if __name__ == "__main__":
    main()
